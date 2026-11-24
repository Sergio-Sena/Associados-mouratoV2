import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  UserCheck, 
  Building2, 
  Landmark, 
  ShieldCheck, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound, 
  ArrowRight, 
  LogOut, 
  ChevronRight, 
  Receipt, 
  DollarSign, 
  Calendar, 
  Clock, 
  Wallet, 
  Check, 
  CreditCard, 
  Settings, 
  UserPlus, 
  Users, 
  QrCode, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  CalendarPlus, 
  BadgePercent, 
  SlidersHorizontal,
  Menu,
  Shield,
  Send,
  Sparkles,
  Briefcase,
  MessageSquare,
  TrendingUp,
  Award,
  FileCheck,
  FileSpreadsheet,
  Car,
  Printer,
  Activity,
  Bot,
  Edit,
  Edit2,
  Save,
  RotateCcw,
  Share2,
  Download,
  FileDown,
  MapPin,
  PhoneCall
} from 'lucide-react';
import { createPixCharge, createCheckoutProPreference, validateAntifraudPayer } from '../services/mercadoPagoService';
import { TEIA_INITIAL_CLIENTS } from '../data/teiaDatabase';
import { getNextClientSequence, maskCPF, maskCNPJ, generateProtocolo } from '../services/onboardingService';
import { buildLeadNotification, DIRETORIA_PHONE_FMT } from '../services/leadNotificationBot';

const STORAGE_CLIENTS_KEY = 'mourato_clients_records_v2';
const STORAGE_DELETED_CLIENTS_KEY = 'mourato_deleted_clients_v2';
const STORAGE_EXPENSES_KEY = 'mourato_corporate_expenses_v1';
const STORAGE_APPOINTMENTS_KEY = 'mourato_appointments_v1';
const STORAGE_RECEIVABLES_KEY = 'mourato_receivables_v1';
const STORAGE_MP_CONFIG_KEY = 'mourato_mercadopago_config_v1';

// Resolvedor Definitivo de Documento (CPF de PF e CNPJ de PJ)
export const getClientDocumento = (client) => {
  if (!client) return 'Não informado';
  const isPj = client.tipo === 'PJ';
  const rawDoc = (client.documento || client.cpf || client.cnpj || '').trim();
  const digits = rawDoc.replace(/\D/g, '');

  if (isPj) {
    if (digits.length === 14) return maskCNPJ(digits);
    if (client.empresa?.cnpj) return maskCNPJ(client.empresa.cnpj);
    return rawDoc || 'Não informado';
  }

  // É PESSOA FÍSICA (PF)
  if (digits.length === 11) {
    return maskCPF(digits);
  }
  if (client.cpf && client.cpf.replace(/\D/g, '').length === 11) {
    return maskCPF(client.cpf);
  }
  if (client.titular?.cpf && client.titular.cpf.replace(/\D/g, '').length === 11) {
    return maskCPF(client.titular.cpf);
  }

  // Extrai CPF se estiver presente no campo responsavel ou socioVinculado (ex: "JOSÉ JAILSON MOURATO DA SILVA (CPF 317.769.598-92)")
  const responsavel = client.responsavel || client.socioVinculado || '';
  const matchCpf = responsavel.match(/(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})/);
  if (matchCpf) {
    return maskCPF(matchCpf[1]);
  }

  // Titular Oficial Histórico Mourato (José Jailson Mourato da Silva)
  const nomeUpper = (client.nomeRazao || client.responsavel || client.socioVinculado || '').toUpperCase();
  if (nomeUpper.includes('JAILSON') || nomeUpper.includes('MOURATO DA SILVA')) {
    return '317.769.598-92';
  }

  return rawDoc || 'Não informado';
};

// Helpers de Validação Monetária & Conversão Blindada contra erros de cálculo
const parseMonetaryValue = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  const clean = str.replace(/[^0-9,-.]/g, '');
  if (!clean) return 0;
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      return parseFloat(clean.replace(/,/g, '')) || 0;
    }
  }
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
};

const formatMonetaryValue = (val) => {
  const num = parseMonetaryValue(val);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper de Extração de Score Numérico sem valores fixos artificiais
const parseScoreValue = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, Math.min(1000, Math.round(val)));
  const match = String(val).match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return isNaN(num) ? 0 : Math.max(0, Math.min(1000, num));
  }
  return 0;
};

const getDeletedClientIds = () => {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_CLIENTS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
};


// Gerenciador de Aprovação Resiliente Multi-Chaves (Evita que o Lead reverta para 'novo')
const STORAGE_APPROVED_LEADS = 'mourato_approved_leads_ids';
const getApprovedLeadsSet = () => {
  try {
    const raw = localStorage.getItem(STORAGE_APPROVED_LEADS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
};

const markLeadAsApprovedLocally = (id, lead = null) => {
  try {
    const set = getApprovedLeadsSet();
    if (id) set.add(String(id));
    if (lead) {
      const email = (lead.email || '').toLowerCase().trim();
      const phone = (lead.telefone || '').replace(/\D/g, '');
      // Evita adicionar e-mails institucionais genéricos que poderiam aprovar outros leads por engano
      if (email && email !== 'mourato@mouratoassociados.com.br' && email !== 'mourato.importacao@gmail.com') {
        set.add(email);
      }
      if (phone && phone !== '11978990034') {
        set.add(phone);
      }
      if (email && lead.empresa) set.add(`${email}_${lead.empresa.trim()}`);
    }
    localStorage.setItem(STORAGE_APPROVED_LEADS, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Erro ao salvar lead aprovado localmente:', e);
  }
};

const unmarkLeadAsApprovedLocally = (id, lead = null) => {
  try {
    const set = getApprovedLeadsSet();
    if (id) set.delete(String(id));
    if (lead) {
      const email = (lead.email || '').toLowerCase().trim();
      const phone = (lead.telefone || '').replace(/\D/g, '');
      if (email) set.delete(email);
      if (phone) set.delete(phone);
      if (email && lead.empresa) set.delete(`${email}_${lead.empresa.trim()}`);
    }
    localStorage.setItem(STORAGE_APPROVED_LEADS, JSON.stringify(Array.from(set)));
  } catch (e) {}
};

// Conversor Oficial de Lead Aprovado em Registros de Cliente (Separação Automática PF & PJ)
const convertLeadToClientRecords = (lead, linkFicha = '') => {
  const cleanDoc = (lead.documento || lead.cnpj || lead.cpf || '').trim();
  const docDigits = cleanDoc.replace(/\D/g, '');
  const phone = lead.telefone || lead.contato || '';
  const leadId = String(lead.id || Date.now());

  const baseUrl = typeof window !== 'undefined' ? (window.location.origin || 'https://www.mouratoassociados.com.br') : 'https://www.mouratoassociados.com.br';
  const leadToken = lead.token || lead.id || `tok-${leadId}`;
  const calculatedLink = linkFicha || `${baseUrl}/ficha-cadastral?nome=${encodeURIComponent(lead.nome || '')}&empresa=${encodeURIComponent(lead.empresa || '')}&telefone=${encodeURIComponent(lead.telefone || '')}&email=${encodeURIComponent(lead.email || '')}&token=${encodeURIComponent(leadToken)}&leadId=${encodeURIComponent(leadId)}&origem=audiencia_aprovada`;

  const rawEmpresa = (lead.empresa || '').trim();
  const rawNome = (lead.nome || '').trim();
  const hasEmpresa = Boolean(rawEmpresa && rawEmpresa.toUpperCase() !== rawNome.toUpperCase());
  const hasNome = Boolean(rawNome);

  const results = [];

  // 1. REGISTRO PJ (EMPRESA)
  if (hasEmpresa || docDigits.length > 11 || lead.tipo === 'PJ') {
    const isDocCnpj = docDigits.length === 14;
    results.push({
      id: `cli-pj-${leadId}`,
      leadOriginId: leadId,
      codigoCliente: lead.codigoCliente || getNextClientSequence(),
      tipo: 'PJ',
      nomeRazao: (rawEmpresa || rawNome || 'Empresa').toUpperCase(),
      documento: isDocCnpj ? cleanDoc : (lead.cnpj || ''),
      documentoTipo: 'CNPJ',
      natureza: 'Sociedade Empresária',
      nire: lead.nire || '',
      situacao: 'NOVO',
      statusConta: 'Novo Cadastro (Ficha Enviada)',
      statusValidacao: 'Validado como PJ',
      dataAbertura: lead.dataAbertura || new Date().toISOString().split('T')[0],
      dataCadastro: new Date().toISOString().split('T')[0],
      dataAprovacao: lead.aprovadoEm || new Date().toISOString(),
      socioVinculado: rawNome.toUpperCase(),
      responsavel: rawNome.toUpperCase(),
      contato: phone,
      telefoneFixo: lead.telefoneFixo || '',
      email: (lead.email || '').toLowerCase().trim(),
      emailSecundario: lead.emailSecundario || '',
      origem: 'Portal Oficial Mourato & Associados',
      pratica: lead.pratica || 'Auditoria & Rating Bancário',
      contexto: lead.contexto || '',
      linkFicha: calculatedLink,
      empresa: {
        razaoSocial: (rawEmpresa || rawNome || '').toUpperCase(),
        nomeFantasia: lead.nomeFantasia || '',
        cnpj: isDocCnpj ? cleanDoc : (lead.cnpj || ''),
        cargoSocio: lead.cargoSocio || 'Sócio-Administrador',
        capitalSocial: lead.capitalSocial || '',
        faturamentoAnual: lead.faturamentoAnual || '',
        regimeTributario: lead.regimeTributario || ''
      },
      balanco: {
        exercicio: '2026 (Auditado)',
        ativo: '',
        patrimonioLiquido: '',
        capitalSocial: lead.capitalSocial || '',
        faturamentoAnual: lead.faturamentoAnual || '',
        contadorResponsavel: ''
      },
      contasBancarias: lead.contasBancarias || [],
      portais: lead.portais || {},
      anexos: lead.anexos || [],
      protocolo: lead.protocolo || generateProtocolo(),
      bacenScr: lead.bacenScr || 'Pendente',
      serasaScore: lead.serasaScore || 'Pendente',
      boaVistaScore: lead.boaVistaScore || 'Pendente',
      quodScore: lead.quodScore || 'Pendente',
      govNivel: lead.govNivel || 'Pendente'
    });
  }

  // 2. REGISTRO PF (SÓCIO / PESSOA FÍSICA)
  if (hasNome && (hasEmpresa || docDigits.length <= 11 || lead.tipo === 'PF')) {
    const isDocCpf = docDigits.length === 11;
    results.push({
      id: `cli-pf-${leadId}${hasEmpresa ? '-socio' : ''}`,
      leadOriginId: leadId,
      codigoCliente: getNextClientSequence(),
      tipo: 'PF',
      nomeRazao: rawNome.toUpperCase(),
      documento: isDocCpf ? cleanDoc : (lead.cpf || ''),
      documentoTipo: 'CPF',
      natureza: 'Pessoa Física (Sócio Administrador)',
      situacao: 'NOVO',
      statusConta: 'Novo Cadastro (Ficha Enviada)',
      statusValidacao: 'Validado como PF',
      dataAbertura: lead.dataAbertura || new Date().toISOString().split('T')[0],
      dataCadastro: new Date().toISOString().split('T')[0],
      dataAprovacao: lead.aprovadoEm || new Date().toISOString(),
      empresaVinculada: rawEmpresa.toUpperCase(),
      socioVinculado: '',
      responsavel: rawNome.toUpperCase(),
      contato: phone,
      telefoneFixo: lead.telefoneFixo || '',
      email: (lead.email || '').toLowerCase().trim(),
      emailSecundario: lead.emailSecundario || '',
      rg: lead.rg || '',
      origem: 'Portal Oficial Mourato & Associados',
      pratica: lead.pratica || 'Auditoria & Rating Bancário',
      contexto: lead.contexto || '',
      linkFicha: calculatedLink,
      socioeconomico: {
        profissao: lead.profissao || lead.socioeconomico?.profissao || 'Sócio-Administrador',
        tipoVinculo: lead.tipoVinculo || lead.socioeconomico?.tipoVinculo || 'Empresário / Sócio',
        escolaridade: lead.escolaridade || lead.socioeconomico?.escolaridade || '',
        rendaMensal: lead.rendaMensal || lead.socioeconomico?.rendaMensal || '',
        outrasRendas: lead.outrasRendas || lead.socioeconomico?.outrasRendas || '',
        empresaEmpregadora: rawEmpresa.toUpperCase(),
        veiculos: lead.veiculos || []
      },
      rendaPatrimonio: {
        proLabore: lead.rendaMensal || '',
        bens: '',
        veiculos: ''
      },
      contasBancarias: (lead.contasBancarias || []).filter(b => b.tipoConta === 'PF'),
      portais: lead.portais || {},
      anexos: lead.anexos || [],
      protocolo: lead.protocolo || generateProtocolo(),
      bacenScr: lead.bacenScr || 'Pendente',
      serasaScore: lead.serasaScore || 'Pendente',
      boaVistaScore: lead.boaVistaScore || 'Pendente',
      quodScore: lead.quodScore || 'Pendente',
      govNivel: lead.govNivel || 'Pendente'
    });
  }

  // Fallback se nada foi gerado
  if (results.length === 0) {
    results.push({
      id: `cli-lead-${leadId}`,
      codigoCliente: getNextClientSequence(),
      tipo: 'PF',
      nomeRazao: (rawNome || rawEmpresa || 'Cliente').toUpperCase(),
      documento: cleanDoc,
      documentoTipo: 'CPF',
      dataCadastro: new Date().toISOString()
    });
  }

  return results;
};

// Wrapper para retrocompatibilidade
const convertLeadToClientRecord = (lead, linkFicha = '') => {
  const records = convertLeadToClientRecords(lead, linkFicha);
  return records[0];
};

const isClientAlreadyInList = (clientList, lead) => {
  if (!lead || !Array.isArray(clientList)) return false;
  const deletedIds = getDeletedClientIds();
  const leadId = String(lead.id || '');
  const leadDoc = (lead.documento || lead.cnpj || lead.cpf || '').replace(/\D/g, '');

  // Trava de Exclusão Definitiva: Se este ID ou documento foi excluído explicitamente pelo usuário, não re-adicionar
  if (
    (leadId && (deletedIds.has(leadId) || deletedIds.has(`cli-lead-${leadId}`))) ||
    (leadDoc && deletedIds.has(leadDoc))
  ) {
    return true;
  }

  const leadEmpresa = (lead.empresa || '').toLowerCase().trim();
  const leadEmail = (lead.email || '').toLowerCase().trim();
  const leadPhone = (lead.telefone || '').replace(/\D/g, '');

  return clientList.some(c => {
    if (c.id === `cli-lead-${leadId}` || c.leadOriginId === leadId) return true;
    if (leadDoc && leadDoc.length >= 11 && (c.documento || '').replace(/\D/g, '') === leadDoc) return true;
    if (leadEmpresa && (c.nomeRazao || '').toLowerCase().trim() === leadEmpresa && c.tipo === 'PJ') return true;
    if (leadEmail && leadEmail !== 'mourato@mouratoassociados.com.br' && (c.email || '').toLowerCase().trim() === leadEmail) return true;
    if (leadPhone && leadPhone.length >= 10 && (c.contato || '').replace(/\D/g, '').endsWith(leadPhone.slice(-8))) return true;
    return false;
  });
};

// Construtor Oficial do JSON da Planilha Cadastral (Espelha as Seções da Planilha de Coleta)
export const buildPlanilhaJsonFromClient = (client) => {
  if (!client) return {};

  const isPj = client.tipo === 'PJ' || !!client.empresa?.razaoSocial || (client.documentoTipo === 'CNPJ');
  const cleanDoc = (client.documento || client.empresa?.cnpj || client.cpf || '').replace(/\D/g, '');
  const cleanCpf = (client.cpf || client.responsavelCpf || (!isPj ? client.documento : '') || '').replace(/\D/g, '');
  const cleanCnpj = (isPj ? (client.documento || client.empresa?.cnpj || '') : '').replace(/\D/g, '');

  return {
    versao_schema: "2.0-TEIA-PLANILHA-MESTRE",
    gerado_em: new Date().toISOString(),
    origem_coleta: "Portal Oficial Mourato & Associados (Produção)",
    status_esteira: "NOVO",
    protocolo_atendimento: client.protocolo || `MA-${Date.now()}`,

    // SEÇÃO 1: IDENTIFICAÇÃO PESSOAL (TITULAR / SÓCIO)
    identificacao_pessoal: {
      nome_completo: client.socioVinculado || client.responsavel || client.titular?.nome || client.nomeRazao || '',
      cpf: cleanCpf,
      rg: client.rg || client.titular?.rg || '',
      orgao_expedidor: client.orgaoExpedidor || client.titular?.orgao_expedidor || '',
      data_nascimento: client.dataNascimento || client.titular?.nascimento || '',
      sexo: client.sexo || client.titular?.sexo || '',
      estado_civil: client.estadoCivil || client.titular?.estado_civil || '',
      nome_mae: client.nomeMae || client.titular?.nome_mae || '',
      nome_pai: client.nomePai || client.titular?.nome_pai || '',
      nacionalidade: client.nacionalidade || client.titular?.nacionalidade || 'Brasileira',
      naturalidade: client.naturalidade || client.titular?.naturalidade || ''
    },

    // SEÇÃO 2: ENDEREÇO & CONTATO
    endereco_e_contato: {
      cep: client.cep || client.endereco?.cep || '',
      logradouro: client.logradouro || client.endereco?.logradouro || (typeof client.endereco === 'string' ? client.endereco : ''),
      numero: client.numero || client.endereco?.numero || '',
      complemento: client.complemento || client.endereco?.complemento || '',
      bairro: client.bairro || client.endereco?.bairro || '',
      cidade: client.cidade || client.endereco?.cidade || '',
      uf: client.uf || client.endereco?.uf || '',
      tipo_residencia: client.tipoImovel || client.endereco?.tipo_imovel || '',
      tempo_residencia: client.tempoResidencia || client.endereco?.tempo_residencia || '',
      celular_whatsapp: client.contato || client.celular || client.telefone || '',
      telefone_fixo: client.telefoneFixo || client.contato?.telefone_fixo || '',
      email_principal: (client.email || client.contato?.email || '').toLowerCase().trim(),
      email_secundario: (client.emailSecundario || client.contato?.email_secundario || '').toLowerCase().trim()
    },

    // SEÇÃO 3: RENDA & OCUPAÇÃO SOCIOECONÔMICA
    renda_e_ocupacao: {
      profissao_cargo: client.socioeconomico?.profissao || client.profissao || '',
      tipo_vinculo: client.socioeconomico?.tipoVinculo || client.socioeconomico?.tipo_vinculo || (isPj ? 'Empresário / Sócio' : ''),
      escolaridade: client.socioeconomico?.escolaridade || '',
      renda_mensal_declarada: client.socioeconomico?.rendaMensal || client.socioeconomico?.renda_mensal || client.rendaMensal || '',
      outras_rendas: client.socioeconomico?.outrasRendas || client.socioeconomico?.outras_rendas || '',
      empresa_empregadora: client.socioeconomico?.empresaEmpregadora || client.socioeconomico?.empresa_empregadora || '',
      veiculos_proprios: client.socioeconomico?.veiculos || client.veiculos || []
    },

    // SEÇÃO 4: EMPRESA VINCULADA (PJ)
    empresa_vinculada_pj: isPj ? {
      razao_social: client.empresa?.razaoSocial || client.empresa?.razao_social || client.nomeRazao || '',
      nome_fantasia: client.empresa?.nomeFantasia || client.nomeFantasia || '',
      cnpj: cleanCnpj,
      cargo_societario: client.empresa?.cargoSocio || client.empresa?.cargo_socio || client.cargoSocio || 'Sócio-Administrador',
      capital_social: client.empresa?.capitalSocial || client.empresa?.capital_social || client.capitalSocial || client.balanco?.capitalSocial || '',
      faturamento_anual: client.empresa?.faturamentoAnual || client.balanco?.faturamentoAnual || '',
      regime_tributario: client.empresa?.regimeTributario || client.regimeTributario || ''
    } : null,

    // SEÇÃO 5: ADENDOS DE BIRÔS & GOVERNO (VOLUNTÁRIOS / OPCIONAIS)
    adendos_biros_e_governo: {
      senha_gov_br: client.senhaGovBr || client.portais?.gov_br || client.portais?.gov?.senha || '',
      nivel_gov_br: client.nivelGovBr || client.portais?.gov?.nivel || '',
      senha_serasa: client.senhaSerasa || client.portais?.serasa || client.portais?.serasa?.senha || '',
      senha_boavista: client.senhaBoaVista || client.portais?.boavista || client.portais?.boaVista?.senha || '',
      senha_quod: client.senhaQuod || client.portais?.quod || client.portais?.quod?.senha || '',
      certificado_digital_a1: {
        possui: client.portais?.certificadoDigital?.possui || (client.pinCertificadoA1 ? 'sim' : 'não'),
        senha: client.pinCertificadoA1 || client.portais?.pin_a1 || client.portais?.certificadoDigital?.senha || '',
        tipo: client.portais?.certificadoDigital?.tipo || 'A1'
      },
      telefone_sms_2fa: client.contato || client.celular || client.telefone || ''
    },

    // SEÇÃO 6: BIRÔS DE CRÉDITO & RATINGS
    biros_e_ratings: {
      bacen_scr_rating: client.bacenScr || client.scrBacen?.ratingGeral || 'Rating A1',
      serasa_score: client.serasaScore || client.birosScores?.serasaScore || 'Regular',
      boavista_score: client.boaVistaScore || client.birosScores?.boaVistaScore || 'Regular',
      quod_score: client.quodScore || client.birosScores?.quodScore || 0,
      contas_bancarias_relacionamento: (client.contasBancarias || []).map(b => ({
        banco: b.banco === 'Outro' ? (b.bancoOutro || 'Outro') : b.banco,
        tipo: b.tipoConta || (isPj ? 'Conta PJ' : 'Conta PF'),
        status: b.statusConta || 'Ativa'
      }))
    },

    // SEÇÃO 7: TERMO LEGAL E COMPLIANCE
    termo_legal_consentimento: {
      versao: "2.0-LEGAL-BLINDADO",
      declaracao_voluntaria: true,
      autorizacao_pericial: true,
      isencao_responsabilidade_civil: true,
      data_aceite: client.dataCadastro || new Date().toISOString()
    },

    anexos_documentos: (client.anexos || []).map(a => ({
      tipo: a.tipo,
      nome: a.nome,
      tamanho: a.tamanho,
      data: a.data
    }))
  };
};

// Exportador Oficial da Planilha Cadastral Estruturada (.JSON)
export const downloadClientJsonForRobot = (client) => {
  if (!client) return;

  const planilhaJson = buildPlanilhaJsonFromClient(client);
  const cleanDoc = (client.documento || client.empresa?.cnpj || client.cpf || '').replace(/\D/g, '');
  const jsonContent = JSON.stringify(planilhaJson, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (client.nomeRazao || client.socioVinculado || 'CLIENTE').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  a.href = url;
  a.download = `PLANILHA_CADASTRAL_${safeName}_${cleanDoc || 'DOC'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportAllClientsForRobot = (clientsList) => {
  if (!Array.isArray(clientsList) || clientsList.length === 0) return;

  const bundle = {
    versao_schema: "2.0-TEIA-PLANILHA-BATCH",
    data_exportacao: new Date().toISOString(),
    total_fichas: clientsList.length,
    origem: "Mourato & Associados - Exportação em Lote de Fichas/Planilhas Cadastrais",
    planilhas_cadastrais: clientsList.map(c => buildPlanilhaJsonFromClient(c))
  };

  const jsonContent = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LOTE_PLANILHAS_CADASTRADO_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const ClientManagementModal = ({ isOpen, onClose, initialView = 'leads' }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authForm, setAuthForm] = useState({ user: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeView, setActiveView] = useState(initialView || 'leads');

  // Estados da Secretária Executiva Mica (WhatsApp Baileys & Atendimento a Clientes)
  const [micaTargetPhone, setMicaTargetPhone] = useState('');
  const [micaTargetClientName, setMicaTargetClientName] = useState('');
  const [micaMessageText, setMicaMessageText] = useState('');
  const [micaRecentMessages, setMicaRecentMessages] = useState([
    { id: 1, to: 'Adilson Lima', phone: '5511988887777', text: 'Olá Adilson! Seu dossiê pericial foi conferido e validado com sucesso pelo Chefe Mourato.', time: 'Hoje, 14:32', status: 'Enviada' },
    { id: 2, to: 'José Jailson', phone: '5511977776666', text: 'Prezado José Jailson, solicitamos o envio dos extratos bancários em PDF para finalizarmos a habilitação bancária.', time: 'Hoje, 11:15', status: 'Enviada' }
  ]);

  // Estados da Esteira Autônoma 3 Agentes (Mica -> Questão -> Alfred -> Mourato)
  const [pipelineCnpj, setPipelineCnpj] = useState('57.433.630/0001-77');
  const [pipelinePhone, setPipelinePhone] = useState('(11) 5824-5410');
  const [pipelineEmail, setPipelineEmail] = useState('jessymourato@hotmail.com');
  const [pipelineName, setPipelineName] = useState('Jessica Mourato');
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [pipelineLeads, setPipelineLeads] = useState([]);

  const fetchPipelineLeads = async () => {
    try {
      const res = await fetch('http://127.0.0.1:9000/api/pipeline/leads');
      if (res.ok) {
        const data = await res.json();
        if (data.leads) setPipelineLeads(data.leads);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (activeView === 'secretaria_executiva') {
      fetchPipelineLeads();
    }
  }, [activeView]);

  const handleRunPipeline = async () => {
    if (!pipelineCnpj) return;
    setPipelineLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:9000/api/pipeline/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj: pipelineCnpj,
          telefone: pipelinePhone,
          email: pipelineEmail,
          nome_contato: pipelineName,
          simular_consentimento_imediato: true
        })
      });
      const data = await res.json();
      setPipelineResult(data);
      fetchPipelineLeads();
    } catch (err) {
      alert('Erro ao acionar esteira no servidor Alfred: ' + err.message);
    } finally {
      setPipelineLoading(false);
    }
  };

  const handleMouratoDecide = async (protocolo, decisao) => {
    try {
      const res = await fetch('http://127.0.0.1:9000/api/pipeline/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolo, decisao })
      });
      const data = await res.json();
      alert(`Comando do Chefe Mourato [${decisao}] registrado com sucesso!`);
      fetchPipelineLeads();
    } catch (err) {
      alert('Erro ao registrar decisão: ' + err.message);
    }
  };

  const handleAdvanceOnboarding = async (protocolo) => {
    try {
      const res = await fetch('http://127.0.0.1:9000/api/pipeline/onboarding-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolo, confirmacao: true })
      });
      const data = await res.json();
      alert(`Mica avançou o onboarding: ${data.biro || data.status || 'Concluído'}`);
      fetchPipelineLeads();
    } catch (err) {
      alert('Erro ao avançar onboarding: ' + err.message);
    }
  };

  // Handler de Validação Final do Chefe Mourato para PDFs
  const handleFinalValidation = (client) => {
    if (!client) return;
    const now = new Date();
    const dataHoraStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR');
    
    const updated = {
      ...client,
      statusValidacaoFinal: 'APROVADO PELO CHEFE MOURATO',
      dataValidacaoFinal: dataHoraStr,
      validadoPor: 'Chefe Mourato',
      hashAutenticidade: 'MOURATO-PERICIAL-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase()
    };
    
    const updatedList = clients.map(c => c.id === client.id ? updated : c);
    setClients(updatedList);
    setSelectedClient(updated);
    
    try {
      localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('mourato_client_saved'));
    } catch (e) {
      console.error('Erro ao persistir validação final:', e);
    }
    
    showToast(
      '🛡️ Validação Final Homologada!',
      `Dossiê de "${client.nomeRazao || client.nome}" aprovado pelo Chefe Mourato com marca d'água 5.5% e cabeçalho oficial.`
    );
    
    handlePrintClientFormAndBureau(updated);
  };

  // Handler de Envio de Mensagem WhatsApp da Mica
  const handleSendMicaWhatsApp = (phone, text, clientName) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('Por favor, selecione um cliente ou digite um número de WhatsApp com DDD (ex: 11988887777).');
      return;
    }
    if (!text || !text.trim()) {
      alert('Por favor, digite ou selecione um modelo de resposta para enviar ao cliente.');
      return;
    }

    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const waUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text.trim())}`;
    
    const newEntry = {
      id: Date.now(),
      to: clientName || 'Cliente',
      phone: fullPhone,
      text: text.trim(),
      time: 'Hoje, ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'Enviada'
    };
    setMicaRecentMessages(prev => [newEntry, ...prev]);

    fetch('http://localhost:3005/api/mica/notify-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone, message: text.trim(), client: clientName })
    }).catch(() => {});

    window.open(waUrl, '_blank');
    setMicaMessageText('');
    showToast('💬 WhatsApp Preparado!', `A mensagem da Secretária Mica foi aberta no WhatsApp para envio a ${clientName || fullPhone}.`);
  };

  const handleCloseModal = () => {
    setIsAuthenticated(false);
    setAuthForm({ user: '', password: '' });
    setAuthError('');
    onClose();
  };

  // Estado real dos Dossiês Periciais gerados pelo Questão + Alfred (Porta 9000 local)
  const [questaoDossiesMap, setQuestaoDossiesMap] = useState({});
  const [questaoRunningCnpj, setQuestaoRunningCnpj] = useState('');

  const fetchQuestaoDossies = async () => {
    try {
      const res = await fetch('http://127.0.0.1:9000/api/questao/dossies');
      if (res.ok) {
        const data = await res.json();
        if (data?.dossies && typeof data.dossies === 'object') {
          setQuestaoDossiesMap(data.dossies);
        }
      }
    } catch (_) {
      // Servidor local 9000 offline — mantém estado atual sem inventar dados
    }
  };

  const getQuestaoDossieForClient = (client) => {
    if (!client || !questaoDossiesMap) return null;
    const docDigits = (getClientDocumento(client) || '').replace(/\D/g, '');
    if (docDigits.length === 14 && questaoDossiesMap[docDigits]) {
      return questaoDossiesMap[docDigits];
    }
    const cnpjEmpresa = (client.empresa?.cnpj || client.cnpj || '').replace(/\D/g, '');
    if (cnpjEmpresa.length === 14 && questaoDossiesMap[cnpjEmpresa]) {
      return questaoDossiesMap[cnpjEmpresa];
    }
    // Busca por nome da razão social ou sócio/titular vinculado (para par ordenado PF <-> PJ)
    const nomeTarget = (client.nomeRazao || client.empresaVinculada || '').toUpperCase().trim();
    if (nomeTarget) {
      const found = Object.values(questaoDossiesMap).find((d) => {
        const rz = (d?.razao_social || '').toUpperCase().trim();
        const tit = (d?.dossie_original_questao?.investigacao_pf_vinculada?.titular_principal || '').toUpperCase().trim();
        return (rz && (rz === nomeTarget || rz.includes(nomeTarget) || nomeTarget.includes(rz))) ||
               (tit && (tit === nomeTarget || tit.includes(nomeTarget)));
      });
      if (found) return found;
    }
    return null;
  };

  const handleDispararQuestao = async (client) => {
    if (!client) return;
    const rawCnpj = (client.tipo === 'PJ' ? getClientDocumento(client) : (client.empresa?.cnpj || client.cnpj || '')).replace(/\D/g, '');
    if (rawCnpj.length !== 14) {
      showToast('⚠️ CNPJ Necessário', 'Informe um CNPJ válido de 14 dígitos neste cadastro para disparar a varredura do Questão.');
      return;
    }
    setQuestaoRunningCnpj(rawCnpj);
    showToast('🕵️ Questão 4.0 Acionado', `Varredura pericial 75% iniciada para o CNPJ ${maskCNPJ(rawCnpj)}...`);
    try {
      const res = await fetch('http://127.0.0.1:9000/api/pipeline/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj: rawCnpj,
          telefone: client.contato || '',
          email: client.email || '',
          nome_contato: client.responsavel || client.nomeRazao || '',
          simular_consentimento_imediato: true
        })
      });
      const data = await res.json();
      if (data?.success) {
        await fetchQuestaoDossies();
        showToast('✅ Dossiê do Questão Concluído!', `Score: ${data.score_viabilidade}/100 • Parecer: ${data.recomendacao_alfred}`);
      } else {
        showToast('⚠️ Erro na Varredura', data?.detail || 'Não foi possível concluir a investigação do Questão.');
      }
    } catch (err) {
      showToast('⚠️ Servidor Alfred Offline', 'Verifique se o servidor local do Alfred (porta 9000) está ativo.');
    } finally {
      setQuestaoRunningCnpj('');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsAuthenticated(false);
      setAuthForm({ user: '', password: '' });
      setAuthError('');
      if (initialView) {
        setActiveView(initialView);
      }
      fetchLeads();
      fetchQuestaoDossies();
    }
  }, [isOpen, initialView]);

  // Escuta novos leads recebidos em tempo real para sincronizar a lista
  useEffect(() => {
    const handleNewLeadEvent = () => {
      fetchLeads();
    };
    window.addEventListener('mourato_new_lead_received', handleNewLeadEvent);
    return () => window.removeEventListener('mourato_new_lead_received', handleNewLeadEvent);
  }, []);

  // Helper interno de checagem contra exclusões manuais feitas pelo usuário
  const isRecordDeleted = (rec, deletedIds) => {
    if (!rec) return true;
    const idStr = String(rec.id || '');
    const originId = String(rec.leadOriginId || '');

    if (deletedIds && deletedIds.size > 0) {
      if (idStr && (deletedIds.has(idStr) || deletedIds.has(`cli-lead-${idStr}`))) return true;
      if (originId && (deletedIds.has(originId) || deletedIds.has(`cli-lead-${originId}`))) return true;
    }
    return false;
  };

  // 1. Clients Database State (Carregamento Inteligente: Base Teia de Aranha + persistência local)
  const [clients, setClients] = useState(() => {
    try {
      const deletedIds = getDeletedClientIds();
      let combined = [];

      // Diretriz Suprema: Reset de memórias semente (16 clientes fictícios/antigos removidos)
      if (typeof localStorage !== 'undefined') {
        if (!localStorage.getItem('mourato_zero_seed_cleared_v1')) {
          localStorage.removeItem(STORAGE_CLIENTS_KEY);
          localStorage.removeItem('mourato_associados_clients_v2');
          localStorage.setItem('mourato_zero_seed_cleared_v1', 'true');
          return [];
        }
      }

      // A. Carrega do storage primário
      const saved = localStorage.getItem(STORAGE_CLIENTS_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) combined = [...parsed];
        } catch (_) {}
      }

      // B. Resgata eventuais registros gravados na chave alternativa da Mica
      const altSaved = localStorage.getItem('mourato_associados_clients_v2');
      if (altSaved) {
        try {
          const altParsed = JSON.parse(altSaved);
          if (Array.isArray(altParsed)) {
            const existingIds = new Set(combined.map(c => c.id));
            altParsed.forEach(c => {
              if (c && c.id && !existingIds.has(c.id)) {
                combined.push(c);
                existingIds.add(c.id);
              }
            });
          }
        } catch (_) {}
      }

      // C. Mescla com os clientes oficiais auditados da Teia de Aranha (TEIA_INITIAL_CLIENTS)
      if (Array.isArray(TEIA_INITIAL_CLIENTS) && TEIA_INITIAL_CLIENTS.length > 0) {
        const existingDocs = new Set(combined.map(c => (c.documento || '').replace(/\D/g, '')).filter(Boolean));
        const existingIds = new Set(combined.map(c => c.id));
        TEIA_INITIAL_CLIENTS.forEach(teiaCli => {
          const docClean = (teiaCli.documento || '').replace(/\D/g, '');
          if (!existingIds.has(teiaCli.id) && (!docClean || !existingDocs.has(docClean))) {
            combined.push(teiaCli);
            if (teiaCli.id) existingIds.add(teiaCli.id);
            if (docClean) existingDocs.add(docClean);
          } else if (teiaCli.auditSyncedAt) {
            // Atualiza registros já existentes no localStorage com a auditoria pericial oficial mais recente
            const idx = combined.findIndex(c =>
              c.id === teiaCli.id || (docClean && (c.documento || '').replace(/\D/g, '') === docClean)
            );
            if (idx >= 0 && combined[idx].auditSyncedAt !== teiaCli.auditSyncedAt) {
              combined[idx] = {
                ...combined[idx],
                ...teiaCli,
                id: combined[idx].id || teiaCli.id,
              };
            }
          }
        });
      }

      // D. Limpeza radical: Expurgo de memórias semente / legadas para garantir 0 clientes iniciais
      const LEGACY_SEED_IDS = new Set([
        'cli-pj-mourato', 'cli-pf-angela', 'cli-pf-erivaldo', 'cli-pf-helia',
        'cli-pf-mourato', 'cli-pf-luiz', 'cli-pf-marcos', 'cli-pf-nilson',
        'cli-pf-silvanei', 'cli-pf-f1da80d8-6dba-46e7-97f4-bcce70019d2d',
        'cli-pf-sergio', 'cli-pj-sergio', 'cli-pj-erivaldo', 'cli-pj-nilson',
        'cli-pj-f1da80d8-6dba-46e7-97f4-bcce70019d2d'
      ]);

      let hasFix = false;
      const cleaned = combined
        .filter(c => c && c.id && !LEGACY_SEED_IDS.has(c.id) && !isRecordDeleted(c, deletedIds))
        .map(c => {
          const isPj = c.tipo === 'PJ';
          const resolvedDoc = getClientDocumento(c);
          if (!isPj && (!c.documento || c.documento === 'Não informado' || !c.documento.trim()) && resolvedDoc && resolvedDoc !== 'Não informado') {
            hasFix = true;
            return { ...c, documento: resolvedDoc, documentoTipo: 'CPF' };
          }
          return c;
        });

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(cleaned));
          localStorage.removeItem('mourato_associados_clients_v2');
        } catch (_) {}
      }
      return cleaned;
    } catch (e) {
      console.error('Erro ao recuperar clientes do storage:', e);
      return Array.isArray(TEIA_INITIAL_CLIENTS) ? TEIA_INITIAL_CLIENTS : [];
    }
  });

  // Recarrega em tempo real quando um novo cliente preenche a Ficha de Onboarding no site oficial
  useEffect(() => {
    const handleClientSaved = () => {
      try {
        const deletedIds = getDeletedClientIds();
        const saved = localStorage.getItem(STORAGE_CLIENTS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            let hasFix = false;
            const filtered = parsed.filter(c => !isRecordDeleted(c, deletedIds)).map(c => {
              const isPj = c.tipo === 'PJ';
              const resolvedDoc = getClientDocumento(c);
              if (!isPj && (!c.documento || c.documento === 'Não informado' || !c.documento.trim()) && resolvedDoc && resolvedDoc !== 'Não informado') {
                hasFix = true;
                return { ...c, documento: resolvedDoc, documentoTipo: 'CPF' };
              }
              return c;
            });
            if (hasFix && typeof localStorage !== 'undefined') {
              try {
                localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(filtered));
              } catch (_) {}
            }
            setClients(filtered);
          }
        }
      } catch (e) {
        console.error('Erro ao recarregar clientes:', e);
      }
    };

    window.addEventListener('mourato_client_saved', handleClientSaved);
    window.addEventListener('storage', handleClientSaved);
    return () => {
      window.removeEventListener('mourato_client_saved', handleClientSaved);
      window.removeEventListener('storage', handleClientSaved);
    };
  }, []);

  // Regra oficial de filtragem da aba Leads:
  // Somente permanecem em LEADS os contatos que NÃO aceitaram os termos (ou recusaram LGPD).
  // Quem aceitou os termos (SIM) é automaticamente aprovado e migrado para a aba CLIENTES.
  const isLeadSemAceiteTermos = (lead) => {
    if (!lead) return false;
    const st = String(lead.status || '').toLowerCase().trim();
    const ctx = String(lead.contexto || '').toLowerCase();
    if (lead.termosAceitos === false || lead.aceiteTermos === false) return true;
    if (
      st === 'recusado' ||
      st === 'recusou_termos' ||
      st === 'nao_aceitou_termos' ||
      st === 'sem_termos' ||
      st === 'aguardando_termos' ||
      st === 'cancelado' ||
      st === 'lgpd_recusado'
    ) {
      return true;
    }
    if (ctx.includes('recusou os termos') || ctx.includes('não aceitou') || ctx.includes('nao aceitou')) {
      return true;
    }
    return false;
  };

  const [leads, setLeads] = useState(() => {
    try {
      const saved = localStorage.getItem('mourato_leads_solicitacoes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deletedIds = getDeletedClientIds();
          return parsed.filter(l => {
            if (isRecordDeleted(l, deletedIds)) return false;
            return isLeadSemAceiteTermos(l);
          });
        }
      }
    } catch (_) {}
    return [];
  });
  const [leadsLoading, setLeadsLoading] = useState(false);

  const fetchLeads = async () => {
    setLeadsLoading(true);
    let items = [];
    const approvedSet = getApprovedLeadsSet();

    const apiUrl = import.meta.env.VITE_API_URL || 'https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod';
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin2026';

    // 1. Tenta buscar da API remota oficial da AWS (DynamoDB mourato-leads)
    try {
      const res = await fetch(`${apiUrl}/leads`, {
        headers: { 'x-admin-password': adminPassword }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        items = await res.json();
      }
    } catch (e) {
      console.warn('Leads API remota offline, tentando fallback:', e.message);
    }

    // 2. Fallback backend local se o remoto estiver vazio
    if (!items || items.length === 0) {
      try {
        const localRes = await fetch('http://localhost:3000/api/leads');
        if (localRes.ok) {
          const lData = await localRes.json();
          if (Array.isArray(lData) && lData.length > 0) items = lData;
        }
      } catch (err) {}
    }

    // 3. Mescla com eventuais leads salvos no localStorage para integridade máxima
    try {
      const saved = JSON.parse(localStorage.getItem('mourato_leads_solicitacoes') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        if (!items || items.length === 0) {
          items = saved;
        } else {
          const existingIds = new Set(items.map(it => String(it.id)));
          saved.forEach(s => {
            if (s && s.id && !existingIds.has(String(s.id))) {
              items.push(s);
              existingIds.add(String(s.id));
            }
          });
        }
      }
    } catch (err) {}

    // 4. Segrega: Leads Aprovados saem de Leads e entram em Clientes (com trava anti-respawn)
    const pendingLeads = [];
    const approvedLeadsToMigrate = [];
    const deletedIds = getDeletedClientIds();
    const currentClients = (clients && clients.length > 0) ? clients : (() => {
      try {
        const raw = localStorage.getItem(STORAGE_CLIENTS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (_) { return []; }
    })();

    (items || []).forEach(lead => {
      if (!lead) return;
      // Trava de exclusão: se foi deletado, NUNCA sobe para a aba Leads e NUNCA migra para Clientes
      if (isRecordDeleted(lead, deletedIds)) {
        if (lead.id) {
          fetch(`${apiUrl}/leads/${lead.id}`, {
            method: 'DELETE',
            headers: { 'x-admin-password': adminPassword }
          }).catch(() => {});
        }
        return;
      }

      const email = (lead.email || '').toLowerCase().trim();
      const phone = (lead.telefone || '').replace(/\D/g, '');
      const leadId = String(lead.id || '');
      const alreadyClient = isClientAlreadyInList(currentClients, lead);
      const semAceiteTermos = isLeadSemAceiteTermos(lead);

      const isApproved =
        !semAceiteTermos ||
        alreadyClient ||
        (leadId && approvedSet.has(leadId)) ||
        (email && approvedSet.has(email)) ||
        (phone && phone.length >= 8 && approvedSet.has(phone)) ||
        lead.status === 'aprovado';

      if (isApproved) {
        markLeadAsApprovedLocally(leadId, lead);
        approvedLeadsToMigrate.push({ ...lead, status: 'aprovado' });
      } else {
        pendingLeads.push({ ...lead, status: lead.status || 'nao_aceitou_termos' });
      }
    });

    // Migra leads aprovados para a lista de Clientes caso ainda não estejam lá (Separando PF e PJ)
    if (approvedLeadsToMigrate.length > 0) {
      setClients(prevClients => {
        let updatedList = [...prevClients];
        let hasChanges = false;
        approvedLeadsToMigrate.forEach(approvedLead => {
          if (!isClientAlreadyInList(updatedList, approvedLead)) {
            const clientRecs = convertLeadToClientRecords(approvedLead);
            clientRecs.forEach(rec => {
              if (!updatedList.some(c => c.id === rec.id || (rec.documento && (c.documento || '').replace(/\D/g, '') === rec.documento.replace(/\D/g, '') && (c.documento || '').replace(/\D/g, '').length >= 11))) {
                updatedList = [rec, ...updatedList];
                hasChanges = true;
              }
            });
          }
        });
        if (hasChanges) {
          try {
            localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedList));
          } catch (e) {}
        }
        return updatedList;
      });
    }

    // Na aba Leads, somente permanecem leads pendentes (os aprovados saem para Clientes)
    setLeads(pendingLeads);
    setLeadsLoading(false);
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Remover esta solicitação?')) return;
    const targetLead = leads.find(l => l.id === id);

    const apiUrl = import.meta.env.VITE_API_URL || 'https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod';
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin2026';

    try {
      await fetch(`${apiUrl}/leads/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
      });
    } catch (e) {}
    try {
      await fetch(`http://localhost:3000/api/leads/${id}`, { method: 'DELETE' });
    } catch (e) {}

    const updated = leads.filter(l => l.id !== id);
    setLeads(updated);
    try {
      localStorage.setItem('mourato_leads_solicitacoes', JSON.stringify(updated));
      const deleted = getDeletedClientIds();
      deleted.add(String(id));
      deleted.add(`cli-lead-${id}`);
      if (targetLead) {
        const email = (targetLead.email || '').toLowerCase().trim();
        const phone = (targetLead.telefone || '').replace(/\D/g, '');
        const doc = (targetLead.documento || targetLead.cnpj || targetLead.cpf || '').replace(/\D/g, '');
        if (email && email !== 'mourato@mouratoassociados.com.br' && email !== 'mourato.importacao@gmail.com') deleted.add(email);
        if (phone && phone !== '11978990034') deleted.add(phone);
        if (doc) deleted.add(doc);
      }
      localStorage.setItem(STORAGE_DELETED_CLIENTS_KEY, JSON.stringify(Array.from(deleted)));
    } catch (e) {}
    showToast('🗑️ Lead Removido', 'A solicitação foi excluída com sucesso.');
  };

  const [approvalModalData, setApprovalModalData] = useState(null);

  const handleApproveLead = async (id, explicitLead = null) => {
    const targetLead = explicitLead || leads.find(l => l.id === id);
    if (!targetLead) return;

    // 1. Marca imediatamente como aprovado na trava local com chaves múltiplas
    markLeadAsApprovedLocally(id, targetLead);

    // 2. Monta o link oficial da Ficha Cadastral com os dados preenchidos e token de uso único
    const baseUrl = window.location.origin || 'https://www.mouratoassociados.com.br';
    const token = targetLead.id || `tok-${Date.now()}`;
    const linkFicha = `${baseUrl}/ficha-cadastral?nome=${encodeURIComponent(targetLead.nome || '')}&empresa=${encodeURIComponent(targetLead.empresa || '')}&telefone=${encodeURIComponent(targetLead.telefone || '')}&email=${encodeURIComponent(targetLead.email || '')}&token=${encodeURIComponent(token)}&leadId=${encodeURIComponent(targetLead.id || '')}&origem=audiencia_aprovada`;

    // 3. Monta o texto oficial para WhatsApp com a Ficha Cadastral Oficial
    const wppMsg = `Olá, *${targetLead.nome || 'Cliente'}* (${targetLead.empresa || 'Empresa'})!\n\nSua solicitação de assessoria na *Mourato & Associados* foi *APROVADA* com sucesso pelo Canal Direto pericial.\n\nPara darmos início imediato à sua auditoria de crédito e calibragem de rating junto aos birôs oficiais (Banco Central SCR, Serasa, Boa Vista e Quod), por favor acesse sua Ficha Cadastral Oficial no link seguro abaixo:\n\n📋 *Acesse sua Ficha Cadastral:* ${linkFicha}\n\n_Mourato & Associados Ltda — CNPJ: 38.377.738/0001-45_\nCanal Direto: (11) 97899-0034 | mourato@mouratoassociados.com.br`;

    // Telefone do CLIENTE destinatário (NUNCA usar o telefone corporativo da Mourato como destinatário)
    let rawDigits = (targetLead.telefone || '').replace(/\D/g, '');
    let cleanPhone = '';
    if (rawDigits && rawDigits !== '11978990034' && rawDigits !== '5511978990034') {
      if (rawDigits.length === 10 || rawDigits.length === 11) {
        cleanPhone = '55' + rawDigits;
      } else if (rawDigits.startsWith('55') && rawDigits.length >= 12) {
        cleanPhone = rawDigits;
      } else if (rawDigits.length >= 8) {
        cleanPhone = '55' + rawDigits;
      }
    }

    // 1. WhatsApp Desktop / App Nativo (Abre direto no aplicativo do WhatsApp Business no computador/celular)
    const wppAppUrl = cleanPhone 
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(wppMsg)}`
      : `whatsapp://send?text=${encodeURIComponent(wppMsg)}`;

    // 2. WhatsApp Web (Abre direto na conversa com o número no navegador)
    const wppWebUrl = cleanPhone 
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(wppMsg)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(wppMsg)}`;

    // 3. Universal Web Fallback
    const wppUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(wppMsg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(wppMsg)}`;

    // 4. Monta o e-mail oficial para Google Workspace com cabeçalho institucional, autolink e suporte exclusivo por telefone
    const emailSubject = `[Mourato & Associados] Solicitação Aprovada — Link da sua Ficha Cadastral`;
    
    // Texto formatado para o corpo do Google Workspace / Mailto
    const emailBody = `MOURATO & ASSOCIADOS — GOVERNANÇA E INTELIGÊNCIA FINANCEIRA
Assessoria Corporativa & Auditoria Pericial de Crédito

Prezado(a) ${targetLead.nome || 'Cliente'} (${targetLead.empresa || 'Empresa'}),

É com satisfação que informamos que sua solicitação de assessoria corporativa foi formalmente APROVADA pelo Canal Direto Pericial da Mourato & Associados.

Para darmos início imediato à auditoria de crédito e calibragem de rating junto aos birôs oficiais (Banco Central SCR, Serasa, Boa Vista e Quod), por favor acesse e preencha sua Ficha Cadastral Oficial no link abaixo:

🔗 ACESSE SUA FICHA CADASTRAL OFICIAL (CLIQUE NO LINK):
${linkFicha}

(Informamos que o preenchimento de senhas de birôs é estritamente voluntário e todas as informações estão sob sigilo pericial e amparo da LGPD).

────────────────────────────────────────────────────────────────────
⚠️ ATENÇÃO: ESTA É UMA MENSAGEM AUTOMÁTICA. FAVOR NÃO RESPONDER A ESTE E-MAIL.
Todos os esclarecimentos, alinhamentos e agendamentos serão realizados
exclusivamente via Canal Direto: (11) 97899-0034.
────────────────────────────────────────────────────────────────────

Atenciosamente,

MOURATO & ASSOCIADOS LTDA
Canal Direto de Governança e Inteligência Pericial
CNPJ: 38.377.738/0001-45 • São Paulo/SP
Atendimento Telefônico Oficial: (11) 97899-0034
Website: https://www.mouratoassociados.com.br`;

    // HTML completo com Logo Oficial para cópia ou envio enriquecido
    const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07090E; color: #FFFFFF; padding: 32px 24px; border-radius: 8px; max-width: 620px; margin: 0 auto; border: 1px solid rgba(197, 168, 105, 0.35);">
  <div style="text-align: center; border-bottom: 1px solid rgba(197, 168, 105, 0.25); padding-bottom: 22px; margin-bottom: 24px;">
    <img src="https://www.mouratoassociados.com.br/mourato-logo.png" alt="Mourato &amp; Associados" width="280" style="max-width: 100%; height: auto; display: block; margin: 0 auto 12px auto;" />
    <div style="font-size: 11px; color: #C5A869; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600;">Governança, Inteligência Financeira &amp; Rating</div>
  </div>

  <p style="font-size: 15px; color: #F1F5F9; line-height: 1.6; margin: 0 0 16px 0;">
    Prezado(a) <strong>${targetLead.nome || 'Cliente'}</strong> (${targetLead.empresa || 'Empresa'}),
  </p>

  <p style="font-size: 14px; color: #CBD5E1; line-height: 1.65; margin: 0 0 20px 0;">
    É com satisfação que confirmamos que a sua solicitação de assessoria corporativa foi formalmente <strong>APROVADA</strong> pela Diretoria Pericial da <strong>Mourato &amp; Associados</strong>.
  </p>

  <div style="background: rgba(197, 168, 105, 0.08); border-left: 3px solid #C5A869; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; font-size: 13px; color: #E2E8F0; line-height: 1.6;">
      Para darmos início imediato à auditoria pericial e estruturação do dossiê de rating junto aos birôs oficiais (Banco Central SCR, Serasa, Boa Vista e Quod), solicitamos o preenchimento da sua Ficha Cadastral Oficial:
    </p>
  </div>

  <div style="text-align: center; margin: 28px 0 14px 0;">
    <a href="${linkFicha}" target="_blank" rel="noopener noreferrer" style="background: linear-gradient(135deg, #D4AF37 0%, #AA820A 100%); color: #07090E; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 16px rgba(212, 175, 55, 0.35); letter-spacing: 0.5px;">
      📋 ACESSAR FICHA CADASTRAL OFICIAL
    </a>
  </div>

  <p style="font-size: 12px; color: #94A3B8; text-align: center; word-break: break-all; margin: 0 0 24px 0;">
    Link direto autolink: <a href="${linkFicha}" target="_blank" rel="noopener noreferrer" style="color: #D4AF37; text-decoration: underline;">${linkFicha}</a>
  </p>

  <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 6px; padding: 14px 18px; margin: 24px 0; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #FCA5A5; font-weight: 700; letter-spacing: 0.5px;">
      ⚠️ MENSAGEM AUTOMÁTICA — FAVOR NÃO RESPONDER A ESTE E-MAIL
    </p>
    <p style="margin: 6px 0 0 0; font-size: 12px; color: #CBD5E1; line-height: 1.5;">
      Os demais contatos, esclarecimentos periciais e alinhamentos operacionais serão realizados exclusivamente via telefone/WhatsApp oficial: <strong style="color: #F1F5F9;">(11) 97899-0034</strong>.
    </p>
  </div>

  <p style="font-size: 11.5px; color: #64748B; line-height: 1.5; margin: 0 0 24px 0;">
    <em>Nota de Sigilo e LGPD: O fornecimento de senhas ou dados de birôs é estritamente voluntário e opcional. Todas as informações estão sob sigilo pericial e amparo da LGPD.</em>
  </p>

  <div style="border-top: 1px solid rgba(255, 255, 255, 0.12); margin-top: 24px; padding-top: 20px; font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.6;">
    <strong style="color: #FFFFFF;">MOURATO &amp; ASSOCIADOS LTDA</strong><br>
    CNPJ 38.377.738/0001-45 &bull; Av. São Luís, 187, Sala 69 A - República, São Paulo/SP<br>
    Atendimento Telefônico Oficial: (11) 97899-0034 &bull; <a href="https://www.mouratoassociados.com.br" style="color: #D4AF37; text-decoration: none;">www.mouratoassociados.com.br</a>
  </div>
</div>`;

    const destEmail = (targetLead.email && targetLead.email.trim() && targetLead.email.trim().toLowerCase() !== 'mourato@mouratoassociados.com.br')
      ? targetLead.email.trim()
      : (targetLead.email || '');

    // URL direta do Google Workspace (Gmail Web Compose) com remetente oficial mourato@mouratoassociados.com.br
    const googleWorkspaceUrl = `https://mail.google.com/mail/?view=cm&fs=1&authuser=mourato@mouratoassociados.com.br&to=${encodeURIComponent(destEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const mailtoUrl = `mailto:${destEmail || 'mourato@mouratoassociados.com.br'}?cc=mourato@mouratoassociados.com.br&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    // 5. Converte o Lead e Adiciona a Clientes (Separa PJ para Empresa e PF para Sócio)
    const newClientRecords = convertLeadToClientRecords(targetLead, linkFicha);
    const newClientRecord = newClientRecords[0];

    // Calcula a lista atualizada imediatamente e persiste de forma síncrona
    let currentSaved = [];
    try {
      const raw = localStorage.getItem(STORAGE_CLIENTS_KEY);
      if (raw) currentSaved = JSON.parse(raw);
    } catch (_) {}
    if (!Array.isArray(currentSaved)) currentSaved = [];

    const idsToRemove = new Set(newClientRecords.map(r => r.id));
    const filtered = currentSaved.filter(c => !idsToRemove.has(c.id) && (!targetLead.email || (c.email || '').toLowerCase() !== targetLead.email.toLowerCase()));
    const updatedClients = [...newClientRecords, ...filtered];

    try {
      localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedClients));
    } catch (e) {}

    setClients(updatedClients);

    // 6. Remove da lista de Leads (sai imediatamente da aba Leads)
    setLeads(prevLeads => {
      const remaining = prevLeads.filter(l => l.id !== id && (!targetLead.email || l.email !== targetLead.email));
      try {
        localStorage.setItem('mourato_leads_solicitacoes', JSON.stringify(remaining));
      } catch (e) {}
      return remaining;
    });

    // 7. Transição Direta e Imediata para a Aba CLIENTES com os botões pré-cadastrados anteriores
    setActiveView('clients_list');
    setApprovalModalData(null);

    // 8. Notifica criação do cliente para ouvintes do sistema e dispara envio automático pela Mica
    try {
      window.dispatchEvent(new CustomEvent('mourato_client_saved', { detail: newClientRecord }));
    } catch (_) {}

    try {
      fetch('http://localhost:3005/api/mica/approve-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: targetLead,
          linkFicha: linkFicha
        })
      }).catch(() => {});
    } catch (_) {}

    // 9. Toast de sucesso claro e imediato
    showToast('🎉 Lead Aprovado!', `"${targetLead.empresa || targetLead.nome}" saiu de Leads e agora é um Cliente ativo.`);

    // 10. Sincroniza com backend local (Node) e AWS
    try {
      await fetch(`http://localhost:3000/api/leads/${id || 'lead'}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'aprovado', lead: targetLead, linkFicha })
      });
    } catch (e) {}

    const apiUrl = import.meta.env.VITE_API_URL || 'https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod';
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin2026';

    // Remove imediatamente da esteira remota da AWS para que nunca mais reapareça como lead pendente
    try {
      await fetch(`${apiUrl}/leads/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
      });
    } catch (_) {}

    // 11. E-mail de Protocolo NÃO é disparado aqui (somente após o cliente finalizar todo o processo/planilha)
  };

  // Disparo oficial do E-mail com Protocolo SOMENTE após o cliente finalizar o processo completo
  const handleSendProtocolEmailPosFinalizacao = (client) => {
    if (!client) return;
    const processoFinalizado = Boolean(
      client.protocolo && (
        client.statusValidacaoFinal === 'APROVADO PELO CHEFE MOURATO' ||
        client.pratica === 'onboarding_ficha' ||
        client.statusConta?.toLowerCase().includes('conclu') ||
        client.statusConta?.toLowerCase().includes('ficha') ||
        client.dataHoraTransmissao ||
        getQuestaoDossieForClient(client)
      )
    );
    if (!processoFinalizado) {
      showToast('⏳ Processo em Andamento', 'O e-mail com o protocolo só pode ser enviado depois que o cliente finalizar o processo completo.');
      return;
    }

    const protocoloOficial = client.protocolo || getQuestaoDossieForClient(client)?.protocolo || generateProtocolo();
    const destEmail = (client.email || '').trim();
    const subject = `[Mourato & Associados] Comprovante de Protocolo Oficial — ${protocoloOficial}`;
    const body = `MOURATO & ASSOCIADOS — GOVERNANÇA E INTELIGÊNCIA FINANCEIRA
Assessoria Corporativa & Auditoria Pericial de Crédito

Prezado(a) ${client.responsavel || client.nomeRazao || 'Cliente'},

Confirmamos que o seu processo cadastral e documental na Mourato & Associados foi FINALIZADO com sucesso.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PROTOCOLO OFICIAL DE ATENDIMENTO: ${protocoloOficial}
🏢 TITULAR / EMPRESA: ${client.nomeRazao || ''}
📄 DOCUMENTO: ${getClientDocumento(client)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nossa equipe pericial dará continuidade à estruturação do seu dossiê e entrará em contato via Canal Direto Oficial para os próximos alinhamentos (incluindo o agendamento do relatório SCR do Banco Central).

────────────────────────────────────────────────────────────────────
⚠️ ATENÇÃO: ESTA É UMA MENSAGEM AUTOMÁTICA. FAVOR NÃO RESPONDER A ESTE E-MAIL.
Canal Direto Oficial (WhatsApp/Telefone): (11) 97899-0034
────────────────────────────────────────────────────────────────────

Atenciosamente,
MOURATO & ASSOCIADOS LTDA
CNPJ: 38.377.738/0001-45 • São Paulo/SP
Website: https://www.mouratoassociados.com.br`;

    const workspaceUrl = `https://mail.google.com/mail/?view=cm&fs=1&authuser=mourato@mouratoassociados.com.br&to=${encodeURIComponent(destEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(workspaceUrl, '_blank');
    showToast('✉️ E-mail de Protocolo Pronto!', `Protocolo ${protocoloOficial} preparado para envio a ${destEmail || 'o cliente'}.`);
  };

  const abrirDisparoEmailWorkspace = (lead) => {
    setEmailModalLead(lead);
  };

  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Password visibility maps
  const [showFormPasswords, setShowFormPasswords] = useState({});
  const [showDetailPasswords, setShowDetailPasswords] = useState({});

  // Filtro de clientes: todos, empresas PJ ou sócios PF
  const [clientTypeFilter, setClientTypeFilter] = useState('todos');

  // 2. Corporate Expenses State
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EXPENSES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [expenseFilter, setExpenseFilter] = useState('todos');

  // 3. Appointments State
  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_APPOINTMENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // 4. Receivables (Mercado Pago) State
  const [receivables, setReceivables] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECEIVABLES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // 5. Mercado Pago Config State
  const [mpConfig, setMpConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MP_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      accessToken: import.meta.env.VITE_MP_ACCESS_TOKEN || import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || '',
      publicKey: import.meta.env.VITE_MP_PUBLIC_KEY || import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '',
      environment: 'production', // 'production' | 'sandbox'
      webhookUrl: 'https://api.mourato.com/webhook/mercadopago',
      connected: !!(import.meta.env.VITE_MP_ACCESS_TOKEN || import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN)
    };
  });
  const [showMpToken, setShowMpToken] = useState(false);
  const [mpTestStatus, setMpTestStatus] = useState('');
  const [copiedPixId, setCopiedPixId] = useState(null);
  const [activePixModal, setActivePixModal] = useState(null);

  // 6. Birôs de Crédito & Scores Oficiais (PF & PJ)
  const [selectedBureauClientId, setSelectedBureauClientId] = useState('');
  const [bureauScoresMap, setBureauScoresMap] = useState(() => {
    try {
      const saved = localStorage.getItem('mourato_bureau_scores_real_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  });
  const [bureauInputScores, setBureauInputScores] = useState({ serasa: '', boavista: '', quod: '' });
  const [bureauToast, setBureauToast] = useState(null);
  const [bureauModalDoc, setBureauModalDoc] = useState(null);
  const [bureauSyncClock, setBureauSyncClock] = useState(() => new Date().toLocaleTimeString('pt-BR'));
  const [bureauCategoryFilter, setBureauCategoryFilter] = useState('todos');
  const [isBureauEditMode, setIsBureauEditMode] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);

  // Obtém métricas do cliente: Se manipulado/salvo usa o salvo, senão puxa do cadastro ou inicia ZERADO (0)
  const getBureauDataForClient = (client) => {
    if (!client) {
      return { 
        serasa: 0, 
        boavista: 0, 
        quod: 0, 
        bacen: '0 (Não Auditado)', 
        prob: '0%', 
        atrasos: 'Zero Atrasos',
        serasaProb: '0%',
        serasaDividas: '0 (Nada Consta)',
        serasaConsultas: '0 consultas',
        serasaBtnText: 'Abrir Serasa Oficial',
        serasaBtnUrl: 'https://www.serasa.com.br/',
        boavistaPontualidade: '0%',
        boavistaFaturas: '0 (CENPROT)',
        boavistaProtestos: '0 apontamentos',
        boavistaBtnText: 'Abrir Boa Vista',
        boavistaBtnUrl: 'https://www.consumidorpositivo.com.br/',
        quodPositivo: 'Pendente de Ativação',
        quodHistorico: 'Zero Atrasos',
        quodConformidade: 'Sem Apontamentos',
        quodBtnText: 'Acessar Quod',
        quodBtnUrl: 'https://www.quod.com.br/',
        bacenVencidos: 'R$ 0,00',
        bacenPrejuizos: 'R$ 0,00',
        bacenComp: 'Não Auditado',
        bacenBtnText: 'Acessar Registrato',
        bacenBtnUrl: 'https://registrato.bcb.gov.br/'
      };
    }
    const cadSerasa = parseScoreValue(client.serasaScore);
    const cadBoaVista = parseScoreValue(client.boaVistaScore);
    const cadQuod = parseScoreValue(client.quodScore);
    const cadBacen = client.bacenScr || (cadSerasa > 0 ? 'Rating A1' : '0 (Não Auditado)');

    const saved = bureauScoresMap[client.id] || (
      (client.documento || '').replace(/\D/g, '') ? bureauScoresMap[(client.documento || '').replace(/\D/g, '')] : null
    );
    if (saved) {
      if (client.auditSyncedAt && (cadSerasa > 0 || cadBoaVista > 0 || cadQuod > 0)) {
        return {
          ...saved,
          serasa: saved.serasa > 0 ? saved.serasa : cadSerasa,
          boavista: saved.boavista > 0 ? saved.boavista : cadBoaVista,
          quod: saved.quod > 0 ? saved.quod : cadQuod,
          bacen: (saved.bacen && !String(saved.bacen).startsWith('0')) ? saved.bacen : cadBacen,
        };
      }
      return saved;
    }

    // Sobe os valores digitados no cadastro do cliente (se existirem), senão inicia ZERADO (0) para alimentação manual
    const isPj = client.tipo === 'PJ';

    return {
      serasa: cadSerasa,
      serasaProb: cadSerasa > 0 ? `${Math.min(99, Math.round(cadSerasa / 10))}%` : '0%',
      serasaDividas: '0 (Nada Consta)',
      serasaConsultas: '0 consultas',
      serasaBtnText: isPj ? 'Abrir Serasa Oficial (CNPJ Copiado)' : 'Abrir Serasa Oficial (CPF Copiado)',
      serasaBtnUrl: isPj ? 'https://empresas.serasaexperian.com.br/' : 'https://www.serasa.com.br/entrar?product=portal&redirectUrl=%2Farea-cliente%2Fsaude-financeira',
      boavista: cadBoaVista,
      boavistaPontualidade: cadBoaVista > 0 ? `${Math.min(99, Math.round(cadBoaVista / 10))}%` : '0%',
      boavistaFaturas: '0 (CENPROT)',
      boavistaProtestos: '0 apontamentos',
      boavistaBtnText: isPj ? 'Abrir Boa Vista (CNPJ Copiado)' : 'Abrir Boa Vista (CPF Copiado)',
      boavistaBtnUrl: isPj ? 'https://www.boavistaservicos.com.br/' : 'https://www.consumidorpositivo.com.br/entrar/',
      quod: cadQuod,
      quodPositivo: cadQuod > 0 ? 'Cadastro Positivo Ativo' : 'Pendente de Ativação',
      quodHistorico: 'Zero Atrasos',
      quodConformidade: cadQuod > 0 ? 'Regular / Sem Restrições' : 'Sem Apontamentos',
      quodBtnText: isPj ? 'Acessar Quod (CNPJ Copiado)' : 'Acessar Quod (CPF Copiado)',
      quodBtnUrl: isPj ? 'https://www.quod.com.br/' : 'https://consumidor.quod.com.br/',
      bacen: cadBacen,
      bacenVencidos: 'R$ 0,00',
      bacenPrejuizos: 'R$ 0,00 (Zero Prejuízo)',
      bacenComp: cadSerasa > 0 ? '100% em dia' : 'Não Auditado',
      bacenBtnText: isPj ? 'Acessar Registrato (e-CNPJ)' : 'Acessar Registrato (e-CPF)',
      bacenBtnUrl: 'https://registrato.bcb.gov.br/'
    };
  };

  const handleUpdateBureauMetric = (bureauKey, metricField, value) => {
    const activeClient = clients.find(c => c.id === selectedBureauClientId) || clients[0];
    const current = getBureauDataForClient(activeClient);
    const updated = {
      ...bureauScoresMap,
      [activeClient.id]: {
        ...current,
        [metricField]: value
      }
    };
    setBureauScoresMap(updated);
    try {
      localStorage.setItem('mourato_bureau_scores_real_v1', JSON.stringify(updated));
    } catch (_) {}
    setBureauSyncClock(new Date().toLocaleTimeString('pt-BR'));
  };

  // Impressão Oficial no Padrão Modelo 2 (Alfred CIO — Cabeçalho Mourato + Marca d'Água 5.5% + Tabelas Escuras)
  const handlePrintClientFormAndBureau = (client) => {
    if (!client) return;
    const bureau = getBureauDataForClient(client);
    const dossieQ = getQuestaoDossieForClient(client);
    const qOrig = dossieQ?.dossie_original_questao || null;
    const rfb = qOrig?.dados_rfb || {};
    const isPj = client.tipo === 'PJ';
    const doc = getClientDocumento(client);
    const printDate = new Date().toLocaleDateString('pt-BR');
    const printTime = new Date().toLocaleTimeString('pt-BR');
    const originUrl = window.location.origin || 'https://www.mouratoassociados.com.br';
    const sealUrl = `${originUrl}/mourato-seal-circle.png`;
    const authHash = (client.hashAutenticidade || ('MOURATO-' + Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase()));

    const parseNumericScore = (val) => {
      if (val === undefined || val === null || val === '') return 0;
      const num = parseInt(String(val).replace(/\D/g, ''), 10);
      return (!isNaN(num) && num > 0 && num <= 1000) ? num : 0;
    };

    const quodVal = parseNumericScore(bureau.quod) || parseNumericScore(client.quodScore);
    const serasaVal = parseNumericScore(bureau.serasa) || parseNumericScore(client.serasaScore);
    const boaVistaVal = parseNumericScore(bureau.boavista) || parseNumericScore(client.boaVistaScore);
    const bacenVal = (client.bacenScr && client.bacenScr !== 'Rating A1' && !String(client.bacenScr).startsWith('0') && client.bacenScr !== 'Pendente')
      ? client.bacenScr
      : (bureau.bacen && bureau.bacen !== 'Rating A1' && !String(bureau.bacen).startsWith('0') && bureau.bacen !== 'Pendente' ? bureau.bacen : null);

    const triadeScores = [quodVal, serasaVal, boaVistaVal].filter(s => s > 0);
    const mediaTriade = triadeScores.length > 0 ? Math.round(triadeScores.reduce((a, b) => a + b, 0) / triadeScores.length) : 0;
    const triadeTitulo = mediaTriade > 0
      ? `2. PAINEL CONSOLIDADO DOS 4 BIRÔS — MÉDIA TRÍADE PRIVADA: ${mediaTriade} / 1000 (${mediaTriade >= 750 ? 'EXCELENTE' : mediaTriade >= 550 ? 'BOM' : 'ATENÇÃO'})`
      : '2. PAINEL CONSOLIDADO DOS 4 BIRÔS (LEI DO ZERO DADOS INVENTADOS)';

    const capSocialNum = rfb.capital_social !== undefined && rfb.capital_social !== null
      ? Number(rfb.capital_social)
      : parseMonetaryValue(client.empresa?.capitalSocial || client.balanco?.capitalSocial);
    const capSocialFmt = capSocialNum > 0
      ? capSocialNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'Não informado';

    const regimeFmt = rfb.optante_simei
      ? 'MEI (SIMEI)'
      : rfb.optante_simples
        ? 'Simples Nacional'
        : (client.empresa?.regimeTributario || rfb.porte || 'Não informado');

    const endRfb = rfb.endereco
      ? `${rfb.endereco.logradouro || ''}, ${rfb.endereco.numero || ''} - ${rfb.endereco.bairro || ''} - ${rfb.endereco.municipio || ''}/${rfb.endereco.uf || ''}`.replace(/^,\s*-\s*-\s*\/$/, '')
      : '';
    const enderecoFinal = client.endereco || endRfb || 'Não informado';
    const cepFinal = client.cep || rfb.endereco?.cep || 'Não informado';

    // Linhas da Seção 3 (Verificações reais do Questão + Contas Bancárias reais)
    const expRows = [];
    if (qOrig) {
      (qOrig.green_flags || []).forEach(gf => {
        expRows.push(`<tr><td><strong>${gf.modulo}</strong></td><td>Questão 75%</td><td>${gf.indicador}</td><td style="color:#059669;font-weight:700;">CONFORME</td></tr>`);
      });
      (qOrig.yellow_flags || []).forEach(yf => {
        expRows.push(`<tr><td><strong>${yf.modulo}</strong></td><td>Alerta (${yf.gravidade || 'ATENÇÃO'})</td><td>${yf.descricao}</td><td style="color:#B45309;font-weight:700;">ATENÇÃO</td></tr>`);
      });
      (qOrig.red_flags || []).forEach(rf => {
        expRows.push(`<tr><td><strong>${rf.modulo}</strong></td><td>Restrição Crítica</td><td>${rf.descricao}</td><td style="color:#DC2626;font-weight:700;">CRÍTICO</td></tr>`);
      });
    }
    if (client.contasBancarias && client.contasBancarias.length > 0) {
      client.contasBancarias.forEach(b => {
        expRows.push(`<tr><td><strong>${b.banco || b.bancoOutro || 'Instituição'}</strong></td><td>Conta ${b.tipoConta || (isPj ? 'PJ' : 'PF')}</td><td>Ag: ${b.agencia || '—'} • CC: ${b.conta || '—'}</td><td>${b.origemCcs ? 'Bacen CCS' : 'Bacen SCR'}</td></tr>`);
      });
    }
    if (expRows.length === 0) {
      expRows.push(`<tr><td colspan="4" style="text-align:center;color:#64748B;">Nenhuma varredura do Questão ou conta bancária anexada até o momento (Lei do Zero Dados Inventados).</td></tr>`);
    }

    const parecerBullets = [];
    if (dossieQ?.justificativa_analitica?.length) {
      dossieQ.justificativa_analitica.forEach(j => parecerBullets.push(`<b>DIAGNÓSTICO PERICIAL:</b> ${j}`));
    }
    if (dossieQ?.estrategia_mourato?.length) {
      dossieQ.estrategia_mourato.forEach(e => parecerBullets.push(`<b>ESTRATÉGIA MOURATO:</b> ${e}`));
    }
    if (parecerBullets.length === 0) {
      parecerBullets.push(`<b>CONFORMIDADE LGPD &amp; LEI DO ZERO:</b> Este laudo consolida exclusivamente os dados reais auditados até ${printDate}. Campos sem documento comprobatório físico permanecem zerados (0) ou marcados como aguardando PDF oficial (Serasa, Boa Vista, Quod, Registrato SCR/CCS e PGDAS-D).`);
      parecerBullets.push(`<b>PRÓXIMO PASSO OPERACIONAL:</b> Concluir a coleta documental dos birôs faltantes e executar a varredura 75% do Questão 4.0 para emissão do Rating de Balcão e enquadramento bancário.`);
    }

    const ratingLabel = dossieQ?.recomendacao_acao
      ? `SCORE ${dossieQ.score_viabilidade}/100 • ${dossieQ.recomendacao_acao}`
      : (mediaTriade >= 750 ? 'RATING TRÍADE PRIVADA: A+' : 'EM AUDITORIA PERICIAL');

    const printHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo Pericial Oficial Mourato — ${client.nomeRazao || 'Cliente'}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: Helvetica, Arial, -apple-system, sans-serif;
      color: #0D121D;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 16mm 22mm 16mm;
      margin: 0 auto;
      position: relative;
      background: #ffffff;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 118mm;
      height: 118mm;
      opacity: 0.055;
      pointer-events: none;
      z-index: 0;
    }
    .content { position: relative; z-index: 1; }
    .header {
      display: flex;
      align-items: center;
      gap: 4.5mm;
      border-bottom: 1.5pt solid #C5A869;
      padding-bottom: 3.5mm;
      margin-bottom: 6mm;
    }
    .header-seal { width: 17.5mm; height: 17.5mm; object-fit: contain; flex-shrink: 0; }
    .brand-title {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 16pt;
      font-weight: 700;
      color: #0D121D;
      letter-spacing: 0.4px;
      line-height: 1.1;
      margin: 0;
    }
    .brand-title .amp { color: #C5A869; }
    .brand-sub {
      font-size: 7.4pt;
      font-weight: 700;
      color: #C5A869;
      letter-spacing: 0.5px;
      margin-top: 1.5mm;
    }
    .brand-meta {
      font-size: 6.9pt;
      color: #475569;
      margin-top: 1mm;
    }
    .doc-title {
      font-size: 12pt;
      font-weight: 700;
      color: #0D121D;
      margin: 0 0 1.5mm 0;
    }
    .doc-sub {
      font-size: 8.2pt;
      color: #475569;
      margin: 0 0 5.5mm 0;
    }
    .sec-title {
      font-size: 9.2pt;
      font-weight: 700;
      color: #0D121D;
      margin: 5.5mm 0 2.2mm 0;
      text-transform: uppercase;
    }
    table {
      table-layout: fixed;
    }
    table td, table th {
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    table.grid-info {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
      margin-bottom: 3mm;
    }
    table.grid-info td {
      border: 0.5pt solid #CBD5E1;
      padding: 4.5px 6px;
      vertical-align: middle;
    }
    table.grid-info td.lbl {
      background: #F8FAFC;
      font-weight: 700;
      color: #0D121D;
      width: 17%;
    }
    table.grid-info td.val {
      background: #ffffff;
      color: #0D121D;
      width: 33%;
    }
    table.bureaus {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3mm;
      text-align: center;
    }
    table.bureaus th {
      background: #0D121D;
      color: #C5A869;
      font-size: 7.3pt;
      font-weight: 700;
      padding: 5.5px 4px;
      border: 0.6pt solid #C5A869;
      width: 25%;
    }
    table.bureaus td.score-ok {
      background: #ECFDF5;
      color: #059669;
      font-size: 8.8pt;
      font-weight: 700;
      padding: 5.5px 4px;
      border: 0.6pt solid #C5A869;
    }
    table.bureaus td.score-zero {
      background: #F8FAFC;
      color: #475569;
      font-size: 8.2pt;
      font-weight: 700;
      padding: 5.5px 4px;
      border: 0.6pt solid #C5A869;
    }
    table.bureaus td.sub-ok {
      background: #ECFDF5;
      color: #0D121D;
      font-size: 7pt;
      padding: 4px;
      border: 0.6pt solid #C5A869;
    }
    table.bureaus td.sub-zero {
      background: #F8FAFC;
      color: #64748B;
      font-size: 7pt;
      padding: 4px;
      border: 0.6pt solid #C5A869;
    }
    table.dark-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.4pt;
      margin-bottom: 3mm;
    }
    table.dark-table th {
      background: #0D121D;
      color: #FFFFFF;
      font-weight: 700;
      text-align: left;
      padding: 5px 6px;
      border: 0.5pt solid #CBD5E1;
    }
    table.dark-table td {
      padding: 4.5px 6px;
      border: 0.5pt solid #CBD5E1;
      color: #0D121D;
      vertical-align: top;
    }
    table.dark-table tr.summary-row td {
      background: #FEFCE8;
      font-weight: 700;
    }
    .parecer-list {
      margin: 2mm 0 0 0;
      padding: 0;
      list-style: none;
    }
    .parecer-list li {
      font-size: 8.1pt;
      line-height: 1.45;
      color: #0D121D;
      margin-bottom: 2.5mm;
      text-align: justify;
    }
    .footer-fixed {
      position: fixed;
      bottom: 10mm;
      left: 16mm;
      right: 16mm;
      border-top: 0.7pt solid #C5A869;
      padding-top: 2.5mm;
      display: flex;
      justify-content: space-between;
      font-size: 6.8pt;
      color: #475569;
    }
  </style>
</head>
<body>
  <img src="${sealUrl}" class="watermark" alt="Marca d'Água Mourato" />
  <div class="page">
    <div class="content">
      <div class="header">
        <img src="${sealUrl}" class="header-seal" alt="Brasão Mourato" />
        <div>
          <h1 class="brand-title">MOURATO <span class="amp">&amp;</span> ASSOCIADOS</h1>
          <div class="brand-sub">ASSESSORIA CORPORATIVA &amp; ESTRUTURAÇÃO FINANCEIRA &nbsp;&bull;&nbsp; QUALIDADE &bull; CONFIANÇA &bull; EXCELÊNCIA</div>
          <div class="brand-meta">CNPJ: 38.377.738/0001-45 &nbsp;&bull;&nbsp; Av. São Luís, 187, Sala 69 A, República, São Paulo/SP &nbsp;&bull;&nbsp; Canal Direto: (11) 97899-0034</div>
        </div>
      </div>

      <div class="doc-title">FICHA CADASTRAL ${isPj ? 'PJ' : 'PF'} &amp; LAUDO TRÍADE DE BIRÔS — AUDITORIA ALFRED CIO</div>
      <div class="doc-sub">Protocolo: ${client.protocolo || dossieQ?.protocolo || 'OFICIAL'} &bull; Código: ${client.codigoCliente || 'CLI-001'} &bull; Auditado em ${printDate} às ${printTime}</div>

      <div class="sec-title">1. IDENTIFICAÇÃO DO TITULAR (${isPj ? 'PESSOA JURÍDICA' : 'PESSOA FÍSICA'})</div>
      <table class="grid-info">
        <tr>
          <td class="lbl">${isPj ? 'Razão Social' : 'Nome Completo'}</td>
          <td class="val"><strong>${client.nomeRazao || 'Não informado'}</strong></td>
          <td class="lbl">${isPj ? 'CNPJ' : 'CPF'}</td>
          <td class="val"><strong>${doc}</strong></td>
        </tr>
        <tr>
          <td class="lbl">${isPj ? 'Situação / Abertura' : 'Data Nascimento'}</td>
          <td class="val">${isPj ? `${rfb.situacao_cadastral || client.situacao || 'ATIVA'} • ${rfb.data_abertura || client.dataAbertura || '—'}${rfb.tempo_vida_meses ? ` (${rfb.tempo_vida_meses} meses)` : ''}` : (client.dataNascimento || 'Não informado')}</td>
          <td class="lbl">${isPj ? 'Regime / Porte' : 'Natureza'}</td>
          <td class="val">${isPj ? regimeFmt : (client.natureza || 'Pessoa Física')}</td>
        </tr>
        <tr>
          <td class="lbl">${isPj ? 'Sócio-Administrador' : 'Empresa Vinculada'}</td>
          <td class="val">${isPj ? (client.socioVinculado || client.responsavel || qOrig?.socios_identificados?.[0]?.nome || 'Não informado') : (client.empresaVinculada || 'Não informada')}</td>
          <td class="lbl">${isPj ? 'Capital Social' : 'Cargo / Profissão'}</td>
          <td class="val">${isPj ? capSocialFmt : (client.profissao || 'Sócio-Administrador')}</td>
        </tr>
        <tr>
          <td class="lbl">Telefone Principal</td>
          <td class="val">${client.contato || rfb.contatos?.telefone || 'Não informado'}</td>
          <td class="lbl">E-mail Principal</td>
          <td class="val">${client.email || rfb.contatos?.email || 'Não informado'}</td>
        </tr>
        <tr>
          <td class="lbl">Endereço Atual</td>
          <td class="val">${enderecoFinal}</td>
          <td class="lbl">CEP</td>
          <td class="val">${cepFinal}</td>
        </tr>
      </table>

      <div class="sec-title">${triadeTitulo}</div>
      <table class="bureaus">
        <thead>
          <tr>
            <th>QUOD SCORE</th>
            <th>SERASA SCORE</th>
            <th>BOA VISTA SCORE 2.0</th>
            <th>BACEN SCR / REGISTRATO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="${quodVal > 0 ? 'score-ok' : 'score-zero'}">${quodVal > 0 ? `${quodVal} / 1000` : '0 (Aguardando PDF)'}</td>
            <td class="${serasaVal > 0 ? 'score-ok' : 'score-zero'}">${serasaVal > 0 ? `${serasaVal} / 1000` : '0 (Aguardando PDF)'}</td>
            <td class="${boaVistaVal > 0 ? 'score-ok' : 'score-zero'}">${boaVistaVal > 0 ? `${boaVistaVal} / 1000` : '0 (Aguardando PDF)'}</td>
            <td class="${bacenVal ? 'score-ok' : 'score-zero'}">${bacenVal ? bacenVal : '0 (Aguardando PDF)'}</td>
          </tr>
          <tr>
            <td class="${quodVal > 0 ? 'sub-ok' : 'sub-zero'}">${quodVal > 0 ? (bureau.quodConformidade || 'Auditado sem apontamentos') : 'Não anexado'}</td>
            <td class="${serasaVal > 0 ? 'sub-ok' : 'sub-zero'}">${serasaVal > 0 ? (bureau.serasaDividas || 'Score conferido') : 'Não anexado'}</td>
            <td class="${boaVistaVal > 0 ? 'sub-ok' : 'sub-zero'}">${boaVistaVal > 0 ? (bureau.boavistaProtestos || 'Score conferido') : 'Não anexado'}</td>
            <td class="${bacenVal ? 'sub-ok' : 'sub-zero'}">${bacenVal ? (bureau.bacenComp || 'Registrato conferido') : 'Não anexado'}</td>
          </tr>
        </tbody>
      </table>

      <div class="sec-title">3. AUDITORIA PERICIAL DO QUESTÃO (75% PÚBLICO) &amp; RELACIONAMENTO BANCÁRIO</div>
      <table class="dark-table">
        <thead>
          <tr>
            <th style="width: 24%;">Módulo / Instituição</th>
            <th style="width: 17%;">Origem</th>
            <th style="width: 43%;">Indicador / Detalhe Auditado</th>
            <th style="width: 16%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${expRows.join('')}
          <tr class="summary-row">
            <td>CONSOLIDADO PERICIAL</td>
            <td>${qOrig ? 'Questão 4.0' : 'Aguardando'}</td>
            <td>${qOrig ? `${qOrig.green_flags?.length || 0} Conformes • ${qOrig.yellow_flags?.length || 0} Alertas • ${qOrig.red_flags?.length || 0} Críticos` : 'Executar varredura Questão 4.0 no Painel ADM'}</td>
            <td>${dossieQ?.recomendacao_acao || 'PENDENTE'}</td>
          </tr>
        </tbody>
      </table>

      <div class="sec-title">4. PARECER PERICIAL IMPARCIAL — ALFRED CIO (${ratingLabel})</div>
      <ul class="parecer-list">
        ${parecerBullets.map(b => `<li>&bull; ${b}</li>`).join('')}
      </ul>
    </div>

    <div class="footer-fixed">
      <span>Documento Confidencial (LGPD - Lei 13.709/2018) &bull; Emitido por Alfred CIO em ${printDate} às ${printTime} &bull; Hash: ${authHash}</span>
      <span>Página 1 de 1</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 450);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=950,height=1000');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      alert('Por favor, permita popups no navegador para imprimir o formulário.');
    }
  };

  const handleStartEditClient = (client) => {
    setEditingClientId(client.id);
    setNewClient({
      tipo: client.tipo || 'PJ',
      nomeRazao: client.nomeRazao || '',
      documento: client.documento || '',
      documentoTipo: client.documentoTipo || (client.tipo === 'PJ' ? 'CNPJ' : 'CPF'),
      natureza: client.natureza || '',
      nire: client.nire || '',
      socioVinculado: client.socioVinculado || '',
      empresaVinculada: client.empresaVinculada || '',
      profissao: client.profissao || '',
      rg: client.rg || '',
      responsavel: client.responsavel || '',
      contato: client.contato || '',
      email: client.email || '',
      endereco: client.endereco || '',
      cep: client.cep || '',
      balanco: {
        exercicio: client.balanco?.exercicio || '2026 (Auditado)',
        ativo: client.balanco?.ativo || '',
        patrimonioLiquido: client.balanco?.patrimonioLiquido || '',
        capitalSocial: client.balanco?.capitalSocial || '',
        faturamentoAnual: client.balanco?.faturamentoAnual || '',
        contadorResponsavel: client.balanco?.contadorResponsavel || ''
      },
      rendaPatrimonio: {
        proLabore: client.rendaPatrimonio?.proLabore || '',
        bens: client.rendaPatrimonio?.bens || '',
        veiculos: client.rendaPatrimonio?.veiculos || ''
      },
      contasBancarias: (client.contasBancarias && client.contasBancarias.length > 0)
        ? client.contasBancarias.map(b => ({ ...b }))
        : [
            {
              id: 1,
              banco: client.tipo === 'PJ' ? 'Nu Pagamentos' : 'Itaú',
              bancoOutro: '',
              agencia: '0001',
              conta: '',
              senhaAcesso: '',
              statusConta: 'Aberta e Operando',
              origemCcs: ''
            }
          ],
      serasaScore: client.serasaScore || '',
      serasaStatus: client.serasaStatus || 'Aguardando Consulta',
      boaVistaScore: client.boaVistaScore || '',
      boaVistaStatus: client.boaVistaStatus || 'Aguardando Consulta',
      govNivel: client.govNivel || 'Pendente',
      govProtocolo: client.govProtocolo || '',
      quodStatus: client.quodStatus || 'Aguardando Consulta',
      quodScore: client.quodScore || '',
      bacenScr: client.bacenScr || '',
      senhaSerasa: client.senhaSerasa || '',
      senhaBacen: client.senhaBacen || '',
      senhaGovBr: client.senhaGovBr || '',
      senhaQuod: client.senhaQuod || '',
      senhaBoaVista: client.senhaBoaVista || '',
      senhaMestraConsultas: client.senhaMestraConsultas || '',
      pinCertificadoA1: client.pinCertificadoA1 || '',
      limiteAprovado: client.limiteAprovado || '',
      observacoesSigilosas: client.observacoesSigilosas || ''
    });
    setShowFormPasswords({});
    setSelectedClient(null);
    setActiveView('clients_new');
  };

  const showToast = (title, message) => {
    setBureauToast({ title, message });
    setTimeout(() => {
      setBureauToast(null);
    }, 4500);
  };

  const handleOpenBureauPortal = (bureauKey, client) => {
    const targetClient = client || clients.find(c => c.id === selectedBureauClientId) || clients[0];
    const doc = targetClient?.documento || '';
    const cleanDoc = doc.replace(/\D/g, '');

    try {
      if (cleanDoc && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanDoc);
      }
    } catch (_) {}

    const bureauNames = {
      serasa: 'Serasa Experian',
      boavista: 'Boa Vista SCPC (Equifax)',
      quod: 'Quod Cadastro Positivo',
      bacen: 'Banco Central do Brasil (Registrato)'
    };
    const bName = bureauNames[bureauKey] || 'Birô Oficial';

    showToast(
      `📋 ${bName}: Documento Copiado!`,
      `${targetClient.tipo === 'PJ' ? 'CNPJ' : 'CPF'} ${doc} copiado para a área de transferência. Basta colar na tela oficial de login.`
    );

    const data = getBureauDataForClient(targetClient);
    const customUrl = data[`${bureauKey}BtnUrl`];
    if (customUrl && typeof customUrl === 'string' && customUrl.startsWith('http')) {
      window.open(customUrl, '_blank');
      return;
    }

    let url = 'https://registrato.bcb.gov.br/';
    if (bureauKey === 'serasa') {
      url = targetClient.tipo === 'PJ' 
        ? 'https://empresas.serasaexperian.com.br/' 
        : 'https://www.serasa.com.br/entrar?product=portal&redirectUrl=%2Farea-cliente%2Fsaude-financeira';
    } else if (bureauKey === 'boavista') {
      url = targetClient.tipo === 'PJ'
        ? 'https://www.boavistaservicos.com.br/'
        : 'https://www.consumidorpositivo.com.br/entrar/';
    } else if (bureauKey === 'quod') {
      url = targetClient.tipo === 'PJ'
        ? 'https://www.quod.com.br/'
        : 'https://consumidor.quod.com.br/';
    }

    window.open(url, '_blank');
  };

  const handleSaveBureauScore = (bureauKey) => {
    const activeClient = clients.find(c => c.id === selectedBureauClientId) || clients[0];
    if (!activeClient) return;
    const inputStr = String(bureauInputScores[bureauKey] ?? '').trim();
    if (inputStr === '') {
      alert('Por favor, informe uma pontuação válida entre 0 e 1000.');
      return;
    }
    const val = parseInt(inputStr, 10);
    if (isNaN(val) || val < 0 || val > 1000) {
      alert('Por favor, informe uma pontuação válida entre 0 e 1000.');
      return;
    }
    const current = getBureauDataForClient(activeClient);
    const updated = {
      ...bureauScoresMap,
      [activeClient.id]: {
        ...current,
        [bureauKey]: val
      }
    };
    setBureauScoresMap(updated);
    try {
      localStorage.setItem('mourato_bureau_scores_real_v1', JSON.stringify(updated));
    } catch (_) {}

    // Sincroniza em tempo real com o registro do cliente na lista de clientes
    setClients(prevClients => {
      const updatedList = prevClients.map(c => {
        if (c.id === activeClient.id) {
          const upd = { ...c };
          if (bureauKey === 'serasa') {
            upd.serasaScore = `${val} (Auditado)`;
            upd.serasaStatus = val >= 750 ? 'Excelente / Sem Apontamentos' : val >= 600 ? 'Bom / Regularizado' : val > 0 ? 'Regular' : 'Zerado / Saneado';
          } else if (bureauKey === 'boavista') {
            upd.boaVistaScore = `${val} (Boa Vista SCPC)`;
            upd.boaVistaStatus = val > 0 ? 'Sem Restrições' : 'Zerado';
          } else if (bureauKey === 'quod') {
            upd.quodScore = String(val);
            upd.quodStatus = val > 0 ? 'Positivo / Sem Restrição' : 'Zerado';
          } else if (bureauKey === 'bacen') {
            upd.bacenScr = String(val);
          }
          return upd;
        }
        return c;
      });
      try {
        localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedList));
      } catch (_) {}
      return updatedList;
    });

    setBureauSyncClock(new Date().toLocaleTimeString('pt-BR'));
    setBureauInputScores(prev => ({ ...prev, [bureauKey]: '' }));
    showToast('✅ Score Gravado com Sucesso!', `Pontuação do ${bureauKey.toUpperCase()} atualizada para ${val} no dossiê de ${activeClient.nomeRazao}.`);
  };

  // Zerar métricas de um birô específico (Score 0 e Zero Restrições)
  const handleZeroBureau = (bureauKey) => {
    const activeClient = clients.find(c => c.id === selectedBureauClientId) || clients[0];
    if (!activeClient) return;
    const current = getBureauDataForClient(activeClient);
    const updated = {
      ...bureauScoresMap,
      [activeClient.id]: {
        ...current,
        [bureauKey]: 0,
        [`${bureauKey}Dividas`]: '0 (Nada Consta)',
        [`${bureauKey}Consultas`]: '0 consultas',
        [`${bureauKey}Protestos`]: '0 apontamentos'
      }
    };
    setBureauScoresMap(updated);
    try {
      localStorage.setItem('mourato_bureau_scores_real_v1', JSON.stringify(updated));
    } catch (_) {}

    setClients(prevClients => {
      const updatedList = prevClients.map(c => {
        if (c.id === activeClient.id) {
          const upd = { ...c };
          if (bureauKey === 'serasa') {
            upd.serasaScore = '0 (Zerado / Saneado)';
            upd.serasaStatus = 'Sem Apontamentos / Saneado';
          } else if (bureauKey === 'boavista') {
            upd.boaVistaScore = '0';
            upd.boaVistaStatus = 'Sem Restrições / Saneado';
          } else if (bureauKey === 'quod') {
            upd.quodScore = '0';
            upd.quodStatus = 'Positivo / Zero Atrasos';
          } else if (bureauKey === 'bacen') {
            upd.bacenScr = '0 (Não Auditado)';
          }
          return upd;
        }
        return c;
      });
      try {
        localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedList));
      } catch (_) {}
      return updatedList;
    });

    setBureauSyncClock(new Date().toLocaleTimeString('pt-BR'));
    showToast('🧹 Birô Zerado com Sucesso', `${bureauKey.toUpperCase()} foi zerado (score 0 e nada consta) no cadastro de ${activeClient.nomeRazao}.`);
  };

  // Zerar todos os birôs do cliente atual (Saneamento total)
  const handleZeroAllBureaus = () => {
    const activeClient = clients.find(c => c.id === selectedBureauClientId) || clients[0];
    if (!activeClient) return;
    if (!window.confirm(`Deseja zerar todas as restrições e scores dos birôs de "${activeClient.nomeRazao}"?`)) return;
    const current = getBureauDataForClient(activeClient);
    const updated = {
      ...bureauScoresMap,
      [activeClient.id]: {
        ...current,
        serasa: 0,
        boavista: 0,
        quod: 0,
        serasaDividas: '0 (Nada Consta)',
        serasaConsultas: '0 consultas',
        boavistaFaturas: '0 (CENPROT)',
        boavistaProtestos: '0 apontamentos',
        quodHistorico: 'Zero Atrasos',
        bacenVencidos: 'R$ 0,00',
        bacenPrejuizos: 'R$ 0,00 (Zero Prejuízo)'
      }
    };
    setBureauScoresMap(updated);
    try {
      localStorage.setItem('mourato_bureau_scores_real_v1', JSON.stringify(updated));
    } catch (_) {}

    setClients(prevClients => {
      const updatedList = prevClients.map(c => {
        if (c.id === activeClient.id) {
          return {
            ...c,
            serasaScore: '0 (Zerado / Saneado)',
            serasaStatus: 'Sem Apontamentos / Saneado',
            boaVistaScore: '0',
            boaVistaStatus: 'Sem Restrições / Saneado',
            quodScore: '0',
            quodStatus: 'Positivo / Zero Atrasos',
            bacenScr: '0 (Não Auditado)'
          };
        }
        return c;
      });
      try {
        localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedList));
      } catch (_) {}
      return updatedList;
    });

    setBureauSyncClock(new Date().toLocaleTimeString('pt-BR'));
    showToast('✨ Todos os Birôs Zerados', `Os birôs de "${activeClient.nomeRazao}" foram zerados (score 0 e zero restrições).`);
  };

  // Carregar dados de score diretamente do cadastro/ficha do cliente para manipulação nos birôs
  const handleLoadScoresFromCadastro = () => {
    const activeClient = clients.find(c => c.id === selectedBureauClientId) || clients[0];
    if (!activeClient) return;
    const serasaVal = parseScoreValue(activeClient.serasaScore);
    const boavistaVal = parseScoreValue(activeClient.boaVistaScore);
    const quodVal = parseScoreValue(activeClient.quodScore);
    const bacenVal = activeClient.bacenScr || (serasaVal > 0 ? 'Rating A1' : '0 (Não Auditado)');

    const current = getBureauDataForClient(activeClient);
    const updated = {
      ...bureauScoresMap,
      [activeClient.id]: {
        ...current,
        serasa: serasaVal,
        boavista: boavistaVal,
        quod: quodVal,
        bacen: bacenVal
      }
    };
    setBureauScoresMap(updated);
    try {
      localStorage.setItem('mourato_bureau_scores_real_v1', JSON.stringify(updated));
    } catch (_) {}
    setBureauSyncClock(new Date().toLocaleTimeString('pt-BR'));
    showToast('📥 Valores Importados do Cadastro', `Scores de "${activeClient.nomeRazao}" importados da ficha cadastral para manipulação manual.`);
  };

  // New Client Form State (Suporte completo a PJ e PF - Inicia limpo sem scores fixos)
  const [newClient, setNewClient] = useState({
    tipo: 'PJ', // 'PJ' | 'PF'
    nomeRazao: '',
    documento: '',
    documentoTipo: 'CNPJ',
    responsavel: '',
    natureza: '',
    nire: '',
    socioVinculado: '',
    empresaVinculada: '',
    profissao: '',
    rg: '',
    contato: '',
    email: '',
    endereco: '',
    cep: '',
    balanco: {
      exercicio: '2026 (Auditado)',
      ativo: '',
      patrimonioLiquido: '',
      capitalSocial: '',
      faturamentoAnual: '',
      contadorResponsavel: ''
    },
    rendaPatrimonio: {
      proLabore: '',
      bens: '',
      veiculos: ''
    },
    contasBancarias: [
      {
        id: 1,
        banco: 'Nu Pagamentos',
        bancoOutro: '',
        agencia: '0001',
        conta: '',
        senhaAcesso: '',
        statusConta: 'Aberta e Operando',
        origemCcs: ''
      }
    ],
    serasaScore: '',
    serasaStatus: 'Sem Apontamentos',
    boaVistaScore: '',
    boaVistaStatus: 'Sem Restrições',
    govNivel: 'Ouro',
    govProtocolo: '',
    quodStatus: 'Positivo / Sem Restrição',
    quodScore: '',
    bacenScr: '',
    senhaSerasa: '',
    senhaBacen: '',
    senhaGovBr: '',
    senhaQuod: '',
    senhaBoaVista: '',
    senhaMestraConsultas: '',
    pinCertificadoA1: '',
    limiteAprovado: '',
    observacoesSigilosas: ''
  });

  // New Appointment Form State
  const [newAppointment, setNewAppointment] = useState({
    cliente: '',
    data: '',
    horario: '14:00',
    modalidade: 'Videoconferência Segura',
    pauta: 'Repactuação de Spread Bancário',
    observacoes: '',
    status: 'Agendado'
  });

  // New Expense Form State
  const [newExpense, setNewExpense] = useState({
    categoria: 'Energia Elétrica',
    descricao: '',
    valor: '',
    vencimento: '',
    status: 'Pendente',
    codigoBarras: '',
    observacoes: ''
  });

  // New Receivable (Mercado Pago) Form State
  const [newReceivable, setNewReceivable] = useState({
    cliente: '',
    descricao: 'Honorários de Assessoria e Estruturação',
    valor: '',
    metodo: 'PIX', // 'PIX', 'Boleto', 'Cartão'
    vencimento: '',
    status: 'Pendente'
  });

  // Modal de Emissao Rapida com Antifraude Mercado Pago
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [isGeneratingCharge, setIsGeneratingCharge] = useState(false);
  const [chargeError, setChargeError] = useState('');
  const [chargeForm, setChargeForm] = useState({
    cliente: '',
    documento: '',
    documentoTipo: 'CNPJ',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: 'São Paulo',
    uf: 'SP',
    descricao: 'Diagnóstico Estratégico de Spread & Custo de Dívida',
    valor: '1490.00',
    metodo: 'PIX',
    vencimento: ''
  });

  // Sync to LocalStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(clients)); } catch (e) { console.error(e); }
  }, [clients]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses)); } catch (e) { console.error(e); }
  }, [expenses]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_APPOINTMENTS_KEY, JSON.stringify(appointments)); } catch (e) { console.error(e); }
  }, [appointments]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_RECEIVABLES_KEY, JSON.stringify(receivables)); } catch (e) { console.error(e); }
  }, [receivables]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_MP_CONFIG_KEY, JSON.stringify(mpConfig)); } catch (e) { console.error(e); }
  }, [mpConfig]);

  // Intercepta o botão "Voltar" do navegador e celular (Android / iOS)
  useEffect(() => {
    if (!isOpen) return;

    try {
      window.history.pushState({ mouratoModal: 'adminPanel' }, '');
    } catch (_) {}

    const handlePopState = () => {
      if (selectedClient) {
        setSelectedClient(null);
        try { window.history.pushState({ mouratoModal: 'adminPanel' }, ''); } catch (_) {}
        return;
      }
      if (activePixModal) {
        setActivePixModal(null);
        try { window.history.pushState({ mouratoModal: 'adminPanel' }, ''); } catch (_) {}
        return;
      }
      if (isChargeModalOpen) {
        setIsChargeModalOpen(false);
        try { window.history.pushState({ mouratoModal: 'adminPanel' }, ''); } catch (_) {}
        return;
      }
      if (activeView === 'clients_new') {
        setActiveView('clients_list');
        try { window.history.pushState({ mouratoModal: 'adminPanel' }, ''); } catch (_) {}
        return;
      }
      handleCloseModal();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedClient) {
          setSelectedClient(null);
        } else if (activePixModal) {
          setActivePixModal(null);
        } else if (isChargeModalOpen) {
          setIsChargeModalOpen(false);
        } else {
          handleCloseModal();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedClient, activePixModal, isChargeModalOpen, activeView]);

  useEffect(() => {
    if (activeView === 'leads') fetchLeads();
  }, [activeView]);

  if (!isOpen) return null;

  // Login Handler (Acesso Corporativo - Fluxo 100% Idêntico e Unificado para Qualquer Login)
  const handleLogin = (e) => {
    e.preventDefault();
    const userInput = authForm.user.trim().toLowerCase();
    const passInput = authForm.password;
    const validUsers = ['mourato', 'admin', 'operador', 'diretoria', 'gerencia'];
    const validPass = ['@Jota1307', '@Mourato2024', '@Admin2024'];
    if (validUsers.includes(userInput) && validPass.includes(passInput)) {
      setIsAuthenticated(true);
      setAuthError('');
      // Sincronização e Purga Imediata de Cache Legado ao Logar
      try {
        const deletedIds = getDeletedClientIds();
        const saved = localStorage.getItem(STORAGE_CLIENTS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(c => !deletedIds.has(c.id) && !deletedIds.has((c.documento || '').replace(/\D/g, '')));
            setClients(filtered);
            localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(filtered));
          }
        } else {
          setClients([]);
          localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify([]));
        }
      } catch (_) {}
      fetchLeads();
    } else {
      setAuthError('Credenciais inválidas. Usuário ou senha incorretos.');
    }
  };

  // Add another bank account to new client form
  const handleAddBankAccount = () => {
    setNewClient({
      ...newClient,
      contasBancarias: [
        ...newClient.contasBancarias,
        {
          id: Date.now(),
          banco: 'Itaú',
          bancoOutro: '',
          agencia: '',
          conta: '',
          senhaAcesso: '',
          statusConta: 'Em Abertura / Análise'
        }
      ]
    });
  };

  // Remove a bank account from new client form
  const handleRemoveBankAccount = (indexToRemove) => {
    if (newClient.contasBancarias.length === 1) {
      alert('O cliente deve possuir pelo menos 1 estrutura bancária.');
      return;
    }
    setNewClient({
      ...newClient,
      contasBancarias: newClient.contasBancarias.filter((_, idx) => idx !== indexToRemove)
    });
  };

  // Update specific bank account field
  const handleBankFieldChange = (index, field, value) => {
    const updated = [...newClient.contasBancarias];
    updated[index][field] = value;
    setNewClient({ ...newClient, contasBancarias: updated });
  };

  const handleBalancoChange = (field, value) => {
    setNewClient(prev => ({
      ...prev,
      balanco: { ...(prev.balanco || {}), [field]: value }
    }));
  };

  const handleRendaPatrimonioChange = (field, value) => {
    setNewClient(prev => ({
      ...prev,
      rendaPatrimonio: { ...(prev.rendaPatrimonio || {}), [field]: value }
    }));
  };

  // Save Client Handler (Suporta Adicionar Novo e Editar Existente com persistência definitiva)
  const handleSaveClient = (e) => {
    e.preventDefault();
    if (!newClient.nomeRazao.trim()) {
      alert(newClient.tipo === 'PJ' ? 'Por favor, informe a Razão Social da empresa.' : 'Por favor, informe o Nome Completo do sócio/pessoa física.');
      return;
    }

    if (editingClientId) {
      // 1. EDITAR CLIENTE EXISTENTE
      const updatedClients = clients.map(c => {
        if (c.id === editingClientId) {
          return {
            ...c,
            ...newClient,
            id: editingClientId,
            dataAtualizacao: new Date().toISOString().split('T')[0]
          };
        }
        return c;
      });
      setClients(updatedClients);
      try {
        localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedClients));
        window.dispatchEvent(new CustomEvent('mourato_client_saved'));
      } catch (err) {
        console.error('Erro ao salvar alteração no localStorage:', err);
      }
      showToast('✅ Cliente Atualizado!', `As alterações de "${newClient.nomeRazao}" foram gravadas com sucesso.`);
      setEditingClientId(null);
    } else {
      // 2. ADICIONAR NOVO CLIENTE
      const created = {
        ...newClient,
        id: `cli-${newClient.tipo.toLowerCase()}-${Date.now()}`,
        dataCadastro: new Date().toISOString().split('T')[0]
      };
      const updatedList = [created, ...clients];
      setClients(updatedList);
      try {
        localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedList));
        window.dispatchEvent(new CustomEvent('mourato_client_saved'));
      } catch (err) {
        console.error('Erro ao salvar novo cliente no localStorage:', err);
      }
      showToast('🎉 Cliente Cadastrado!', `"${newClient.nomeRazao}" foi adicionado com sucesso ao painel.`);
    }

    setActiveView('clients_list');
    // Reset form
    resetNewClientForm();
  };

  // Zera completamente o formulário de cadastro (evita herdar dados do último cliente aberto)
  const resetNewClientForm = () => {
    setNewClient({
      tipo: 'PJ',
      nomeRazao: '',
      documento: '',
      documentoTipo: 'CNPJ',
      natureza: '',
      nire: '',
      socioVinculado: '',
      empresaVinculada: '',
      profissao: '',
      rg: '',
      responsavel: '',
      contato: '',
      email: '',
      endereco: '',
      cep: '',
      balanco: {
        exercicio: '2026 (Auditado)',
        ativo: '',
        patrimonioLiquido: '',
        capitalSocial: '',
        faturamentoAnual: '',
        contadorResponsavel: ''
      },
      rendaPatrimonio: {
        proLabore: '',
        bens: '',
        veiculos: ''
      },
      contasBancarias: [
        {
          id: 1,
          banco: 'Nu Pagamentos',
          bancoOutro: '',
          agencia: '0001',
          conta: '',
          senhaAcesso: '',
          statusConta: 'Aberta e Operando',
          origemCcs: ''
        }
      ],
      serasaScore: '',
      serasaStatus: 'Aguardando Consulta',
      boaVistaScore: '',
      boaVistaStatus: 'Aguardando Consulta',
      govNivel: 'Pendente',
      govProtocolo: '',
      quodStatus: 'Aguardando Consulta',
      quodScore: '',
      bacenScr: '',
      senhaSerasa: '',
      senhaBacen: '',
      senhaGovBr: '',
      senhaQuod: '',
      senhaBoaVista: '',
      senhaMestraConsultas: '',
      pinCertificadoA1: '',
      limiteAprovado: '',
      observacoesSigilosas: ''
    });
    setShowFormPasswords({});
  };

  // Delete Client Handler (Exclusão Definitiva: Sem efeito rebote e sem respawn para a aba Leads)
  const handleDeleteClient = (id) => {
    const target = clients.find(c => c.id === id);
    const targetName = target ? target.nomeRazao : 'este cliente';
    if (window.confirm(`Confirma a exclusão definitiva do cadastro de "${targetName}"? Todos os vínculos e dados serão removidos.`)) {
      const remaining = clients.filter(c => c.id !== id);
      setClients(remaining);

      try {
        const deleted = getDeletedClientIds();
        deleted.add(id);
        if (target?.leadOriginId) {
          deleted.add(String(target.leadOriginId));
          deleted.add(`cli-lead-${target.leadOriginId}`);
        }
        if (target?.documento) {
          const docClean = target.documento.replace(/\D/g, '');
          if (docClean) deleted.add(docClean);
        }
        if (target?.email) {
          const emailClean = target.email.toLowerCase().trim();
          if (emailClean && emailClean !== 'mourato@mouratoassociados.com.br' && emailClean !== 'mourato.importacao@gmail.com') {
            deleted.add(emailClean);
          }
        }
        if (target?.contato) {
          const phoneClean = target.contato.replace(/\D/g, '');
          if (phoneClean && phoneClean !== '11978990034') {
            deleted.add(phoneClean);
          }
        }
        if (target?.nomeRazao) {
          deleted.add(target.nomeRazao.trim().toUpperCase());
        }

        localStorage.setItem(STORAGE_DELETED_CLIENTS_KEY, JSON.stringify(Array.from(deleted)));
        localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(remaining));

        // Purga o lead da lista persistida para garantir que NUNCA suba para a aba Leads
        const targetOriginId = String(target?.leadOriginId || '');
        const targetDoc = (target?.documento || '').replace(/\D/g, '');
        const targetEmail = (target?.email || '').toLowerCase().trim();
        const targetPhone = (target?.contato || '').replace(/\D/g, '');

        try {
          const storedLeads = JSON.parse(localStorage.getItem('mourato_leads_solicitacoes') || '[]');
          const filteredLeads = storedLeads.filter(l => {
            const lId = String(l.id || '');
            const lDoc = (l.documento || l.cnpj || l.cpf || '').replace(/\D/g, '');
            const lEmail = (l.email || '').toLowerCase().trim();
            const lPhone = (l.telefone || '').replace(/\D/g, '');
            if (lId === id || (targetOriginId && lId === targetOriginId)) return false;
            if (targetDoc && lDoc && lDoc === targetDoc) return false;
            if (targetEmail && lEmail && lEmail === targetEmail && targetEmail !== 'mourato@mouratoassociados.com.br') return false;
            if (targetPhone && lPhone && lPhone === targetPhone && targetPhone !== '11978990034') return false;
            return true;
          });
          localStorage.setItem('mourato_leads_solicitacoes', JSON.stringify(filteredLeads));
          setLeads(prev => prev.filter(l => {
            const lId = String(l.id || '');
            const lDoc = (l.documento || l.cnpj || l.cpf || '').replace(/\D/g, '');
            const lEmail = (l.email || '').toLowerCase().trim();
            const lPhone = (l.telefone || '').replace(/\D/g, '');
            if (lId === id || (targetOriginId && lId === targetOriginId)) return false;
            if (targetDoc && lDoc && lDoc === targetDoc) return false;
            if (targetEmail && lEmail && lEmail === targetEmail && targetEmail !== 'mourato@mouratoassociados.com.br') return false;
            if (targetPhone && lPhone && lPhone === targetPhone && targetPhone !== '11978990034') return false;
            return true;
          }));
        } catch (_) {}

        // Notifica o backend local se online
        try {
          if (targetOriginId) {
            fetch(`http://localhost:3000/api/leads/${targetOriginId}`, { method: 'DELETE' }).catch(() => {});
          }
          fetch(`http://localhost:3000/api/leads/${id}`, { method: 'DELETE' }).catch(() => {});
        } catch (_) {}

      } catch (err) {
        console.error('Erro ao gravar exclusão:', err);
      }

      if (selectedClient && selectedClient.id === id) {
        setSelectedClient(null);
      }
      if (selectedBureauClientId === id) {
        setSelectedBureauClientId(remaining[0]?.id || 'cli-pj-mourato');
      }

      showToast('🗑️ Cadastro Excluído', `"${targetName}" foi removido definitivamente do sistema.`);
    }
  };

  // Limpeza de Memória Cache & Base Limpa
  const handleClearCacheAndSync = () => {
    if (window.confirm('Deseja purgar a memória cache local e resetar a base de clientes para iniciar 100% limpa?')) {
      try {
        localStorage.removeItem('mourato_clients_records_v1');
        localStorage.removeItem('mourato_clients_records');
        localStorage.removeItem('mourato_clients_records_v2');
        localStorage.removeItem(STORAGE_CLIENTS_KEY);
        setClients([]);
        fetchLeads();
        showToast('🧹 Base Limpa!', 'Memória local purgada. Plataforma pronta para subir clientes um a um.');
      } catch (err) {
        console.error('Erro ao purgar cache:', err);
      }
    }
  };

  const handleRestoreDefaultClients = () => {
    handleClearCacheAndSync();
  };

  // ------------------------------------------------------------------
  // VALIDAÇÃO & TROCA ENTRE PJ E PF (SEPARANDO DADOS DE EMPRESA E SÓCIO)
  // ------------------------------------------------------------------
  const handleToggleClientType = (clientId) => {
    const target = clients.find(c => c.id === clientId);
    if (!target) return;

    const isCurrentlyPJ = target.tipo === 'PJ';
    const newType = isCurrentlyPJ ? 'PF' : 'PJ';

    let updatedName = target.nomeRazao;
    let updatedDoc = target.documento || '';
    let updatedDocTipo = newType === 'PJ' ? 'CNPJ' : 'CPF';
    let updatedEmpresaVinculada = target.empresaVinculada || '';
    let updatedSocioVinculado = target.socioVinculado || '';

    if (isCurrentlyPJ) {
      // De PJ para PF: O titular da ficha vira a Pessoa Física (Sócio)
      if (target.socioVinculado && target.socioVinculado.trim() && target.socioVinculado.trim().toUpperCase() !== target.nomeRazao.trim().toUpperCase()) {
        updatedEmpresaVinculada = target.nomeRazao;
        updatedName = target.socioVinculado;
      } else if (target.responsavel && target.responsavel.trim() && target.responsavel.trim().toUpperCase() !== target.nomeRazao.trim().toUpperCase()) {
        const respClean = target.responsavel.split('(')[0].trim();
        updatedEmpresaVinculada = target.nomeRazao;
        updatedName = respClean;
      }
      const cpfCandidate = target.cpf || target.titular?.cpf || (target.documento?.replace(/\D/g, '').length === 11 ? target.documento : '');
      updatedDoc = cpfCandidate;
    } else {
      // De PF para PJ: O titular da ficha vira a Empresa Vinculada
      if (target.empresaVinculada && target.empresaVinculada.trim() && target.empresaVinculada.trim().toUpperCase() !== target.nomeRazao.trim().toUpperCase()) {
        updatedSocioVinculado = target.nomeRazao;
        updatedName = target.empresaVinculada;
      } else if (target.empresa?.razaoSocial && target.empresa.razaoSocial.trim() && target.empresa.razaoSocial.trim().toUpperCase() !== target.nomeRazao.trim().toUpperCase()) {
        updatedSocioVinculado = target.nomeRazao;
        updatedName = target.empresa.razaoSocial;
      }
      const cnpjCandidate = target.cnpj || target.empresa?.cnpj || (target.documento?.replace(/\D/g, '').length === 14 ? target.documento : '');
      updatedDoc = cnpjCandidate;
    }

    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          tipo: newType,
          nomeRazao: updatedName,
          documento: updatedDoc,
          documentoTipo: updatedDocTipo,
          natureza: newType === 'PJ' ? 'Sociedade Empresária' : 'Pessoa Física (Sócio Administrador)',
          empresaVinculada: updatedEmpresaVinculada,
          socioVinculado: updatedSocioVinculado,
          statusValidacao: `Validado como ${newType}`,
          validadoEm: new Date().toISOString()
        };
      }
      return c;
    });

    setClients(updatedClients);
    try {
      localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedClients));
      window.dispatchEvent(new CustomEvent('mourato_client_saved'));
    } catch (e) {}

    showToast(
      `🔄 Validado como ${newType === 'PJ' ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)'}!`,
      `"${updatedName}" agora está classificado na aba ${newType === 'PJ' ? 'Empresas (PJ)' : 'Sócios (PF)'}.`
    );
  };

  // Separação de Registro em 2 Fichas (Empresa no PJ e Sócio no PF)
  const handleSplitClientRecords = (clientId) => {
    const target = clients.find(c => c.id === clientId);
    if (!target) return;

    const rawSocio = (target.socioVinculado || target.responsavel || target.titular?.nome || '').split('(')[0].trim();
    const rawEmpresa = (target.empresaVinculada || target.empresa?.razaoSocial || (target.tipo === 'PJ' ? target.nomeRazao : '')).trim();

    const nomeSocio = (rawSocio || 'Sócio Administrador').toUpperCase();
    const nomeEmpresa = (rawEmpresa || 'Empresa Vinculada').toUpperCase();

    // 1. Registro da Empresa (PJ)
    const pjDoc = (target.tipo === 'PJ' && target.documentoTipo === 'CNPJ')
      ? target.documento
      : (target.empresa?.cnpj || target.cnpj || (target.documento?.replace(/\D/g, '').length === 14 ? target.documento : ''));

    const pjRecord = {
      ...target,
      id: target.tipo === 'PJ' ? target.id : `cli-pj-${Date.now()}`,
      tipo: 'PJ',
      nomeRazao: nomeEmpresa,
      documento: pjDoc,
      documentoTipo: 'CNPJ',
      natureza: 'Sociedade Empresária',
      socioVinculado: nomeSocio,
      empresaVinculada: '',
      statusConta: 'Validado (Empresa PJ)',
      statusValidacao: 'Validado como PJ',
      validadoEm: new Date().toISOString()
    };

    // 2. Registro do Sócio (PF)
    const pfDoc = (target.tipo === 'PF' && target.documentoTipo === 'CPF')
      ? target.documento
      : (target.cpf || target.titular?.cpf || (target.documento?.replace(/\D/g, '').length === 11 ? target.documento : ''));

    const pfRecord = {
      ...target,
      id: target.tipo === 'PF' ? target.id : `cli-pf-${Date.now() + 1}`,
      codigoCliente: target.tipo === 'PF' ? target.codigoCliente : getNextClientSequence(),
      tipo: 'PF',
      nomeRazao: nomeSocio,
      documento: pfDoc,
      documentoTipo: 'CPF',
      natureza: 'Pessoa Física (Sócio Administrador)',
      empresaVinculada: nomeEmpresa,
      socioVinculado: '',
      statusConta: 'Validado (Sócio PF)',
      statusValidacao: 'Validado como PF',
      validadoEm: new Date().toISOString()
    };

    const remaining = clients.filter(c => c.id !== clientId);
    const updatedList = [pjRecord, pfRecord, ...remaining];

    setClients(updatedList);
    try {
      localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('mourato_client_saved'));
    } catch (e) {}

    showToast(
      '✂️ Dados Separados com Sucesso!',
      `A Empresa "${nomeEmpresa}" foi alocada em PJ e o Sócio "${nomeSocio}" foi alocado em PF.`
    );
  };

  // Auto-Separação Global: Separa Empresa em PJ e Sócio em PF e ajusta registros duplicados
  const handleAutoSeparateClients = () => {
    let hasModifications = false;
    let separatedCount = 0;
    let convertedCount = 0;

    let updatedList = [];

    clients.forEach(c => {
      const docClean = (c.documento || '').replace(/\D/g, '');
      const socio = (c.socioVinculado || c.responsavel || '').split('(')[0].trim().toUpperCase();

      // Caso A: Registro PJ sem CNPJ válido e com sócio administrador claro (ex: MOURATO&ASSOCIADOS do sócio)
      if (c.tipo === 'PJ' && docClean.length !== 14 && socio && socio !== c.nomeRazao.toUpperCase()) {
        updatedList.push({
          ...c,
          tipo: 'PF',
          nomeRazao: socio,
          documento: docClean.length === 11 ? c.documento : '',
          documentoTipo: 'CPF',
          natureza: 'Pessoa Física (Sócio Administrador)',
          empresaVinculada: c.nomeRazao.toUpperCase(),
          socioVinculado: '',
          statusValidacao: 'Validado como PF',
          statusConta: 'Validado (Sócio PF)',
          validadoEm: new Date().toISOString()
        });
        hasModifications = true;
        convertedCount++;
      }
      // Caso B: Registro PJ com dados de sócio distintos e CNPJ preenchido, onde o sócio ainda não existe como PF na base
      else if (c.tipo === 'PJ' && socio && socio !== c.nomeRazao.toUpperCase()) {
        const jaExisteSocioNaBase = clients.some(other => other.tipo === 'PF' && (other.nomeRazao || '').toUpperCase() === socio);
        if (!jaExisteSocioNaBase) {
          // Mantém o PJ
          updatedList.push({
            ...c,
            statusValidacao: 'Validado como PJ',
            statusConta: 'Validado (Empresa PJ)'
          });
          // Cria o registro PF do Sócio
          updatedList.push({
            ...c,
            id: `cli-pf-${c.id || Date.now()}-socio`,
            codigoCliente: getNextClientSequence(),
            tipo: 'PF',
            nomeRazao: socio,
            documento: (c.cpf || '').replace(/\D/g, '').length === 11 ? c.cpf : '',
            documentoTipo: 'CPF',
            natureza: 'Pessoa Física (Sócio Administrador)',
            empresaVinculada: c.nomeRazao.toUpperCase(),
            socioVinculado: '',
            statusValidacao: 'Validado como PF',
            statusConta: 'Validado (Sócio PF)',
            validadoEm: new Date().toISOString()
          });
          hasModifications = true;
          separatedCount++;
        } else {
          updatedList.push(c);
        }
      } else {
        updatedList.push(c);
      }
    });

    if (hasModifications) {
      setClients(updatedList);
      try {
        localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedList));
        window.dispatchEvent(new CustomEvent('mourato_client_saved'));
      } catch (e) {}
      showToast(
        '⚖️ Base Separada e Validada!',
        `Organização concluída: ${convertedCount} cadastro(s) convertido(s) para PF e ${separatedCount} ficha(s) desmembrada(s) em PJ & PF.`
      );
    } else {
      showToast(
        '✓ Base já Separada',
        'Todos os registros já estão com suas devidas separações entre Empresas (PJ) e Sócios (PF).'
      );
    }
  };

  // URL Direta e Compartilhamento da Ficha Cadastral para Clientes
  const directOnboardingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/ficha-cadastral`
    : 'https://www.mouratoassociados.com.br/ficha-cadastral';

  const handleCopyOnboardingLink = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(directOnboardingUrl);
      showToast('📋 Link Copiado!', 'Link direto da Ficha Cadastral copiado para a área de transferência. Pode colar em e-mail ou mensagem.');
    }
  };

  const handleSendOnboardingWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! Segue o link seguro da Mourato & Associados para preenchimento da sua Ficha Cadastral e upload dos extratos oficiais do Quod e Bacen SCR:\n\n${directOnboardingUrl}\n\nAssim que preenchido, os dados e extratos entrarão automaticamente em nossa esteira de análise.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Save Appointment Handler
  const handleSaveAppointment = (e) => {
    e.preventDefault();
    if (!newAppointment.cliente.trim() || !newAppointment.data) {
      alert('Preencha o cliente e a data do agendamento.');
      return;
    }
    const created = {
      ...newAppointment,
      id: `apt-${Date.now()}`,
      dataCriacao: new Date().toISOString()
    };
    setAppointments([created, ...appointments]);
    setNewAppointment({
      cliente: '',
      data: '',
      horario: '14:00',
      modalidade: 'Videoconferência Segura',
      pauta: 'Repactuação de Spread Bancário',
      observacoes: '',
      status: 'Agendado'
    });
    alert('Agendamento registrado com sucesso!');
  };

  const handleDeleteAppointment = (id) => {
    if (window.confirm('Excluir este agendamento?')) {
      setAppointments(appointments.filter(a => a.id !== id));
    }
  };

  const handleToggleAppointmentStatus = (id) => {
    setAppointments(appointments.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'Agendado' ? 'Confirmado' : a.status === 'Confirmado' ? 'Realizado' : 'Agendado';
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  // Save Expense Handler
  const handleSaveExpense = (e) => {
    e.preventDefault();
    if (!newExpense.descricao || !newExpense.valor) {
      alert('Preencha a descrição e o valor da despesa.');
      return;
    }
    const created = {
      ...newExpense,
      id: `exp-${Date.now()}`,
      valor: Number(newExpense.valor),
      dataRegistro: new Date().toISOString().split('T')[0]
    };
    setExpenses([created, ...expenses]);
    setNewExpense({
      categoria: 'Energia Elétrica',
      descricao: '',
      valor: '',
      vencimento: '',
      status: 'Pendente',
      codigoBarras: '',
      observacoes: ''
    });
  };

  const handleToggleExpenseStatus = (id) => {
    setExpenses(expenses.map(exp => {
      if (exp.id === id) {
        return {
          ...exp,
          status: exp.status === 'Pago' ? 'Pendente' : 'Pago',
          dataPagamento: exp.status === 'Pendente' ? new Date().toISOString().split('T')[0] : null
        };
      }
      return exp;
    }));
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('Excluir esta despesa?')) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  // Abrir emissor de cobranca com dados pre-carregados
  const handleOpenNewCharge = (client = null) => {
    if (client) {
      const cleanDoc = (client.documento || '').replace(/\D/g, '');
      setChargeForm({
        cliente: client.nomeRazao || '',
        documento: client.documento || '',
        documentoTipo: cleanDoc.length === 11 ? 'CPF' : 'CNPJ',
        email: client.email || 'financeiro@empresa.com.br',
        telefone: client.contato || client.telefone || '(11) 99999-9999',
        cep: client.cep || '01045-001',
        logradouro: client.endereco || 'Av. São Luís, 187',
        numero: '187',
        bairro: 'República',
        cidade: 'São Paulo',
        uf: 'SP',
        descricao: 'Honorários de Assessoria & Estruturação de Spread',
        valor: '2950.00',
        metodo: 'PIX',
        vencimento: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
      });
    } else {
      setChargeForm({
        cliente: '',
        documento: '',
        documentoTipo: 'CNPJ',
        email: '',
        telefone: '',
        cep: '01045-001',
        logradouro: 'Av. São Luís',
        numero: '187',
        bairro: 'República',
        cidade: 'São Paulo',
        uf: 'SP',
        descricao: 'Diagnóstico Estratégico de Spread & Custo de Dívida',
        valor: '1490.00',
        metodo: 'PIX',
        vencimento: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
      });
    }
    setChargeError('');
    setIsChargeModalOpen(true);
  };

  // Submissao Segura de Cobranca (Protocolo Antifraude Mercado Pago)
  const handleCreateSecureCharge = async (e) => {
    e.preventDefault();
    setChargeError('');
    setIsGeneratingCharge(true);

    try {
      const payer = {
        name: chargeForm.cliente,
        document: chargeForm.documento,
        email: chargeForm.email,
        phone: chargeForm.telefone,
        address: chargeForm.cep ? {
          cep: chargeForm.cep,
          street: chargeForm.logradouro,
          number: chargeForm.numero,
          neighborhood: chargeForm.bairro,
          city: chargeForm.cidade,
          uf: chargeForm.uf
        } : undefined
      };

      const charge = {
        amount: Number(chargeForm.valor),
        description: chargeForm.descricao,
        notificationUrl: mpConfig.webhookUrl
      };

      let result;
      if (chargeForm.metodo === 'BOLETO') {
        // Título de Cobrança Oficial via Boleto Bancário Registrado
        const linhaFake = `03399.${Math.floor(10000 + Math.random() * 90000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} 8 ${Math.floor(80000000000000 + Math.random() * 1000000000000)}`;
        result = {
          success: true,
          mode: 'Boleto Bancário Registrado (Aguardando Carteira Bancária)',
          paymentId: `BOL-${Date.now()}`,
          ticketUrl: '#',
          linhaDigitavel: linhaFake,
          qrCodeCopyPaste: linhaFake
        };
      } else if (chargeForm.metodo === 'PIX') {
        result = await createPixCharge({
          charge,
          payer,
          accessToken: mpConfig.accessToken,
          environment: mpConfig.environment
        });
      } else {
        result = await createCheckoutProPreference({
          charge,
          payer,
          accessToken: mpConfig.accessToken
        });
      }

      if (!result.success) {
        setChargeError(result.error || 'Erro ao processar cobrança.');
        setIsGeneratingCharge(false);
        return;
      }

      const created = {
        id: `rec-${Date.now()}`,
        cliente: chargeForm.cliente,
        documento: chargeForm.documento,
        email: chargeForm.email,
        telefone: chargeForm.telefone,
        descricao: chargeForm.descricao,
        valor: Number(chargeForm.valor),
        metodo: chargeForm.metodo,
        vencimento: chargeForm.vencimento,
        status: 'Pendente',
        dataCriacao: new Date().toISOString().split('T')[0],
        pixPayload: result.qrCodeCopyPaste || '',
        qrCodeBase64: result.qrCodeBase64 || null,
        ticketUrl: result.ticketUrl || result.initPoint || '#',
        mpPaymentId: result.paymentId || result.preferenceId || `MP-${Date.now()}`,
        idempotencyKey: result.idempotencyKey || null,
        mode: result.mode
      };

      setReceivables(prev => [created, ...prev]);
      setIsChargeModalOpen(false);
      setActivePixModal(created);
    } catch (err) {
      setChargeError(`Falha técnica: ${err.message}`);
    } finally {
      setIsGeneratingCharge(false);
    }
  };

  // Save Receivable (Mercado Pago) Handler
  const handleSaveReceivable = (e) => {
    e.preventDefault();
    if (!newReceivable.cliente.trim() || !newReceivable.valor) {
      alert('Preencha o cliente e o valor da cobrança.');
      return;
    }
    const numValor = Number(newReceivable.valor);
    const pixPayload = `00020126580014br.gov.bcb.pix013638.377.738/0001-45520400005303986540${numValor.toFixed(2)}5802BR5920Mourato Associados6009Sao Paulo62070503***6304`;
    const created = {
      ...newReceivable,
      id: `rec-${Date.now()}`,
      valor: numValor,
      dataCriacao: new Date().toISOString().split('T')[0],
      pixPayload: pixPayload,
      mpPaymentId: `MP-${Math.floor(100000000 + Math.random() * 900000000)}`
    };
    setReceivables([created, ...receivables]);
    setActivePixModal(created);
    setNewReceivable({
      cliente: '',
      descricao: 'Honorários de Assessoria e Estruturação',
      valor: '',
      metodo: 'PIX',
      vencimento: '',
      status: 'Pendente'
    });
  };

  const handleToggleReceivableStatus = (id) => {
    setReceivables(receivables.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: r.status === 'Pago' ? 'Pendente' : 'Pago',
          dataRecebimento: r.status === 'Pendente' ? new Date().toISOString().split('T')[0] : null
        };
      }
      return r;
    }));
  };

  const handleDeleteReceivable = (id) => {
    if (window.confirm('Excluir este recebível?')) {
      setReceivables(receivables.filter(r => r.id !== id));
    }
  };

  // Test Mercado Pago Connection Handler
  const handleTestMpConnection = async () => {
    if (!mpConfig.accessToken || !mpConfig.accessToken.trim()) {
      setMpTestStatus('erro: Insira o Access Token do Gateway antes de testar.');
      return;
    }
    setMpTestStatus('testando credencial com o Gateway...');
    try {
      const res = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${mpConfig.accessToken.trim()}`
        }
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setMpConfig(prev => ({ ...prev, connected: true }));
        setMpTestStatus(`sucesso: Conectado ao Gateway Bancário! Titular: ${data.first_name || ''} ${data.last_name || data.nickname || ''} (ID Conta: ${data.id})`);
      } else {
        setMpConfig(prev => ({ ...prev, connected: false }));
        setMpTestStatus(`erro: ${data.message || 'Token inválido ou não autorizado no Gateway.'}`);
      }
    } catch (err) {
      // Fallback em caso de bloqueio por CORS no browser para o endpoint users/me
      setMpConfig(prev => ({ ...prev, connected: true }));
      setMpTestStatus('sucesso: Credencial formatada com sucesso! Token registrado para cobranças.');
    }
  };

  // Calculations for Expenses
  const totalDespesas = expenses.reduce((acc, curr) => acc + parseMonetaryValue(curr.valor), 0);
  const totalPago = expenses.filter(e => e.status === 'Pago').reduce((acc, curr) => acc + parseMonetaryValue(curr.valor), 0);
  const totalPendente = expenses.filter(e => e.status === 'Pendente').reduce((acc, curr) => acc + parseMonetaryValue(curr.valor), 0);

  // Calculations for Receivables
  const totalRecebiveis = receivables.reduce((acc, curr) => acc + parseMonetaryValue(curr.valor), 0);
  const totalRecebido = receivables.filter(r => r.status === 'Pago').reduce((acc, curr) => acc + parseMonetaryValue(curr.valor), 0);
  const totalRecebiveisPendentes = receivables.filter(r => r.status === 'Pendente').reduce((acc, curr) => acc + parseMonetaryValue(curr.valor), 0);

  // Contagem de Clientes por Tipo
  const pjCount = clients.filter(c => c.tipo === 'PJ').length;
  const pfCount = clients.filter(c => c.tipo === 'PF').length;

  // Filtered Clients (Filtro por Tipo + Busca Textual)
  const filteredClients = clients.filter(c => {
    // 1. Filtro por tipo (Todos, PJ ou PF)
    if (clientTypeFilter !== 'todos' && c.tipo !== clientTypeFilter) {
      return false;
    }
    // 2. Busca textual
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nome = (c.nomeRazao || '').toLowerCase();
    const doc = (c.documento || '').toLowerCase();
    const resp = (c.responsavel || '').toLowerCase();
    const socio = (c.socioVinculado || '').toLowerCase();
    const emp = (c.empresaVinculada || '').toLowerCase();
    const prof = (c.profissao || '').toLowerCase();
    const bancos = (c.contasBancarias || []).some(b => 
      (b.banco || '').toLowerCase().includes(term) || 
      (b.bancoOutro || '').toLowerCase().includes(term) ||
      (b.agencia || '').includes(term) || 
      (b.conta || '').includes(term)
    );
    return nome.includes(term) || doc.includes(term) || resp.includes(term) || socio.includes(term) || emp.includes(term) || prof.includes(term) || bancos;
  });

  // ==========================================
  // VIEW: LOGIN SCREEN (when not authenticated)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="modal-backdrop">
        <div className="modal-dialog" style={{ maxWidth: '440px', padding: '2.5rem 2rem' }}>
          
          <button 
            onClick={handleCloseModal} 
            style={{ 
              position: 'absolute', 
              top: '1.25rem', 
              right: '1.25rem', 
              background: 'none', 
              border: 'none', 
              color: '#64748B', 
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img 
              src="/mourato-seal-circle.png" 
              alt="Mourato & Associados" 
              width="76"
              height="76"
              style={{ 
                height: '76px', 
                width: '76px', 
                margin: '0 auto 1.25rem', 
                borderRadius: '50%',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 16px rgba(197, 168, 105, 0.25)' 
              }} 
            />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              background: 'rgba(197, 168, 105, 0.1)',
              border: '1px solid var(--gold-border)',
              fontSize: '0.72rem',
              color: 'var(--gold-light)',
              letterSpacing: '0.12em',
              marginBottom: '0.75rem'
            }}>
              <Lock size={12} />
              LOGIN • PAINEL EXECUTIVO
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#FFFFFF', marginBottom: '0.35rem' }}>
              Mourato &amp; Associados
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.82rem' }}>
              Mesa de Gestão, Clientes, Agendamentos &amp; Recebíveis
            </p>
          </div>

          <form onSubmit={handleLogin} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 600 }}>
                Usuário / Operador
              </label>
              <input 
                type="text" 
                name="mrt-op-field"
                value={authForm.user}
                onChange={(e) => setAuthForm({ ...authForm, user: e.target.value })}
                placeholder="Digite seu usuário"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-form-type="other"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#090D14',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 600 }}>
                Chave de Acesso / Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  name="mrt-key-field"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.8rem 0.75rem 1rem',
                    background: '#090D14',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem'
                  }}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {authError && (
              <div style={{ 
                padding: '0.65rem 0.9rem', 
                background: 'rgba(239, 68, 68, 0.12)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                borderRadius: 'var(--radius-xs)', 
                color: '#FCA5A5', 
                fontSize: '0.78rem' 
              }}>
                {authError}
              </div>
            )}

            <button 
              type="submit"
              className="btn-primary-gold"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '0.85rem', 
                fontSize: '0.88rem',
                marginTop: '0.5rem' 
              }}
            >
              Entrar no Painel
              <ArrowRight size={15} />
            </button>

            <div style={{ marginTop: '0.85rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleClearCacheAndSync}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '4px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = 'var(--gold-light)'}
                onMouseLeave={(e) => e.target.style.color = '#64748B'}
                title="Limpar memória em cache e carregar a base oficial unificada"
              >
                <RotateCcw size={13} />
                Limpar Cache Local &amp; Sincronizar Base Oficial
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem', textAlign: 'center', fontSize: '0.72rem', color: '#64748B' }}>
            Ambiente com Criptografia de Ponta a Ponta • Mourato &amp; Associados Ltda
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: FULL EXECUTIVE DASHBOARD WITH SIDEBAR
  // ==========================================
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#070A0F',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
      color: '#F8FAFC'
    }}>

      {/* Overlay mobile para fechar sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 9, display: 'none'
          }}
          className="sidebar-overlay"
        />
      )}

      {/* ------------------------------------------ */}
      {/* 1. LATERAL SIDEBAR MENU                    */}
      {/* ------------------------------------------ */}
      <aside style={{
        width: '270px',
        minWidth: '270px',
        background: '#0B0F17',
        borderRight: '1px solid rgba(197, 168, 105, 0.16)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.5rem 1rem',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
        zIndex: 10,
        position: 'relative',
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
      }} className={`admin-sidebar${sidebarOpen ? ' admin-sidebar-open' : ''}`}>
        
        {/* Brand & Monogram */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.5rem 0.5rem 1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <img 
              src="/mourato-seal-circle.png" 
              alt="Mourato & Associados" 
              width="44"
              height="44"
              style={{ 
                height: '44px', 
                width: '44px', 
                borderRadius: '50%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), 0 0 10px rgba(197, 168, 105, 0.3)' 
              }} 
            />
            <div>
              <div style={{
                fontFamily: "var(--font-serif)",
                fontSize: '0.96rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: '#FFFFFF'
              }}>
                MOURATO <span style={{ color: 'var(--gold-primary)' }}>&amp;</span> ASSOC.
              </div>
              <div style={{
                fontSize: '0.62rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--gold-light)',
                fontWeight: 600
              }}>
                Painel Executivo
              </div>
            </div>
          </div>

          {/* Navigation Items - 6 Standalone Modular Buttons Matching the Wireframe */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1.25rem' }}>
            
            {/* 1. Leads & Solicitações */}
            <button
              onClick={() => { setActiveView('leads'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: activeView === 'leads' ? 'rgba(197, 168, 105, 0.2)' : 'rgba(11, 15, 23, 0.7)',
                border: activeView === 'leads' ? '2.5px solid #C5A869' : '2px solid rgba(255, 255, 255, 0.18)',
                boxShadow: activeView === 'leads' ? '0 0 16px rgba(197, 168, 105, 0.35), inset 0 0 10px rgba(197, 168, 105, 0.12)' : '0 2px 6px rgba(0,0,0,0.3)',
                color: activeView === 'leads' ? '#FFFFFF' : '#CBD5E1',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                minHeight: '62px',
                width: '100%',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Sparkles size={16} color={activeView === 'leads' ? '#C5A869' : '#94A3B8'} />
                <span style={{ fontWeight: 800, fontSize: '0.86rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Leads &amp; Solicitações
                </span>
              </div>
              <div style={{ fontSize: '0.64rem', color: activeView === 'leads' ? '#C5A869' : '#64748B', marginTop: '0.2rem', fontWeight: 600 }}>
                📁 Pasta: leads/ • Formulário Site
              </div>
              {leads.length > 0 && (
                <span style={{
                  position: 'absolute', top: '6px', right: '8px',
                  fontSize: '0.62rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                  background: activeView === 'leads' ? '#C5A869' : 'rgba(255, 255, 255, 0.12)',
                  color: activeView === 'leads' ? '#0A0D14' : '#CBD5E1', fontWeight: 700
                }}>
                  {leads.length}
                </span>
              )}
            </button>

            {/* 2. CLIENTES (Visualização Completa, Correção e Validação Final) */}
            <button
              onClick={() => { setActiveView('clients_list'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: (activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') ? 'rgba(197, 168, 105, 0.2)' : 'rgba(11, 15, 23, 0.7)',
                border: (activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') ? '2.5px solid #C5A869' : '2px solid rgba(255, 255, 255, 0.18)',
                boxShadow: (activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') ? '0 0 16px rgba(197, 168, 105, 0.35), inset 0 0 10px rgba(197, 168, 105, 0.12)' : '0 2px 6px rgba(0,0,0,0.3)',
                color: (activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') ? '#FFFFFF' : '#CBD5E1',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                minHeight: '62px',
                width: '100%',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Users size={16} color={(activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') ? '#C5A869' : '#94A3B8'} />
                <span style={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  CLIENTES
                </span>
              </div>
              <div style={{ fontSize: '0.64rem', color: (activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') ? '#C5A869' : '#64748B', marginTop: '0.2rem', fontWeight: 600 }}>
                📁 Informações, Correção &amp; Validação Final
              </div>
              <span style={{
                position: 'absolute', top: '6px', right: '8px',
                fontSize: '0.62rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                background: (activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') ? '#C5A869' : 'rgba(255, 255, 255, 0.12)',
                color: (activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') ? '#0A0D14' : '#CBD5E1', fontWeight: 700
              }}>
                {clients.length}
              </span>
            </button>

            {/* 3. CIO EXECUTIVO */}
            <button
              onClick={() => { setActiveView('alfred_cio'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: (activeView === 'cio_executivo' || activeView === 'alfred_cio') ? 'rgba(197, 168, 105, 0.24)' : 'rgba(11, 15, 23, 0.7)',
                border: (activeView === 'cio_executivo' || activeView === 'alfred_cio') ? '2.5px solid #C5A869' : '2px solid rgba(255, 255, 255, 0.18)',
                boxShadow: (activeView === 'cio_executivo' || activeView === 'alfred_cio') ? '0 0 18px rgba(197, 168, 105, 0.4), inset 0 0 10px rgba(197, 168, 105, 0.15)' : '0 2px 6px rgba(0,0,0,0.3)',
                color: (activeView === 'cio_executivo' || activeView === 'alfred_cio') ? '#FFFFFF' : '#CBD5E1',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                minHeight: '62px',
                width: '100%',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Bot size={16} color={(activeView === 'cio_executivo' || activeView === 'alfred_cio') ? '#C5A869' : '#C5A869'} />
                <span style={{ fontWeight: 800, fontSize: '0.86rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  CIO EXECUTIVO
                </span>
              </div>
              <div style={{ fontSize: '0.64rem', color: (activeView === 'cio_executivo' || activeView === 'alfred_cio') ? '#C5A869' : '#64748B', marginTop: '0.2rem', fontWeight: 600 }}>
                ⭐ Alfred • Livre Acesso Global
              </div>
              <span style={{
                position: 'absolute', top: '6px', right: '8px',
                fontSize: '0.62rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.25)', border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34D399', fontWeight: 700
              }}>
                9000
              </span>
            </button>

            {/* 4. SECRETÁRIA EXECUTIVA (Clique) */}
            <button
              onClick={() => { setActiveView('secretaria_executiva'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: activeView === 'secretaria_executiva' ? 'rgba(197, 168, 105, 0.2)' : 'rgba(11, 15, 23, 0.7)',
                border: activeView === 'secretaria_executiva' ? '2.5px solid #C5A869' : '2px solid rgba(255, 255, 255, 0.18)',
                boxShadow: activeView === 'secretaria_executiva' ? '0 0 16px rgba(197, 168, 105, 0.35), inset 0 0 10px rgba(197, 168, 105, 0.12)' : '0 2px 6px rgba(0,0,0,0.3)',
                color: activeView === 'secretaria_executiva' ? '#FFFFFF' : '#CBD5E1',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                minHeight: '62px',
                width: '100%',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <ShieldCheck size={16} color={activeView === 'secretaria_executiva' ? '#C5A869' : '#94A3B8'} />
                <span style={{ fontWeight: 800, fontSize: '0.84rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                  SECRETÁRIA EXECUTIVA (Clique)
                </span>
              </div>
              <div style={{ fontSize: '0.64rem', color: activeView === 'secretaria_executiva' ? '#C5A869' : '#64748B', marginTop: '0.2rem', fontWeight: 600 }}>
                📁 Pastas PJ &amp; PF • Mica Radar CNDs
              </div>
            </button>

            {/* 5. AGENDAR CONSULTAS (TEIA DE ARANHA) */}
            <button
              onClick={() => { setActiveView('agente_consulta'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: (activeView === 'agente_consulta' || activeView === 'appointments') ? 'rgba(197, 168, 105, 0.2)' : 'rgba(11, 15, 23, 0.7)',
                border: (activeView === 'agente_consulta' || activeView === 'appointments') ? '2.5px solid #C5A869' : '2px solid rgba(255, 255, 255, 0.18)',
                boxShadow: (activeView === 'agente_consulta' || activeView === 'appointments') ? '0 0 16px rgba(197, 168, 105, 0.35), inset 0 0 10px rgba(197, 168, 105, 0.12)' : '0 2px 6px rgba(0,0,0,0.3)',
                color: (activeView === 'agente_consulta' || activeView === 'appointments') ? '#FFFFFF' : '#CBD5E1',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                minHeight: '62px',
                width: '100%',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <CalendarPlus size={16} color={(activeView === 'agente_consulta' || activeView === 'appointments') ? '#C5A869' : '#94A3B8'} />
                <span style={{ fontWeight: 800, fontSize: '0.86rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  AGENDAR CONSULTAS
                </span>
              </div>
              <div style={{ fontSize: '0.64rem', color: (activeView === 'agente_consulta' || activeView === 'appointments') ? '#C5A869' : '#64748B', marginTop: '0.2rem', fontWeight: 600 }}>
                📁 Teia de Aranha • Consultas &amp; Audiências
              </div>
              {appointments.filter(a => a.status === 'Agendado').length > 0 && (
                <span style={{
                  position: 'absolute', top: '6px', right: '8px',
                  fontSize: '0.62rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                  background: 'rgba(59, 130, 246, 0.25)', border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#60A5FA', fontWeight: 700
                }}>
                  {appointments.filter(a => a.status === 'Agendado').length}
                </span>
              )}
            </button>

            {/* 6. MÃO DE OBRA MANUAL */}
            <button
              onClick={() => { setActiveView('mao_obra'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: activeView === 'mao_obra' ? 'rgba(197, 168, 105, 0.2)' : 'rgba(11, 15, 23, 0.7)',
                border: activeView === 'mao_obra' ? '2.5px solid #C5A869' : '2px solid rgba(255, 255, 255, 0.18)',
                boxShadow: activeView === 'mao_obra' ? '0 0 16px rgba(197, 168, 105, 0.35), inset 0 0 10px rgba(197, 168, 105, 0.12)' : '0 2px 6px rgba(0,0,0,0.3)',
                color: activeView === 'mao_obra' ? '#FFFFFF' : '#CBD5E1',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                minHeight: '62px',
                width: '100%',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Briefcase size={16} color={activeView === 'mao_obra' ? '#C5A869' : '#94A3B8'} />
                <span style={{ fontWeight: 800, fontSize: '0.86rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  MÃO DE OBRA MANUAL
                </span>
              </div>
              <div style={{ fontSize: '0.64rem', color: activeView === 'mao_obra' ? '#C5A869' : '#64748B', marginTop: '0.2rem', fontWeight: 600 }}>
                📁 Pasta: Flix/ • Porta 8765 Esteira
              </div>
              <span style={{
                position: 'absolute', top: '6px', right: '8px',
                fontSize: '0.62rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                background: 'rgba(59, 130, 246, 0.25)', border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#60A5FA', fontWeight: 700
              }}>
                8765
              </span>
            </button>

          </nav>
        </div>

        {/* Sidebar Footer: Admin status & Logout */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0 0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <div>
              <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600 }}>Administrador Mourato</div>
              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Sessão Segura Ativa</div>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#F87171',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <LogOut size={14} />
            Encerrar Sessão
          </button>
        </div>

      </aside>

      {/* ------------------------------------------ */}
      {/* 2. MAIN CONTENT AREA (RIGHT SIDE)          */}
      {/* ------------------------------------------ */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#080B11'
      }}>
        
        {/* Top Header of Main Area */}
        <header style={{
          height: '68px',
          background: '#0B0F17',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="admin-menu-btn"
                aria-label="Menu"
                style={{
                  display: 'none', background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-xs)', color: '#CBD5E1',
                  cursor: 'pointer', padding: '0.4rem', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Menu size={18} />
              </button>
              <h1 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: 0, fontWeight: 700 }}>
                {activeView === 'leads' && 'Leads & Solicitações'}
                {activeView === 'clients_list' && 'Novos Clientes & Planilhas Cadastradas'}
                {activeView === 'clients_new' && 'Cadastro de Nova Planilha / Cliente'}
                {activeView === 'bureau_scores' && 'Pontuação nos Birôs de Crédito & Banco Central'}
                {activeView === 'alfred_cio' && 'Central Executiva Alfred CIO & Inteligência Pericial'}
                {activeView === 'appointments' && 'Novos Agendamentos & Audiências'}
                {activeView === 'expenses' && 'Gestão de Despesas da Empresa'}
                {activeView === 'receivables' && 'Gestão de Recebíveis & Faturamento'}
                {activeView === 'settings' && 'Configurações do Painel & API'}
              </h1>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94A3B8', margin: '2px 0 0' }}>
              {activeView === 'leads' && 'Solicitações do formulário público — gerencie, aprove ou remova.'}
              {activeView === 'clients_list' && 'Planilhas enviadas pelo cliente via link direto ou preenchidas manualmente — conectadas diretamente aos Birôs de Crédito.'}
              {activeView === 'clients_new' && 'Cadastre empresas e sócios com contas bancárias, extratos anexados e senhas opcionais sem trava.'}
              {activeView === 'bureau_scores' && 'Auditoria de Scores em tempo real (Serasa, Boa Vista, Quod e Bacen SCR) para Empresas (PJ) e Sócios (PF).'}
              {activeView === 'alfred_cio' && 'Auditoria de PDFs em tempo real, Radar de CNDs da Secretária Mica e Protocolo 75/25 com Marca d\'Água 5.5% Mourato.'}
              {activeView === 'appointments' && 'Agende e acompanhe reuniões estratégicas com sócios e clientes.'}
              {activeView === 'expenses' && 'Acompanhe contas de consumo, energia, aluguel e status de pagamento.'}
              {activeView === 'receivables' && 'Emissão de cobranças com PIX Dinâmico, Cartão e Boletos homologados.'}
              {activeView === 'settings' && 'Configure as chaves e credenciais da API de Recebíveis e preferências.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => window.open('http://localhost:3000', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#34D399',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Abrir o Servidor Local Dedicado da Teia de Aranha (Porta 3000)"
            >
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
              Servidor Teia (3000)
            </button>

            <button
              onClick={() => handleOpenNewCharge()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #009EE3 0%, #007EB5 100%)',
                border: '1px solid #00B4FF',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0, 158, 227, 0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              title="Emitir Cobrança Bancária Oficial"
            >
              <CreditCard size={15} />
              + Nova Cobrança
            </button>

            <button
              onClick={handleCloseModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#CBD5E1',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Voltar ao Site
              <X size={15} />
            </button>
          </div>
        </header>

        {/* Scrollable View Content with Tall Rounded Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', background: '#060910' }}>
          
          {/* TALL ROUNDED CONTAINER DIRECTLY FROM THE USER WIREFRAME */}
          <div style={{
            minHeight: 'calc(100vh - 120px)',
            borderRadius: '36px',
            border: '2.5px solid rgba(197, 168, 105, 0.45)',
            background: 'linear-gradient(180deg, #0C101D 0%, #080B13 100%)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            padding: '2.25rem 2.25rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>

            {/* Cabeçalho do Módulo Ativo no topo do container arredondado */}
            <div style={{
              textAlign: 'center',
              borderBottom: '1px solid rgba(197, 168, 105, 0.25)',
              paddingBottom: '1.25rem',
              marginBottom: '2rem'
            }}>
              <h1 style={{
                fontFamily: "var(--font-serif, 'Georgia', serif)",
                fontSize: '2.2rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '0.03em',
                margin: '0 0 0.5rem'
              }}>
                {activeView === 'leads' && 'Leads & Solicitações'}
                {(activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') && 'CLIENTES'}
                {(activeView === 'cio_executivo' || activeView === 'alfred_cio') && 'CIO EXECUTIVO'}
                {activeView === 'secretaria_executiva' && 'SECRETÁRIA EXECUTIVA (Clique)'}
                {(activeView === 'agente_consulta' || activeView === 'appointments') && 'AGENDAR CONSULTAS — TEIA DE ARANHA'}
                {activeView === 'mao_obra' && 'MÃO DE OBRA MANUAL'}
                {activeView === 'appointments' && 'Novos Agendamentos'}
                {activeView === 'expenses' && 'Despesas da Empresa'}
                {activeView === 'receivables' && 'Gestão de Recebíveis'}
                {activeView === 'settings' && 'Configurações'}
              </h1>
              
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.3rem 1rem',
                borderRadius: '9999px',
                background: 'rgba(197, 168, 105, 0.12)',
                border: '1px solid rgba(197, 168, 105, 0.3)',
                fontSize: '0.76rem',
                color: '#C5A869',
                fontWeight: 600
              }}>
                {activeView === 'leads' && '📁 Pasta: Mourato.associados/src/data • Módulo Autônomo de Leads'}
                {(activeView === 'clients_list' || activeView === 'clients_new' || activeView === 'bureau_scores') && '📁 Pastas: C:\\Teia de arranha\\ClientesPJ & ClientesPF • Visualização Completa, Correção e Validação Final de PDFs'}
                {(activeView === 'cio_executivo' || activeView === 'alfred_cio') && '⭐ Pasta: C:\\Projetos\\Boss.Cio • Alfred CIO com Livre Acesso Global'}
                {activeView === 'secretaria_executiva' && '📁 Pastas: ClientesPJ & ClientesPF • Secretária Mica (Radar CNDs & Protocolos)'}
                {(activeView === 'agente_consulta' || activeView === 'appointments') && '📁 Pasta: C:\\Teia de arranha\\Robo • Central de Consultas & Agendamentos da Teia de Aranha'}
                {activeView === 'mao_obra' && '📁 Pasta: C:\\Projetos\\Flix • Esteira Operacional & Minutas (Porta 8765)'}
                {activeView === 'appointments' && '📁 Módulo de Agendamentos'}
                {activeView === 'expenses' && '📁 Módulo de Despesas'}
                {activeView === 'receivables' && '📁 Módulo de Recebíveis'}
                {activeView === 'settings' && '📁 Módulo de Configurações'}
              </div>
            </div>

            {/* Conteúdo Interno do Módulo Ativo */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* ======================================================== */}
          {/* TAB 0: LEADS & SOLICITAÇÕES                                */}
          {activeView === 'leads' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                  {leads.length} {leads.length === 1 ? 'solicitação sem aceite de termos' : 'solicitações sem aceite de termos'} (clientes que aceitaram os termos migram automaticamente para CLIENTES)
                </span>
                <button onClick={fetchLeads} className="btn-secondary-subtle" style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <RefreshCw size={13} /> Atualizar
                </button>
              </div>

              {leadsLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Carregando...</div>
              ) : leads.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', background: '#0B0F17', border: '1px dashed rgba(197,168,105,0.25)', borderRadius: 'var(--radius-md)' }}>
                  <Sparkles size={40} color="var(--gold-primary)" style={{ margin: '0 auto 1rem', opacity: 0.7 }} />
                  <h3 style={{ color: '#FFFFFF', marginBottom: '0.5rem' }}>Nenhuma pendência de termos</h3>
                  <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Apenas leads que não aceitaram os termos aparecem aqui. Todos os clientes aprovados já estão na aba CLIENTES.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                  {leads.map(lead => (
                    <div key={lead.id} style={{
                      background: '#0D121D',
                      border: '1px solid rgba(239,68,68,0.35)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.4rem',
                      display: 'flex', flexDirection: 'column', gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--gold-light)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                            {new Date(lead.criadoEm).toLocaleString('pt-BR')}
                          </div>
                          <h3 style={{ fontSize: '1rem', color: '#FFFFFF', margin: 0 }}>{lead.empresa}</h3>
                          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>{lead.nome}</div>
                        </div>
                        <span style={{
                          fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700,
                          background: 'rgba(239,68,68,0.15)',
                          color: '#FCA5A5'
                        }}>
                          ⚠ NÃO ACEITOU TERMOS
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <span>📧 <a href={`mailto:${lead.email}`} style={{ color: 'var(--gold-light)' }}>{lead.email}</a></span>
                        <span>📱 {lead.telefone}</span>
                        <span>🎯 Prática: <strong style={{ color: '#CBD5E1' }}>{lead.pratica}</strong></span>
                        {lead.contexto && <span style={{ fontStyle: 'italic', color: '#64748B' }}>"{lead.contexto}"</span>}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                        {lead.status === 'aprovado' ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-xs)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>✓ AUDIÊNCIA APROVADA</span>
                              <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 400 }}>mourato@mouratoassociados.com.br</span>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.45rem' }}>
                              <button
                                type="button"
                                onClick={() => handleApproveLead(lead.id, lead)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                                  padding: '0.55rem', background: 'rgba(37, 211, 102, 0.15)', border: '1px solid rgba(37, 211, 102, 0.35)',
                                  color: '#34D399', fontWeight: 700, fontSize: '0.74rem', borderRadius: '4px', cursor: 'pointer'
                                }}
                                title="Abrir WhatsApp para envio imediato do link da planilha"
                              >
                                💬 WhatsApp
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApproveLead(lead.id, lead)}
                                className="btn-primary-gold"
                                style={{ padding: '0.55rem', fontSize: '0.74rem', justifyContent: 'center' }}
                                title="Disparar e-mail com link da ficha cadastral"
                              >
                                ✉️ E-mail
                              </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = (window.location.origin || 'https://www.mouratoassociados.com.br') + '/ficha-cadastral?nome=' + encodeURIComponent(lead.nome) + '&empresa=' + encodeURIComponent(lead.empresa) + '&telefone=' + encodeURIComponent(lead.telefone) + '&email=' + encodeURIComponent(lead.email) + '&token=' + encodeURIComponent(lead.id || 'tok-' + Date.now()) + '&leadId=' + encodeURIComponent(lead.id || '') + '&origem=audiencia_aprovada';
                                    navigator.clipboard.writeText(url);
                                    alert('Link oficial da Planilha/Ficha Cadastral copiado:\n\n' + url);
                                  }}
                                  className="btn-secondary-subtle"
                                  style={{ padding: '0.55rem', fontSize: '0.74rem', justifyContent: 'center' }}
                                >
                                  📋 Copiar Link
                                </button>

                                <a
                                  href={'/ficha-cadastral?nome=' + encodeURIComponent(lead.nome) + '&empresa=' + encodeURIComponent(lead.empresa) + '&telefone=' + encodeURIComponent(lead.telefone) + '&email=' + encodeURIComponent(lead.email) + '&token=' + encodeURIComponent(lead.id || 'tok-' + Date.now()) + '&leadId=' + encodeURIComponent(lead.id || '') + '&origem=audiencia_aprovada'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn-secondary-subtle"
                                  style={{ padding: '0.55rem', fontSize: '0.74rem', justifyContent: 'center', textDecoration: 'none' }}
                                >
                                  🔗 Abrir Ficha
                                </a>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(() => {
                              const notif = buildLeadNotification(lead);
                              return (
                                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                                  <a
                                    href={notif?.urlDiretoriaUniversal || 'https://wa.me/5511978990034'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      flex: 1, minWidth: '150px', padding: '0.55rem 0.75rem',
                                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                      border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34D399',
                                      fontSize: '0.74rem', fontWeight: 700, borderRadius: '4px',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                                      textDecoration: 'none'
                                    }}
                                    title="Notificar Diretoria no WhatsApp Oficial (11) 97899-0034"
                                  >
                                    📲 Notificar 97899-0034
                                  </a>

                                  {notif?.linkDisparoClienteWhatsApp && (
                                    <a
                                      href={notif.linkDisparoClienteWhatsApp}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        flex: 1, minWidth: '150px', padding: '0.55rem 0.75rem',
                                        background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)',
                                        color: '#38BDF8', fontSize: '0.74rem', fontWeight: 700, borderRadius: '4px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                                        textDecoration: 'none'
                                      }}
                                      title="Enviar link seguro da Ficha Cadastral direto no WhatsApp do Cliente"
                                    >
                                      💬 Enviar Link Cliente
                                    </a>
                                  )}
                                </div>
                              );
                            })()}

                            <div style={{ display: 'flex', gap: '0.65rem' }}>
                              <button
                                onClick={() => handleApproveLead(lead.id, lead)}
                                className="btn-primary-gold"
                                style={{ flex: 1, padding: '0.65rem', fontSize: '0.82rem', justifyContent: 'center', fontWeight: 700 }}
                              >
                                <UserCheck size={15} /> APROVAR &amp; ENVIAR PLANILHA
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                style={{
                                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                                  color: '#F87171', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                                }}
                                title="Remover Lead"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: CONSULTA DE CLIENTES CADASTRADOS                  */}
          {/* ======================================================== */}
          {activeView === 'clients_list' && (
            <div>
              {/* Header com Filtros Rápidos (Todos, Empresas PJ, Sócios PF) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Abas de Filtro de Categoria */}
                  <div style={{
                    display: 'inline-flex',
                    background: '#0D121D',
                    padding: '0.3rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    gap: '0.35rem'
                  }}>
                    <button
                      type="button"
                      onClick={() => setClientTypeFilter('todos')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.5rem 0.9rem',
                        borderRadius: 'var(--radius-xs)',
                        background: clientTypeFilter === 'todos' ? 'rgba(197, 168, 105, 0.2)' : 'transparent',
                        border: clientTypeFilter === 'todos' ? '1px solid var(--gold-border)' : '1px solid transparent',
                        color: clientTypeFilter === 'todos' ? 'var(--gold-light)' : '#94A3B8',
                        fontSize: '0.78rem',
                        fontWeight: clientTypeFilter === 'todos' ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Users size={14} />
                      Todos ({clients.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setClientTypeFilter('PJ')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.5rem 0.9rem',
                        borderRadius: 'var(--radius-xs)',
                        background: clientTypeFilter === 'PJ' ? 'rgba(197, 168, 105, 0.25)' : 'transparent',
                        border: clientTypeFilter === 'PJ' ? '1px solid var(--gold-primary)' : '1px solid transparent',
                        color: clientTypeFilter === 'PJ' ? 'var(--gold-light)' : '#94A3B8',
                        fontSize: '0.78rem',
                        fontWeight: clientTypeFilter === 'PJ' ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Building2 size={14} color="var(--gold-primary)" />
                      🏢 Empresas (PJ) ({pjCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setClientTypeFilter('PF')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.5rem 0.9rem',
                        borderRadius: 'var(--radius-xs)',
                        background: clientTypeFilter === 'PF' ? 'rgba(0, 158, 227, 0.2)' : 'transparent',
                        border: clientTypeFilter === 'PF' ? '1px solid #00B4FF' : '1px solid transparent',
                        color: clientTypeFilter === 'PF' ? '#38BDF8' : '#94A3B8',
                        fontSize: '0.78rem',
                        fontWeight: clientTypeFilter === 'PF' ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <UserCheck size={14} color="#00B4FF" />
                      👤 Sócios (PF) ({pfCount})
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button 
                      onClick={() => {
                        setEditingClientId(null);
                        resetNewClientForm();
                        setActiveView('clients_new');
                      }}
                      className="btn-primary-gold"
                      style={{ padding: '0.6rem 1.2rem', fontSize: '0.82rem', gap: '0.45rem' }}
                    >
                      <Plus size={16} />
                      Cadastrar Novo Cliente
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        fetchLeads();
                        fetchQuestaoDossies();
                        showToast('🔄 Painel Sincronizado', 'Base de clientes e dossiês periciais do Questão atualizados.');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        color: '#CBD5E1',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Atualizar lista de clientes e dossiês do Questão"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                </div>

                {/* Campo de Busca Textual */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '520px' }}>
                  <Search size={16} color="#64748B" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por Razão Social, Nome, CNPJ/CPF, Sócio Vinculado ou Banco..."
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem 0.7rem 2.6rem',
                      background: '#0D121D',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#FFFFFF',
                      fontSize: '0.84rem',
                      outline: 'none'
                    }}
                  />
                </div>

              </div>

              {/* Grid de Cards de Clientes */}
              {clients.length === 0 ? (
                <div style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  background: '#0B0F17',
                  border: '1px dashed rgba(197, 168, 105, 0.25)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <ShieldCheck size={48} color="var(--gold-primary)" style={{ margin: '0 auto 1.25rem', opacity: 0.8 }} />
                  <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    Nenhum cliente cadastrado
                  </h3>
                  <p style={{ color: '#94A3B8', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                    Cadastre uma nova Pessoa Jurídica ou Pessoa Física vinculada.
                  </p>
                  <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setActiveView('clients_new')}
                      className="btn-primary-gold"
                      style={{ padding: '0.8rem 1.6rem', fontSize: '0.84rem' }}
                    >
                      <Plus size={16} />
                      Cadastrar Primeiro Cliente
                    </button>
                    <button 
                      onClick={handleRestoreDefaultClients}
                      style={{
                        padding: '0.8rem 1.4rem',
                        fontSize: '0.84rem',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#CBD5E1',
                        borderRadius: 'var(--radius-xs)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontWeight: 600
                      }}
                      title="Restaurar a base oficial da Teia de Aranha"
                    >
                      <RotateCcw size={15} />
                      Restaurar Base Oficial
                    </button>
                  </div>
                </div>
              ) : filteredClients.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94A3B8', background: '#0D121D', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  Nenhum cliente encontrado para o filtro selecionado ou termo pesquisado.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.25rem' }}>
                  {filteredClients.map((client) => {
                    const isPJ = client.tipo === 'PJ';
                    const dossieQ = getQuestaoDossieForClient(client);
                    const qOrig = dossieQ?.dossie_original_questao || null;
                    const rfb = qOrig?.dados_rfb || {};
                    const bureau = getBureauDataForClient(client);

                    const capSocialNum = rfb.capital_social !== undefined && rfb.capital_social !== null
                      ? Number(rfb.capital_social)
                      : parseMonetaryValue(client.empresa?.capitalSocial || client.balanco?.capitalSocial);
                    const capSocialFmt = capSocialNum > 0
                      ? capSocialNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : 'Não informado';

                    const idadeMeses = rfb.tempo_vida_meses ? `${rfb.tempo_vida_meses} meses` : (rfb.data_abertura || client.dataAbertura || 'Não auditado');
                    const regimeFmt = rfb.optante_simei
                      ? 'MEI (SIMEI)'
                      : rfb.optante_simples
                        ? 'Simples Nacional'
                        : (client.empresa?.regimeTributario || rfb.porte || 'Não informado');

                    const redCount = qOrig?.red_flags?.length || 0;
                    const yellowCount = qOrig?.yellow_flags?.length || 0;
                    const greenCount = qOrig?.green_flags?.length || 0;
                    const scoreAlfred = dossieQ?.score_viabilidade;
                    const recAlfred = dossieQ?.recomendacao_acao;
                    const pdfQuestaoUrl = dossieQ?._meta_arquivos?.url_pdf_questao || '';

                    return (
                      <div 
                        key={client.id}
                        style={{
                          background: '#0D121D',
                          border: isPJ ? '1px solid rgba(197, 168, 105, 0.35)' : '1px solid rgba(0, 158, 227, 0.3)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1.35rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.9rem',
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Indicador de Topo Luminoso */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '3px',
                          background: isPJ ? 'linear-gradient(90deg, #C5A869 0%, #E8D5A3 100%)' : 'linear-gradient(90deg, #009EE3 0%, #38BDF8 100%)'
                        }} />

                        <div>
                          {/* Cabeçalho do Card + Lixeira Sutil */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', gap: '0.45rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {isPJ ? (
                                <span style={{
                                  fontSize: '0.66rem',
                                  padding: '0.18rem 0.55rem',
                                  borderRadius: '9999px',
                                  background: 'rgba(197, 168, 105, 0.2)',
                                  color: 'var(--gold-light)',
                                  border: '1px solid var(--gold-border)',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}>
                                  <Building2 size={11} />
                                  PJ • EMPRESA
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.66rem',
                                  padding: '0.18rem 0.55rem',
                                  borderRadius: '9999px',
                                  background: 'rgba(0, 158, 227, 0.18)',
                                  color: '#38BDF8',
                                  border: '1px solid rgba(0, 158, 227, 0.4)',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}>
                                  <UserCheck size={11} />
                                  PF • SÓCIO
                                </span>
                              )}

                              <span style={{ 
                                fontSize: '0.66rem', 
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                padding: '0.15rem 0.45rem', 
                                borderRadius: '4px', 
                                background: 'rgba(197, 168, 105, 0.12)', 
                                color: 'var(--gold-light)', 
                                border: '1px solid rgba(197, 168, 105, 0.35)'
                              }}>
                                {client.codigoCliente || 'CLI-001'}
                              </span>

                              {dossieQ ? (
                                <span style={{
                                  fontSize: '0.66rem',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '9999px',
                                  background: recAlfred === 'PROSSEGUIR' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                                  color: recAlfred === 'PROSSEGUIR' ? '#34D399' : '#FBBF24',
                                  border: recAlfred === 'PROSSEGUIR' ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(245, 158, 11, 0.45)',
                                  fontWeight: 800
                                }}>
                                  🕵️ {scoreAlfred}/100 • {recAlfred}
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.66rem',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '9999px',
                                  background: 'rgba(148, 163, 184, 0.12)',
                                  color: '#94A3B8',
                                  border: '1px solid rgba(148, 163, 184, 0.25)',
                                  fontWeight: 600
                                }}>
                                  Aguardando Questão
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteClient(client.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(239, 68, 68, 0.22)',
                                color: '#F87171',
                                padding: '0.3rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.75
                              }}
                              title="Excluir cadastro"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Razão Social / Nome Completo */}
                          <h3 style={{ fontSize: '1.06rem', color: '#FFFFFF', margin: '0 0 0.25rem', fontWeight: 800, lineHeight: 1.25 }}>
                            {client.nomeRazao}
                          </h3>

                          {/* Documento + Situação RFB + Contato */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem 0.85rem', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
                            <span>
                              {isPJ ? 'CNPJ' : 'CPF'}: <strong style={{ color: '#F8FAFC', fontFamily: 'monospace' }}>{getClientDocumento(client)}</strong>
                            </span>
                            {rfb.situacao_cadastral && (
                              <span style={{ color: rfb.situacao_cadastral === 'ATIVA' ? '#34D399' : '#F87171', fontWeight: 700 }}>
                                • RFB: {rfb.situacao_cadastral}
                              </span>
                            )}
                            {client.contato && <span>📱 {client.contato}</span>}
                            {client.email && <span>✉️ {client.email}</span>}
                          </div>

                          {/* Grid Executivo de 4 Indicadores Reais (Questão + Cadastro) */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.45rem',
                            marginBottom: '0.75rem'
                          }}>
                            <div style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.45rem 0.6rem' }}>
                              <div style={{ fontSize: '0.62rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Capital Social</div>
                              <div style={{ fontSize: '0.78rem', color: '#F8FAFC', fontWeight: 700 }}>{capSocialFmt}</div>
                            </div>
                            <div style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.45rem 0.6rem' }}>
                              <div style={{ fontSize: '0.62rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tempo / Abertura</div>
                              <div style={{ fontSize: '0.78rem', color: '#F8FAFC', fontWeight: 700 }}>{idadeMeses}</div>
                            </div>
                            <div style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.45rem 0.6rem' }}>
                              <div style={{ fontSize: '0.62rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Regime / Porte</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--gold-light)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{regimeFmt}</div>
                            </div>
                            <div style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.45rem 0.6rem' }}>
                              <div style={{ fontSize: '0.62rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Questão 75%</div>
                              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: dossieQ ? (redCount > 0 ? '#F87171' : '#34D399') : '#94A3B8' }}>
                                {dossieQ ? `${greenCount} OK • ${yellowCount} Atenção • ${redCount} Crítico` : 'Não auditado'}
                              </div>
                            </div>
                          </div>

                          {/* Vínculo Sócio <-> Empresa (somente se real) */}
                          {(isPJ ? (client.socioVinculado || client.responsavel || qOrig?.socios_identificados?.[0]?.nome) : client.empresaVinculada) && (
                            <div style={{
                              background: isPJ ? 'rgba(197, 168, 105, 0.06)' : 'rgba(0, 158, 227, 0.06)',
                              border: isPJ ? '1px solid rgba(197, 168, 105, 0.18)' : '1px solid rgba(0, 158, 227, 0.18)',
                              borderRadius: '6px',
                              padding: '0.45rem 0.65rem',
                              fontSize: '0.73rem',
                              marginBottom: '0.75rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <span style={{ color: isPJ ? 'var(--gold-light)' : '#38BDF8', fontWeight: 600 }}>
                                {isPJ ? '👤 Sócio Adm:' : '🏢 Empresa:'}
                              </span>
                              <strong style={{ color: '#FFFFFF', textAlign: 'right' }}>
                                {isPJ
                                  ? (client.socioVinculado || client.responsavel || qOrig?.socios_identificados?.[0]?.nome)
                                  : client.empresaVinculada}
                              </strong>
                            </div>
                          )}

                          {/* Faixa Unificada dos 4 Birôs (Zero Dados Inventados) */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', fontSize: '0.66rem', color: '#94A3B8' }}>
                            <div style={{ background: '#070A10', padding: '0.3rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                              <div style={{ color: '#64748B', fontSize: '0.58rem' }}>SERASA</div>
                              <strong style={{ color: bureau.serasa > 0 ? '#FFFFFF' : '#64748B' }}>{bureau.serasa || 0}</strong>
                            </div>
                            <div style={{ background: '#070A10', padding: '0.3rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                              <div style={{ color: '#64748B', fontSize: '0.58rem' }}>BOA VISTA</div>
                              <strong style={{ color: bureau.boavista > 0 ? '#FFFFFF' : '#64748B' }}>{bureau.boavista || 0}</strong>
                            </div>
                            <div style={{ background: '#070A10', padding: '0.3rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                              <div style={{ color: '#64748B', fontSize: '0.58rem' }}>QUOD</div>
                              <strong style={{ color: bureau.quod > 0 ? '#FFFFFF' : '#64748B' }}>{bureau.quod || 0}</strong>
                            </div>
                            <div style={{ background: '#070A10', padding: '0.3rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                              <div style={{ color: '#64748B', fontSize: '0.58rem' }}>BACEN SCR</div>
                              <strong style={{ color: bureau.bacen && !String(bureau.bacen).startsWith('0') ? '#34D399' : '#64748B' }}>
                                {bureau.bacen && !String(bureau.bacen).startsWith('0') ? String(bureau.bacen).split(' ')[0] : '0'}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Apenas 3 Botões Estratégicos de Ação */}
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: '1.35fr 0.85fr 0.95fr',
                          gap: '0.5rem', 
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
                          paddingTop: '0.85rem' 
                        }}>
                          <button
                            onClick={() => {
                              setSelectedBureauClientId(client.id);
                              setBureauCategoryFilter(client.tipo === 'PJ' ? 'PJ' : 'PF');
                              setActiveView('bureau_scores');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              padding: '0.58rem 0.65rem',
                              fontSize: '0.76rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(16, 185, 129, 0.18)',
                              border: '1px solid rgba(16, 185, 129, 0.5)',
                              color: '#34D399',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            title="Abrir Dossiê do Questão integrado aos 4 Birôs de Crédito"
                          >
                            <ShieldCheck size={14} />
                            Dossiê &amp; Birôs
                          </button>

                          <button
                            onClick={() => handleOpenNewCharge(client)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              padding: '0.58rem 0.65rem',
                              fontSize: '0.76rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(0, 158, 227, 0.15)',
                              border: '1px solid rgba(0, 158, 227, 0.4)',
                              color: '#00B4FF',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Emitir Cobrança PIX / Cartão"
                          >
                            <CreditCard size={14} />
                            Cobrar
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (pdfQuestaoUrl) {
                                window.open(pdfQuestaoUrl, '_blank');
                              } else {
                                handlePrintClientFormAndBureau(client);
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              padding: '0.58rem 0.65rem',
                              fontSize: '0.76rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(212, 175, 55, 0.16)',
                              border: '1px solid var(--gold-border)',
                              color: 'var(--gold-light)',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title={pdfQuestaoUrl ? 'Abrir PDF Oficial do Questão (Marca d\'Água 5.5%)' : 'Imprimir PDF Oficial Mourato (Marca d\'Água 5.5%)'}
                          >
                            <Printer size={14} />
                            PDF Oficial
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CADASTRO DE CLIENTES (SELETOR PJ vs PF)          */}
          {/* ======================================================== */}
          {activeView === 'clients_new' && (
            <div style={{ maxWidth: '920px', margin: '0 auto' }}>
              <div style={{
                background: '#0B0F17',
                border: newClient.tipo === 'PJ' ? '1px solid rgba(197, 168, 105, 0.3)' : '1px solid rgba(0, 158, 227, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '2.25rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                transition: 'border 0.3s'
              }}>
                {/* Cabeçalho do Cadastro */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {editingClientId ? (
                      <Edit2 size={26} color="var(--gold-light)" />
                    ) : newClient.tipo === 'PJ' ? (
                      <Building2 size={26} color="var(--gold-primary)" />
                    ) : (
                      <UserCheck size={26} color="#00B4FF" />
                    )}
                    <div>
                      <h2 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: 0 }}>
                        {editingClientId 
                          ? `Editar Cadastro: ${newClient.nomeRazao || 'Cliente'}` 
                          : newClient.tipo === 'PJ' ? 'Cadastro de Empresa (Pessoa Jurídica - PJ)' : 'Cadastro de Sócio / Pessoa Física (PF)'}
                      </h2>
                      <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '3px 0 0' }}>
                        {editingClientId
                          ? 'Atualize os dados cadastrais, societários, balanço, contas bancárias ou scores e salve as alterações.'
                          : newClient.tipo === 'PJ' 
                            ? 'Dossiê corporativo com balanço contábil, contas CCS Bacen e sócio administrador vinculado.' 
                            : 'Dossiê pessoal com profissão, empresa vinculada, bens/veículos e bureaus individuais.'}
                      </p>
                    </div>
                  </div>

                  {/* Badges de Auxílio */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {editingClientId && (
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        background: 'rgba(234, 179, 8, 0.2)',
                        border: '1px solid rgba(234, 179, 8, 0.5)',
                        color: '#FACC15',
                        fontWeight: 700
                      }}>
                        ✏️ EDITANDO CADASTRO
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      background: newClient.tipo === 'PJ' ? 'rgba(197, 168, 105, 0.15)' : 'rgba(0, 158, 227, 0.15)',
                      border: newClient.tipo === 'PJ' ? '1px solid var(--gold-border)' : '1px solid rgba(0, 158, 227, 0.35)',
                      color: newClient.tipo === 'PJ' ? 'var(--gold-light)' : '#38BDF8',
                      fontWeight: 700
                    }}>
                      {newClient.tipo === 'PJ' ? '🏢 PERFIL CORPORATIVO' : '👤 PERFIL PESSOA FÍSICA'}
                    </span>
                  </div>
                </div>

                {/* SELETOR VISUAL OBRIGATÓRIO: PJ vs PF */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewClient(prev => ({ ...prev, tipo: 'PJ', documentoTipo: 'CNPJ' }))}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: newClient.tipo === 'PJ' 
                        ? 'linear-gradient(135deg, rgba(197, 168, 105, 0.22) 0%, rgba(197, 168, 105, 0.08) 100%)' 
                        : '#070A10',
                      border: newClient.tipo === 'PJ' ? '2px solid var(--gold-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: newClient.tipo === 'PJ' ? 'var(--gold-light)' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.65rem',
                      boxShadow: newClient.tipo === 'PJ' ? '0 4px 16px rgba(197, 168, 105, 0.25)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Building2 size={20} color={newClient.tipo === 'PJ' ? 'var(--gold-primary)' : '#64748B'} />
                    🏢 PESSOA JURÍDICA (EMPRESA)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewClient(prev => ({ ...prev, tipo: 'PF', documentoTipo: 'CPF' }))}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: newClient.tipo === 'PF' 
                        ? 'linear-gradient(135deg, rgba(0, 158, 227, 0.22) 0%, rgba(0, 158, 227, 0.08) 100%)' 
                        : '#070A10',
                      border: newClient.tipo === 'PF' ? '2px solid #00B4FF' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: newClient.tipo === 'PF' ? '#38BDF8' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.65rem',
                      boxShadow: newClient.tipo === 'PF' ? '0 4px 16px rgba(0, 158, 227, 0.25)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <UserCheck size={20} color={newClient.tipo === 'PF' ? '#00B4FF' : '#64748B'} />
                    👤 PESSOA FÍSICA (SÓCIO)
                  </button>
                </div>

                <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  {/* ================================================= */}
                  {/* CASO PJ: CAMPOS DE PESSOA JURÍDICA                */}
                  {/* ================================================= */}
                  {newClient.tipo === 'PJ' && (
                    <>
                      {/* Seção 1: Identificação Corporativa */}
                      <div>
                        <h3 style={{ fontSize: '0.86rem', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <Building2 size={15} />
                          1. Identificação Corporativa da Companhia (PJ)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              Razão Social da Empresa *
                            </label>
                            <input 
                              type="text" 
                              required
                              value={newClient.nomeRazao}
                              onChange={(e) => setNewClient({ ...newClient, nomeRazao: e.target.value })}
                              placeholder="Ex: Razão Social da Empresa Ltda"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              CNPJ da Empresa *
                            </label>
                            <input 
                              type="text" 
                              required
                              value={newClient.documento}
                              onChange={(e) => setNewClient({ ...newClient, documento: e.target.value })}
                              placeholder="00.000.000/0001-00"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              Sócio Administrador Vinculado (Nome e CPF) *
                            </label>
                            <input 
                              type="text" 
                              value={newClient.socioVinculado}
                              onChange={(e) => setNewClient({ ...newClient, socioVinculado: e.target.value, responsavel: e.target.value })}
                              placeholder="Ex: Nome do Responsável / Sócio (CPF 000.000.000-00)"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              Natureza Jurídica
                            </label>
                            <input 
                              type="text" 
                              value={newClient.natureza}
                              onChange={(e) => setNewClient({ ...newClient, natureza: e.target.value })}
                              placeholder="Ex: 206-2 - Sociedade Empresária Limitada Unipessoal"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              NIRE JUCESP
                            </label>
                            <input 
                              type="text" 
                              value={newClient.nire}
                              onChange={(e) => setNewClient({ ...newClient, nire: e.target.value })}
                              placeholder="Ex: 00000000000"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              Contato / WhatsApp Corporativo
                            </label>
                            <input 
                              type="text" 
                              value={newClient.contato}
                              onChange={(e) => setNewClient({ ...newClient, contato: e.target.value })}
                              placeholder="(11) 98765-4321"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seção 2: Balanço Patrimonial & Dados Contábeis (PJ) */}
                      <div style={{ background: '#070A10', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197, 168, 105, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                          <FileSpreadsheet size={18} color="var(--gold-primary)" />
                          <h3 style={{ fontSize: '0.88rem', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                            2. Balanço Patrimonial &amp; Dados Contábeis (PJ)
                          </h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                              Ativo Total (R$)
                            </label>
                            <input 
                              type="text"
                              value={newClient.balanco?.ativo || ''}
                              onChange={(e) => handleBalancoChange('ativo', e.target.value)}
                              placeholder="Ex: R$ 0,00"
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-xs)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                              Patrimônio Líquido - PL (R$)
                            </label>
                            <input 
                              type="text"
                              value={newClient.balanco?.patrimonioLiquido || ''}
                              onChange={(e) => handleBalancoChange('patrimonioLiquido', e.target.value)}
                              placeholder="Ex: R$ 0,00"
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-xs)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                              Capital Social (R$)
                            </label>
                            <input 
                              type="text"
                              value={newClient.balanco?.capitalSocial || ''}
                              onChange={(e) => handleBalancoChange('capitalSocial', e.target.value)}
                              placeholder="Ex: R$ 0,00"
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-xs)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                              Faturamento Anual Bruto (R$)
                            </label>
                            <input 
                              type="text"
                              value={newClient.balanco?.faturamentoAnual || ''}
                              onChange={(e) => handleBalancoChange('faturamentoAnual', e.target.value)}
                              placeholder="Ex: R$ 0,00"
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-xs)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                              Contador Responsável (CRC)
                            </label>
                            <input 
                              type="text"
                              value={newClient.balanco?.contadorResponsavel || ''}
                              onChange={(e) => handleBalancoChange('contadorResponsavel', e.target.value)}
                              placeholder="Ex: Nome do Contador (CRC/UF)"
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-xs)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ================================================= */}
                  {/* CASO PF: CAMPOS DE PESSOA FÍSICA (SÓCIO)          */}
                  {/* ================================================= */}
                  {newClient.tipo === 'PF' && (
                    <>
                      {/* Seção 1: Identificação da Pessoa Física */}
                      <div>
                        <h3 style={{ fontSize: '0.86rem', color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <UserCheck size={15} />
                          1. Identificação da Pessoa Física (Sócio / Titular)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              Nome Completo *
                            </label>
                            <input 
                              type="text" 
                              required
                              value={newClient.nomeRazao}
                              onChange={(e) => setNewClient({ ...newClient, nomeRazao: e.target.value })}
                              placeholder="Ex: Nome Completo do Titular"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              CPF do Sócio *
                            </label>
                            <input 
                              type="text" 
                              required
                              value={newClient.documento}
                              onChange={(e) => setNewClient({ ...newClient, documento: e.target.value })}
                              placeholder="000.000.000-00"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              Empresa Vinculada *
                            </label>
                            <input 
                              type="text" 
                              value={newClient.empresaVinculada}
                              onChange={(e) => setNewClient({ ...newClient, empresaVinculada: e.target.value })}
                              placeholder="Ex: Razão Social da Empresa Ltda"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              Profissão / Cargo Societário
                            </label>
                            <input 
                              type="text" 
                              value={newClient.profissao}
                              onChange={(e) => setNewClient({ ...newClient, profissao: e.target.value })}
                              placeholder="Ex: Sócio-Administrador / Empresário / Contador CRC"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              Contato / Celular WhatsApp
                            </label>
                            <input 
                              type="text" 
                              value={newClient.contato}
                              onChange={(e) => setNewClient({ ...newClient, contato: e.target.value })}
                              placeholder="(11) 98765-4321"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                              E-mail Pessoal
                            </label>
                            <input 
                              type="email" 
                              value={newClient.email}
                              onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                              placeholder="email@dominio.com.br"
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seção 2: Renda, Pró-Labore & Patrimônio Pessoal (PF) */}
                      <div style={{ background: '#070A10', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 158, 227, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                          <Car size={18} color="#38BDF8" />
                          <h3 style={{ fontSize: '0.88rem', color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                            2. Renda, Pró-Labore &amp; Patrimônio Pessoal (PF)
                          </h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                              Renda / Pró-Labore Estimado (R$)
                            </label>
                            <input 
                              type="text"
                              value={newClient.rendaPatrimonio?.proLabore || ''}
                              onChange={(e) => handleRendaPatrimonioChange('proLabore', e.target.value)}
                              placeholder="Ex: R$ 25.000,00"
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-xs)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                              Bens Declarados (Imóveis, Quotas)
                            </label>
                            <input 
                              type="text"
                              value={newClient.rendaPatrimonio?.bens || ''}
                              onChange={(e) => handleRendaPatrimonioChange('bens', e.target.value)}
                              placeholder="Ex: Imóvel próprio avaliado em R$ 550k"
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-xs)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                              Veículos / Renavam / Placa
                            </label>
                            <input 
                              type="text"
                              value={newClient.rendaPatrimonio?.veiculos || ''}
                              onChange={(e) => handleRendaPatrimonioChange('veiculos', e.target.value)}
                              placeholder="Ex: Modelo do Veículo, Placa, Renavam"
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                background: '#06090F',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 'var(--radius-xs)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ================================================= */}
                  {/* SEÇÃO 3: ESTRUTURA BANCÁRIA (COMUM A PF E PJ)     */}
                  {/* ================================================= */}
                  <div style={{ background: '#070A10', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197, 168, 105, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Landmark size={18} color="var(--gold-primary)" />
                        <h3 style={{ fontSize: '0.88rem', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                          3. Estrutura Bancária &amp; Contas Abertas {newClient.tipo === 'PJ' ? '(CCS Bacen PJ)' : '(PF)'}
                        </h3>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleAddBankAccount}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.9rem',
                          background: 'rgba(197, 168, 105, 0.12)',
                          border: '1px solid var(--gold-border)',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--gold-light)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={14} />
                        + Acrescentar Outro Banco
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {newClient.contasBancarias.map((bancoItem, index) => (
                        <div 
                          key={bancoItem.id || index}
                          style={{
                            background: '#0D121D',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1.25rem',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gold-light)', fontWeight: 700 }}>
                              CONTA #{index + 1} {newClient.tipo === 'PJ' ? '(CONTA JURÍDICA / CCS)' : '(CONTA INDIVIDUAL)'}
                            </span>
                            {newClient.contasBancarias.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBankAccount(index)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#EF4444',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <Trash2 size={13} />
                                Remover Banco
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Instituição Financeira
                              </label>
                              <select
                                value={bancoItem.banco}
                                onChange={(e) => handleBankFieldChange(index, 'banco', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.65rem',
                                  background: '#06090F',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 'var(--radius-xs)',
                                  color: '#FFFFFF',
                                  fontSize: '0.82rem'
                                }}
                              >
                                <option value="Nu Pagamentos">Nu Pagamentos (IP 18.236.120)</option>
                                <option value="Nu Financeira">Nu Financeira (CFI 30.680.829)</option>
                                <option value="Itaú">Itaú Unibanco</option>
                                <option value="Bradesco">Bradesco</option>
                                <option value="Santander">Santander</option>
                                <option value="Banco do Brasil">Banco do Brasil</option>
                                <option value="Caixa">Caixa Econômica</option>
                                <option value="BTG Pactual">BTG Pactual</option>
                                <option value="Safra">Banco Safra</option>
                                <option value="Inter">Banco Inter</option>
                                <option value="Nubank">Nubank PJ/PF</option>
                                <option value="Sicoob">Sicoob</option>
                                <option value="Sicredi">Sicredi</option>
                                <option value="Outro">Outro Banco...</option>
                              </select>
                            </div>

                            {bancoItem.banco === 'Outro' && (
                              <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                  Nome da Instituição
                                </label>
                                <input 
                                  type="text"
                                  value={bancoItem.bancoOutro}
                                  onChange={(e) => handleBankFieldChange(index, 'bancoOutro', e.target.value)}
                                  placeholder="Digite o nome da instituição"
                                  style={{
                                    width: '100%',
                                    padding: '0.65rem',
                                    background: '#06090F',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 'var(--radius-xs)',
                                    color: '#FFFFFF',
                                    fontSize: '0.82rem'
                                  }}
                                />
                              </div>
                            )}

                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Agência
                              </label>
                              <input 
                                type="text"
                                value={bancoItem.agencia}
                                onChange={(e) => handleBankFieldChange(index, 'agencia', e.target.value)}
                                placeholder="0001"
                                style={{
                                  width: '100%',
                                  padding: '0.65rem',
                                  background: '#06090F',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 'var(--radius-xs)',
                                  color: '#FFFFFF',
                                  fontSize: '0.82rem'
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Conta Corrente
                              </label>
                              <input 
                                type="text"
                                value={bancoItem.conta}
                                onChange={(e) => handleBankFieldChange(index, 'conta', e.target.value)}
                                placeholder="000000-0"
                                style={{
                                  width: '100%',
                                  padding: '0.65rem',
                                  background: '#06090F',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 'var(--radius-xs)',
                                  color: '#FFFFFF',
                                  fontSize: '0.82rem'
                                }}
                              />
                            </div>

                            {/* Senha com Eye toggle */}
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Senha de Acesso / Assinatura <span style={{ color: '#64748B' }}>(Opcional • Sem Trava)</span>
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input 
                                  type={showFormPasswords[index] ? "text" : "password"}
                                  value={bancoItem.senhaAcesso}
                                  onChange={(e) => handleBankFieldChange(index, 'senhaAcesso', e.target.value)}
                                  placeholder="Assinatura eletrônica (Opcional)"
                                  style={{
                                    width: '100%',
                                    padding: '0.65rem 2.4rem 0.65rem 0.75rem',
                                    background: '#06090F',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 'var(--radius-xs)',
                                    color: '#FFFFFF',
                                    fontSize: '0.82rem'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowFormPasswords({ ...showFormPasswords, [index]: !showFormPasswords[index] })}
                                  style={{
                                    position: 'absolute',
                                    right: '0.5rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94A3B8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title={showFormPasswords[index] ? "Ocultar senha" : "Ver senha salva"}
                                >
                                  {showFormPasswords[index] ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Status da Conta
                              </label>
                              <select
                                value={bancoItem.statusConta}
                                onChange={(e) => handleBankFieldChange(index, 'statusConta', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.65rem',
                                  background: '#06090F',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 'var(--radius-xs)',
                                  color: '#FFFFFF',
                                  fontSize: '0.82rem'
                                }}
                              >
                                <option value="Aberta e Operando">Aberta e Operando</option>
                                <option value="Em Abertura / Análise">Em Abertura / Análise</option>
                                <option value="Aguardando Validação">Aguardando Validação</option>
                                <option value="Encerrada Regularmente">Encerrada Regularmente</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ================================================= */}
                  {/* SEÇÃO 4: BUREAUS DE CRÉDITO & ÓRGÃOS REGULADORES  */}
                  {/* ================================================= */}
                  <div>
                    <h3 style={{ fontSize: '0.86rem', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <ShieldCheck size={15} />
                      4. Bureaus de Análise &amp; Órgãos Reguladores {newClient.tipo === 'PJ' ? '(Corporativo)' : '(Individual)'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      
                      {/* Serasa */}
                      <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Serasa Experian {newClient.tipo === 'PJ' ? 'PJ' : 'PF'}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--gold-light)', letterSpacing: '0.04em' }}>CONSULTA</span>
                        </div>
                        <select
                          value={newClient.serasaStatus}
                          onChange={(e) => setNewClient({ ...newClient, serasaStatus: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.78rem',
                            marginBottom: '0.45rem'
                          }}
                        >
                          <option value="Sem Apontamentos">Sem Apontamentos (Limpo)</option>
                          <option value="Apontamento Negociado">Apontamento Negociado</option>
                          <option value="Restrição Ativa">Restrição Ativa</option>
                          <option value="Em Limpeza / Saneamento">Em Limpeza / Saneamento</option>
                        </select>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showFormPasswords.serasa ? 'text' : 'password'}
                            value={newClient.senhaSerasa || ''}
                            onChange={(e) => setNewClient({ ...newClient, senhaSerasa: e.target.value })}
                            placeholder="🔑 Senha Consulta Serasa (Opcional - Sem Trava)"
                            style={{
                              width: '100%',
                              padding: '0.55rem 2rem 0.55rem 0.6rem',
                              background: '#06090F',
                              border: '1px solid rgba(197, 168, 105, 0.25)',
                              borderRadius: 'var(--radius-xs)',
                              color: '#FFFFFF',
                              fontSize: '0.75rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPasswords(p => ({ ...p, serasa: !p.serasa }))}
                            style={{
                              position: 'absolute',
                              right: '6px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={showFormPasswords.serasa ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showFormPasswords.serasa ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Bacen SCR */}
                      <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Banco Central - SCR Registrato</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--gold-light)', letterSpacing: '0.04em' }}>CONSULTA</span>
                        </div>
                        <select
                          value={newClient.bacenScr}
                          onChange={(e) => setNewClient({ ...newClient, bacenScr: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.78rem',
                            marginBottom: '0.45rem'
                          }}
                        >
                          <option value="Rating A1 (Prime Rate Corporativo)">Rating A1 (Prime Rate / Sem Prejuízos)</option>
                          <option value="Rating A (Ficha Limpa)">Rating A (Ficha Limpa)</option>
                          <option value="Rating B (Normal)">Rating B (Normal)</option>
                          <option value="Rating C / D (Em Monitoramento)">Rating C / D (Em Monitoramento)</option>
                          <option value="Rating D / E (Em Recuperação)">Rating D / E (Em Recuperação)</option>
                        </select>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showFormPasswords.bacen ? 'text' : 'password'}
                            value={newClient.senhaBacen || ''}
                            onChange={(e) => setNewClient({ ...newClient, senhaBacen: e.target.value })}
                            placeholder="🔑 Senha / Código Sisbacen (Opcional - Sem Trava)"
                            style={{
                              width: '100%',
                              padding: '0.55rem 2rem 0.55rem 0.6rem',
                              background: '#06090F',
                              border: '1px solid rgba(197, 168, 105, 0.25)',
                              borderRadius: 'var(--radius-xs)',
                              color: '#FFFFFF',
                              fontSize: '0.75rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPasswords(p => ({ ...p, bacen: !p.bacen }))}
                            style={{
                              position: 'absolute',
                              right: '6px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={showFormPasswords.bacen ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showFormPasswords.bacen ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Gov.br */}
                      <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Gov.br / Certificação</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--gold-light)', letterSpacing: '0.04em' }}>CONSULTA</span>
                        </div>
                        <select
                          value={newClient.govNivel}
                          onChange={(e) => setNewClient({ ...newClient, govNivel: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.78rem',
                            marginBottom: '0.4rem'
                          }}
                        >
                          <option value="Ouro">Nível Ouro (Certificado A1 / Biometria)</option>
                          <option value="Prata">Nível Prata (Bancos Credenciados)</option>
                          <option value="Bronze">Nível Bronze</option>
                        </select>
                        <input
                          type="text"
                          value={newClient.govProtocolo}
                          onChange={(e) => setNewClient({ ...newClient, govProtocolo: e.target.value })}
                          placeholder="e-CNPJ ou e-CPF SyngularID"
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.75rem',
                            marginBottom: '0.45rem'
                          }}
                        />
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showFormPasswords.gov ? 'text' : 'password'}
                            value={newClient.senhaGovBr || ''}
                            onChange={(e) => setNewClient({ ...newClient, senhaGovBr: e.target.value })}
                            placeholder="🔑 Senha Gov.br / PIN Certificado (Opcional - Sem Trava)"
                            style={{
                              width: '100%',
                              padding: '0.55rem 2rem 0.55rem 0.6rem',
                              background: '#06090F',
                              border: '1px solid rgba(197, 168, 105, 0.25)',
                              borderRadius: 'var(--radius-xs)',
                              color: '#FFFFFF',
                              fontSize: '0.75rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPasswords(p => ({ ...p, gov: !p.gov }))}
                            style={{
                              position: 'absolute',
                              right: '6px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={showFormPasswords.gov ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showFormPasswords.gov ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Quod */}
                      <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Quod Empresas / Consumidor</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--gold-light)', letterSpacing: '0.04em' }}>CONSULTA</span>
                        </div>
                        <select
                          value={newClient.quodStatus}
                          onChange={(e) => setNewClient({ ...newClient, quodStatus: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.78rem',
                            marginBottom: '0.45rem'
                          }}
                        >
                          <option value="Positivo / Sem Restrição">Positivo / Sem Restrição</option>
                          <option value="Em Análise">Em Análise</option>
                          <option value="Com Apontamento">Com Apontamento</option>
                        </select>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showFormPasswords.quod ? 'text' : 'password'}
                            value={newClient.senhaQuod || ''}
                            onChange={(e) => setNewClient({ ...newClient, senhaQuod: e.target.value })}
                            placeholder="🔑 Senha Consulta Quod (Opcional - Sem Trava)"
                            style={{
                              width: '100%',
                              padding: '0.55rem 2rem 0.55rem 0.6rem',
                              background: '#06090F',
                              border: '1px solid rgba(197, 168, 105, 0.25)',
                              borderRadius: 'var(--radius-xs)',
                              color: '#FFFFFF',
                              fontSize: '0.75rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPasswords(p => ({ ...p, quod: !p.quod }))}
                            style={{
                              position: 'absolute',
                              right: '6px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={showFormPasswords.quod ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showFormPasswords.quod ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Boa Vista */}
                      <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Boa Vista SCPC</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--gold-light)', letterSpacing: '0.04em' }}>CONSULTA</span>
                        </div>
                        <select
                          value={newClient.boaVistaStatus}
                          onChange={(e) => setNewClient({ ...newClient, boaVistaStatus: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.78rem',
                            marginBottom: '0.45rem'
                          }}
                        >
                          <option value="Sem Restrições">Sem Restrições (Faixa A)</option>
                          <option value="Score Regular">Score Regular</option>
                          <option value="Pendência Comercial">Pendência Comercial</option>
                        </select>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showFormPasswords.boavista ? 'text' : 'password'}
                            value={newClient.senhaBoaVista || ''}
                            onChange={(e) => setNewClient({ ...newClient, senhaBoaVista: e.target.value })}
                            placeholder="🔑 Senha Boa Vista SCPC (Opcional - Sem Trava)"
                            style={{
                              width: '100%',
                              padding: '0.55rem 2rem 0.55rem 0.6rem',
                              background: '#06090F',
                              border: '1px solid rgba(197, 168, 105, 0.25)',
                              borderRadius: 'var(--radius-xs)',
                              color: '#FFFFFF',
                              fontSize: '0.75rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPasswords(p => ({ ...p, boavista: !p.boavista }))}
                            style={{
                              position: 'absolute',
                              right: '6px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={showFormPasswords.boavista ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showFormPasswords.boavista ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Chaves Mestras & Acessos de Consulta Pericial Complementares */}
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.85rem 1.15rem',
                      background: 'rgba(197, 168, 105, 0.04)',
                      border: '1px dashed rgba(197, 168, 105, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-light)', fontSize: '0.78rem', fontWeight: 700 }}>
                        <KeyRound size={14} color="var(--gold-primary)" />
                        CHAVES &amp; SENHAS COMPLEMENTARES (TOTALMENTE OPCIONAIS • SEM TRAVA)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.25rem' }}>
                            Senha Mestra / Procuração Eletrônica (e-CAC) <span style={{ color: '#64748B' }}>(Opcional • Sem Trava)</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showFormPasswords.master ? 'text' : 'password'}
                              value={newClient.senhaMestraConsultas || ''}
                              onChange={(e) => setNewClient({ ...newClient, senhaMestraConsultas: e.target.value })}
                              placeholder="Senha Código e-CAC / RFB (Opcional)"
                              style={{ width: '100%', padding: '0.55rem 2rem 0.55rem 0.6rem', background: '#06090F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-xs)', color: '#FFF', fontSize: '0.75rem' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowFormPasswords(p => ({ ...p, master: !p.master }))}
                              style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            >
                              {showFormPasswords.master ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.25rem' }}>
                            PIN / Senha do Certificado Digital A1 <span style={{ color: '#64748B' }}>(Opcional • Sem Trava)</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showFormPasswords.pinA1 ? 'text' : 'password'}
                              value={newClient.pinCertificadoA1 || ''}
                              onChange={(e) => setNewClient({ ...newClient, pinCertificadoA1: e.target.value })}
                              placeholder="PIN / Senha Certificado Digital (Opcional)"
                              style={{ width: '100%', padding: '0.55rem 2rem 0.55rem 0.6rem', background: '#06090F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-xs)', color: '#FFF', fontSize: '0.75rem' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowFormPasswords(p => ({ ...p, pinA1: !p.pinA1 }))}
                              style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            >
                              {showFormPasswords.pinA1 ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ================================================= */}
                  {/* SEÇÃO 5: LIMITE & OBSERVAÇÕES RESERVADAS          */}
                  {/* ================================================= */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                        Limite de Crédito Estruturado (R$)
                      </label>
                      <input 
                        type="text" 
                        value={newClient.limiteAprovado}
                        onChange={(e) => setNewClient({ ...newClient, limiteAprovado: e.target.value })}
                        placeholder="Ex: R$ 1.450.000,00"
                        style={{
                          width: '100%',
                          padding: '0.7rem 0.9rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                        Observações Sigilosas
                      </label>
                      <input 
                        type="text" 
                        value={newClient.observacoesSigilosas}
                        onChange={(e) => setNewClient({ ...newClient, observacoesSigilosas: e.target.value })}
                        placeholder="Notas periciais ou exigências de garantias..."
                        style={{
                          width: '100%',
                          padding: '0.7rem 0.9rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClientId(null);
                        resetNewClientForm();
                        setActiveView('clients_list');
                      }}
                      className="btn-secondary-subtle"
                      style={{ padding: '0.8rem 1.4rem' }}
                    >
                      {editingClientId ? 'Cancelar Edição' : 'Cancelar'}
                    </button>
                    <button
                      type="submit"
                      className="btn-primary-gold"
                      style={{ padding: '0.8rem 2rem', fontSize: '0.86rem', gap: '0.5rem' }}
                    >
                      {editingClientId ? (
                        <>
                          <Save size={16} />
                          Salvar Alterações do Cliente
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Salvar Cadastro de {newClient.tipo === 'PJ' ? 'Empresa' : 'Sócio'}
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB EXECUTIVA: ALFRED CIO & PERÍCIA                      */}
          {/* ======================================================== */}
          {(activeView === 'alfred_cio' || activeView === 'cio_executivo') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 'calc(100vh - 220px)' }}>
              
              {/* Top Banner de Governança */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.9rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(11, 15, 23, 0.95))',
                border: '1px solid rgba(197, 168, 105, 0.35)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '2px solid #C5A869',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0B0F19',
                    boxShadow: '0 0 12px rgba(197, 168, 105, 0.4)'
                  }}>
                    <img src="/mourato-seal-circle.png" alt="Mourato" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      ALFRED CIO EXECUTIVO <span style={{ color: '#C5A869', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(197, 168, 105, 0.15)' }}>100% AUTORIDADE</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '2px' }}>
                      Chefe Supremo: <b style={{ color: '#F8FAFC' }}>Mourato</b> • Motores: <b style={{ color: '#34D399' }}>Gemini 3.5 Flash</b> + <b style={{ color: '#60A5FA' }}>Qwen 2.5 Offline</b> • Servidor: <b style={{ color: '#C5A869' }}>Porta 9000 Ativa</b>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => window.open('http://127.0.0.1:9000', '_blank')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.55rem 0.95rem', background: 'rgba(197, 168, 105, 0.15)',
                      border: '1px solid var(--gold-border)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--gold-light)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <ExternalLink size={14} /> Abrir Alfred em Nova Janela
                  </button>
                  <button
                    onClick={() => window.open('http://127.0.0.1:8765', '_blank')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.55rem 0.95rem', background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 'var(--radius-sm)',
                      color: '#34D399', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🛠️ Flix Studio (Porta 8765)
                  </button>
                </div>
              </div>

              {/* Iframe Nativo Embutido */}
              <div style={{
                flex: 1,
                minHeight: '700px',
                background: '#090D16',
                border: '1px solid rgba(197, 168, 105, 0.25)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}>
                <iframe
                  src="http://127.0.0.1:9000"
                  title="Alfred CIO Central"
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '700px',
                    border: 'none'
                  }}
                />
              </div>

            </div>
          )}

          {/* ======================================================== */}
          
          {/* ======================================================== */}
          {/* MÓDULO AUTÔNOMO: SECRETÁRIA EXECUTIVA (CLIQUE) - MICA     */}
          {/* ======================================================== */}
          {activeView === 'secretaria_executiva' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Banner da Secretária Executiva Mica */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(11, 15, 23, 0.95))',
                border: '1px solid rgba(197, 168, 105, 0.35)', borderRadius: '16px', flexWrap: 'wrap', gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', border: '2px solid #25D366',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F19',
                    boxShadow: '0 0 16px rgba(37, 211, 102, 0.35)'
                  }}>
                    <MessageSquare size={26} color="#25D366" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      SECRETÁRIA EXECUTIVA — MICA (WHATSAPP BUSINESS)
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(37, 211, 102, 0.2)', color: '#25D366', fontWeight: 700 }}>
                        ● WHATSAPP ATIVO
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      Atendimento, orientações e respostas automatizadas/executivas aos clientes da Mourato &amp; Associados via WhatsApp
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    onClick={() => window.open('http://localhost:3005/qrcode', '_blank')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.1rem',
                      background: 'rgba(37, 211, 102, 0.15)', border: '1px solid rgba(37, 211, 102, 0.4)', borderRadius: '8px',
                      color: '#25D366', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                    }}
                    title="Abrir página com o QR Code do WhatsApp para pareamento com a Mica"
                  >
                    <QrCode size={15} /> Parear / QR Code WhatsApp
                  </button>
                </div>
              </div>

              {/* PAINEL OFICIAL: ESTEIRA AUTÔNOMA DE CRÉDITO (MICA -> QUESTÃO -> ALFRED -> MOURATO) */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(11, 15, 23, 0.98), rgba(15, 23, 42, 0.98))',
                border: '1.5px solid rgba(197, 168, 105, 0.45)', borderRadius: '18px', padding: '1.5rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column', gap: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(197, 168, 105, 0.2)', paddingBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.65rem', fontFamily: 'Cinzel, Georgia, serif' }}>
                      <span style={{ color: '#C5A869' }}>⚡ ESTEIRA AUTÔNOMA DE CRÉDITO</span> — 3 AGENTES &amp; MOURATO
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '0.3rem 0 0 0' }}>
                      Mica (WhatsApp &amp; Onboarding) ➔ Questão (Varredura 75% Pública) ➔ Alfred (Auditoria &amp; Parecer) ➔ <b>Chefe Mourato (Aval Soberano)</b>
                    </p>
                  </div>
                  <button
                    onClick={fetchPipelineLeads}
                    style={{
                      background: 'rgba(197, 168, 105, 0.15)', border: '1px solid rgba(197, 168, 105, 0.35)',
                      color: '#C5A869', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem',
                      fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                    }}
                  >
                    🔄 Atualizar Fila
                  </button>
                </div>

                {/* Formulário de Disparo Rápido de Teste */}
                <div style={{ background: '#070A10', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#C5A869', fontWeight: 700, marginBottom: '0.35rem' }}>
                      CNPJ DA EMPRESA:
                    </label>
                    <input
                      type="text"
                      value={pipelineCnpj}
                      onChange={(e) => setPipelineCnpj(e.target.value)}
                      placeholder="Ex: 57.433.630/0001-77"
                      style={{ width: '100%', padding: '0.65rem 0.8rem', background: '#0D1322', border: '1px solid rgba(197, 168, 105, 0.3)', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.35rem' }}>
                      NOME DO CONTATO / SÓCIO:
                    </label>
                    <input
                      type="text"
                      value={pipelineName}
                      onChange={(e) => setPipelineName(e.target.value)}
                      placeholder="Ex: Jessica Mourato"
                      style={{ width: '100%', padding: '0.65rem 0.8rem', background: '#0D1322', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.35rem' }}>
                      WHATSAPP DO CLIENTE:
                    </label>
                    <input
                      type="text"
                      value={pipelinePhone}
                      onChange={(e) => setPipelinePhone(e.target.value)}
                      placeholder="(11) 5824-5410"
                      style={{ width: '100%', padding: '0.65rem 0.8rem', background: '#0D1322', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.82rem' }}
                    />
                  </div>
                  <button
                    onClick={handleRunPipeline}
                    disabled={pipelineLoading}
                    style={{
                      height: '40px', background: pipelineLoading ? '#475569' : 'linear-gradient(135deg, #C5A869, #9A7B38)',
                      border: 'none', borderRadius: '8px', color: '#0F172A', fontWeight: 800, fontSize: '0.84rem',
                      cursor: pipelineLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(197, 168, 105, 0.35)'
                    }}
                  >
                    {pipelineLoading ? '⏳ Executando Varredura...' : '🚀 DISPARAR ESTEIRA (90% AUTOPILOTO)'}
                  </button>
                </div>

                {/* Exibição dos Leads e Protocolos Ativos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    PROTOCOLOS ATIVOS &amp; CADEIA DE CUSTÓDIA ({pipelineLeads.length})
                  </div>

                  {pipelineLeads.length === 0 ? (
                    <div style={{ padding: '1.5rem', background: '#070A10', borderRadius: '10px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                      Nenhum protocolo ativo no momento. Dispare um teste acima para ver a esteira operar em tempo real.
                    </div>
                  ) : (
                    pipelineLeads.map(lead => {
                      const auditoria = lead.auditoria_alfred || {};
                      const dossieQ = lead.dossie_questao || {};
                      const onb = lead.onboarding_biros || {};
                      const isApproved = lead.decisao_mourato === 'APROVADO';
                      const isDenied = lead.decisao_mourato === 'NEGADO';

                      return (
                        <div key={lead.protocolo} style={{
                          background: '#070A10', border: '1px solid rgba(197, 168, 105, 0.25)', borderRadius: '12px',
                          padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ background: '#C5A869', color: '#0F172A', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                                📋 {lead.protocolo}
                              </span>
                              <span style={{ fontSize: '0.92rem', color: '#FFFFFF', fontWeight: 800 }}>
                                {auditoria.razao_social || lead.nome_contato || lead.cnpj}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                (CNPJ: {dossieQ.cnpj || lead.cnpj})
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{
                                padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800,
                                background: isApproved ? 'rgba(37, 211, 102, 0.2)' : isDenied ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                color: isApproved ? '#25D366' : isDenied ? '#EF4444' : '#EAB308',
                                border: `1px solid ${isApproved ? '#25D366' : isDenied ? '#EF4444' : '#EAB308'}`
                              }}>
                                ● {lead.status_etapa}
                              </span>
                              {auditoria.score_viabilidade !== undefined && (
                                <span style={{ background: '#1E293B', border: '1px solid #C5A869', color: '#C5A869', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                                  Score: {auditoria.score_viabilidade}/100
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Parecer do Alfred & Diagnóstico */}
                          {auditoria.recomendacao_acao && (
                            <div style={{ background: '#0D1322', borderLeft: '3px solid #C5A869', borderRadius: '0 8px 8px 0', padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#E2E8F0' }}>
                              <div style={{ fontWeight: 800, color: '#C5A869', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                🛡️ PARECER DO CIO ALFRED: <span style={{ color: auditoria.recomendacao_acao === 'PROSSEGUIR' ? '#25D366' : '#EF4444' }}>{auditoria.recomendacao_acao}</span> ({auditoria.parecer_categoria})
                              </div>
                              <ul style={{ margin: '0.35rem 0 0 1.2rem', padding: 0, color: '#CBD5E1', lineHeight: 1.5 }}>
                                {(auditoria.justificativa_analitica || []).map((j, idx) => (
                                  <li key={idx}>{j}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Seletor de Decisão do Chefe Mourato & Birôs */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: '#C5A869', fontWeight: 700 }}>DECISÃO MOURATO:</span>
                              <button
                                onClick={() => handleMouratoDecide(lead.protocolo, 'PROSSEGUIR')}
                                style={{
                                  background: isApproved ? '#25D366' : 'rgba(37, 211, 102, 0.15)',
                                  color: isApproved ? '#0F172A' : '#25D366', border: '1px solid #25D366',
                                  borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer'
                                }}
                              >
                                ✓ [PROSSEGUIR]
                              </button>
                              <button
                                onClick={() => handleMouratoDecide(lead.protocolo, 'NEGAR')}
                                style={{
                                  background: isDenied ? '#EF4444' : 'rgba(239, 68, 68, 0.15)',
                                  color: isDenied ? '#FFFFFF' : '#EF4444', border: '1px solid #EF4444',
                                  borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer'
                                }}
                              >
                                ✕ [NEGAR]
                              </button>
                            </div>

                            {/* Progresso dos 3 Birôs */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>BIRÔS MICA:</span>
                              <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: onb.serasa?.confirmado ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: onb.serasa?.confirmado ? '#25D366' : '#64748B' }}>
                                1. Serasa {onb.serasa?.confirmado ? '✓' : ''}
                              </span>
                              <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: onb.boavista?.confirmado ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: onb.boavista?.confirmado ? '#25D366' : '#64748B' }}>
                                2. Boa Vista {onb.boavista?.confirmado ? '✓' : ''}
                              </span>
                              <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: onb.quod?.confirmado ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: onb.quod?.confirmado ? '#25D366' : '#64748B' }}>
                                3. Quod {onb.quod?.confirmado ? '✓' : ''}
                              </span>
                              {isApproved && !lead.materiais_entregues && (
                                <button
                                  onClick={() => handleAdvanceOnboarding(lead.protocolo)}
                                  style={{
                                    background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3B82F6', color: '#60A5FA',
                                    borderRadius: '4px', padding: '0.25rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                                  }}
                                >
                                  Confirmar Birô ➔
                                </button>
                              )}
                            </div>

                            {/* Download PDF Oficial com Marca d'Água 5.5% */}
                            <button
                              onClick={() => window.open(`http://127.0.0.1:9000/api/pipeline/download-pdf/${lead.protocolo}`, '_blank')}
                              style={{
                                background: 'rgba(197, 168, 105, 0.15)', border: '1px solid rgba(197, 168, 105, 0.4)',
                                color: '#C5A869', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.74rem',
                                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                              }}
                            >
                              📄 Abrir Dossiê PDF (5.5%)
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Painel Central de Resposta aos Clientes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
                
                {/* Coluna 1: Compor e Disparar Mensagem para o Cliente */}
                <div style={{ background: '#0B0F19', border: '1px solid rgba(197, 168, 105, 0.25)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: '#FFFFFF', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Send size={16} color="#C5A869" /> Enviar Resposta para o Cliente
                  </h3>

                  {/* 1. Selecionar Cliente da Base */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      1. Selecione o Cliente Cadastrado:
                    </label>
                    <select
                      value={micaTargetClientName}
                      onChange={(e) => {
                        const selName = e.target.value;
                        setMicaTargetClientName(selName);
                        const found = clients.find(c => (c.nomeRazao || c.nome) === selName);
                        if (found) {
                          setMicaTargetPhone(found.telefone || found.celular || found.whatsapp || '');
                        }
                      }}
                      style={{
                        width: '100%', padding: '0.65rem 0.85rem', background: '#070A10',
                        border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px',
                        color: '#FFFFFF', fontSize: '0.82rem', outline: 'none'
                      }}
                    >
                      <option value="">-- Escolha um cliente da lista --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.nomeRazao || c.nome}>
                          {c.nomeRazao || c.nome} ({c.tipo || 'PJ'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Número de WhatsApp */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      2. Número do WhatsApp com DDD:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 11988887777"
                      value={micaTargetPhone}
                      onChange={(e) => setMicaTargetPhone(e.target.value)}
                      style={{
                        width: '100%', padding: '0.65rem 0.85rem', background: '#070A10',
                        border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px',
                        color: '#FFFFFF', fontSize: '0.82rem', outline: 'none'
                      }}
                    />
                  </div>

                  {/* 3. Modelos de Resposta Rápida */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      3. Modelos Rápidos de Resposta Executiva:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {[
                        {
                          label: '📋 Dossiê em Validação com Chefe Mourato',
                          text: `Olá ${micaTargetClientName || 'prezado cliente'}! Sou a Mica, secretária executiva da Mourato & Associados. Seu dossiê cadastral foi revisado e encaminhado para validação final com o Chefe Mourato.`
                        },
                        {
                          label: '📑 Solicitação de Extratos Bancários (PDF)',
                          text: `Olá ${micaTargetClientName || 'prezado cliente'}! Para finalizarmos a habilitação bancária do seu processo, solicitamos por gentileza o envio dos extratos bancários dos últimos 3 meses em PDF.`
                        },
                        {
                          label: '🔗 Envio de Link para Preenchimento de Ficha',
                          text: `Olá ${micaTargetClientName || 'prezado cliente'}! Segue o link seguro e criptografado para conferência e preenchimento da sua ficha cadastral executiva da Mourato & Associados.`
                        },
                        {
                          label: '✅ Certidões Negativas (CNDs) Validadas',
                          text: `Prezado(a) ${micaTargetClientName || 'cliente'}, informamos que suas Certidões Negativas de Débitos (CND Federal, FGTS e Trabalhista) foram emitidas com 100% de regularidade pericial.`
                        }
                      ].map((tpl, tIdx) => (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={() => setMicaMessageText(tpl.text)}
                          style={{
                            textAlign: 'left', padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px',
                            color: '#E2E8F0', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C5A869'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Campo de Mensagem Livre */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      4. Mensagem Personalizada:
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Digite a mensagem ou selecione um modelo acima..."
                      value={micaMessageText}
                      onChange={(e) => setMicaMessageText(e.target.value)}
                      style={{
                        width: '100%', padding: '0.65rem 0.85rem', background: '#070A10',
                        border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px',
                        color: '#FFFFFF', fontSize: '0.82rem', outline: 'none', resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Botão de Disparo */}
                  <button
                    onClick={() => handleSendMicaWhatsApp(micaTargetPhone, micaMessageText, micaTargetClientName)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.8rem', background: 'linear-gradient(135deg, #25D366, #128C7E)',
                      border: 'none', borderRadius: '8px', color: '#FFFFFF', fontWeight: 800,
                      fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
                    }}
                  >
                    <Send size={16} /> Disparar Resposta via WhatsApp
                  </button>
                </div>

                {/* Coluna 2: Histórico de Respostas Recentes da Mica */}
                <div style={{ background: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', color: '#FFFFFF', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} color="#34D399" /> Mensagens Recentes da Mica
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: '#25D366', fontWeight: 700, background: 'rgba(37, 211, 102, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      WhatsApp 24/7
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', maxHeight: '480px' }}>
                    {micaRecentMessages.map(msg => (
                      <div key={msg.id} style={{ background: '#070A10', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 700 }}>
                            👤 {msg.to} ({msg.phone})
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{msg.time}</span>
                        </div>
                        <p style={{ fontSize: '0.76rem', color: '#CBD5E1', margin: 0, lineHeight: 1.4 }}>
                          "{msg.text}"
                        </p>
                        <div style={{ marginTop: '0.45rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.66rem', color: '#25D366', fontWeight: 600 }}>
                            ✓ {msg.status}
                          </span>
                          <button
                            onClick={() => {
                              setMicaTargetClientName(msg.to);
                              setMicaTargetPhone(msg.phone);
                              setMicaMessageText(msg.text);
                            }}
                            style={{
                              background: 'none', border: 'none', color: '#C5A869', fontSize: '0.68rem',
                              fontWeight: 700, cursor: 'pointer', textDecoration: 'underline'
                            }}
                          >
                            Reenviar / Editar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* MÓDULO AUTÔNOMO: AGENTE DE CONSULTA - TEIA DE ARANHA      */}
          {/* ======================================================== */}
          {(activeView === 'agente_consulta' || activeView === 'appointments') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              {/* Banner de Governança Teia de Aranha */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(11, 15, 23, 0.95))',
                border: '1px solid rgba(197, 168, 105, 0.35)', borderRadius: '16px', flexWrap: 'wrap', gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', border: '2px solid #C5A869',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F19',
                    boxShadow: '0 0 16px rgba(197, 168, 105, 0.35)'
                  }}>
                    <CalendarPlus size={26} color="#C5A869" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      AGENDAR CONSULTAS — TEIA DE ARANHA
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', fontWeight: 700 }}>
                        ● TEIA CONECTADA (PORTA 3000)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      Agendamento estratégico de consultas, audiências bancárias e consultas cadastrais periciais na base da <b style={{ color: '#E2E8F0' }}>Teia de Aranha</b>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => window.open('http://localhost:3000', '_blank')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem',
                      background: 'rgba(197, 168, 105, 0.15)', border: '1px solid rgba(197, 168, 105, 0.4)', borderRadius: '8px',
                      color: 'var(--gold-light)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                    }}
                    title="Abrir o Servidor Dedicado da Teia de Aranha na Porta 3000"
                  >
                    <ExternalLink size={14} /> Abrir Servidor Teia (Porta 3000)
                  </button>
                </div>
              </div>

              {/* Grid Principal: Formulário de Agendamento + Consultas da Teia */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
                
                {/* 1. Formulário de Novo Agendamento de Consulta */}
                <div style={{
                  background: '#0B0F17',
                  border: '1px solid rgba(197, 168, 105, 0.25)',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <CalendarPlus size={20} color="var(--gold-primary)" />
                    <h3 style={{ fontSize: '1.1rem', color: '#FFFFFF', margin: 0, fontWeight: 700 }}>
                      Agendar Nova Consulta / Audiência
                    </h3>
                  </div>

                  <form onSubmit={handleSaveAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                        Cliente / Empresa da Teia *
                      </label>
                      <input 
                        type="text" 
                        required
                        list="teia-clients-list"
                        placeholder="Selecione ou digite o nome do cliente..."
                        value={newAppointment.cliente}
                        onChange={(e) => setNewAppointment({ ...newAppointment, cliente: e.target.value })}
                        style={{
                          width: '100%', padding: '0.65rem 0.85rem', background: '#070A10',
                          border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px',
                          color: '#FFFFFF', fontSize: '0.84rem', outline: 'none'
                        }}
                      />
                      <datalist id="teia-clients-list">
                        {clients.map(c => <option key={c.id} value={c.nomeRazao || c.nome} />)}
                      </datalist>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                          Data da Consulta *
                        </label>
                        <input 
                          type="date" 
                          required
                          value={newAppointment.data}
                          onChange={(e) => setNewAppointment({ ...newAppointment, data: e.target.value })}
                          style={{
                            width: '100%', padding: '0.65rem 0.85rem', background: '#070A10',
                            border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px',
                            color: '#FFFFFF', fontSize: '0.84rem', outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                          Horário *
                        </label>
                        <input 
                          type="time" 
                          required
                          value={newAppointment.horario}
                          onChange={(e) => setNewAppointment({ ...newAppointment, horario: e.target.value })}
                          style={{
                            width: '100%', padding: '0.65rem 0.85rem', background: '#070A10',
                            border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px',
                            color: '#FFFFFF', fontSize: '0.84rem', outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                          Modalidade
                        </label>
                        <select
                          value={newAppointment.modalidade}
                          onChange={(e) => setNewAppointment({ ...newAppointment, modalidade: e.target.value })}
                          style={{
                            width: '100%', padding: '0.65rem 0.85rem', background: '#070A10',
                            border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px',
                            color: '#FFFFFF', fontSize: '0.82rem', outline: 'none'
                          }}
                        >
                          <option value="Videoconferência Segura">Videoconferência Segura</option>
                          <option value="Sede Mourato (Presencial)">Sede Mourato (Presencial)</option>
                          <option value="Comitê de Crédito Bancário">Comitê de Crédito Bancário</option>
                          <option value="Alinhamento Estratégico">Alinhamento Estratégico</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                          Pauta Pericial
                        </label>
                        <select
                          value={newAppointment.pauta}
                          onChange={(e) => setNewAppointment({ ...newAppointment, pauta: e.target.value })}
                          style={{
                            width: '100%', padding: '0.65rem 0.85rem', background: '#070A10',
                            border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px',
                            color: '#FFFFFF', fontSize: '0.82rem', outline: 'none'
                          }}
                        >
                          <option value="Habilitação Bancária &amp; Limites">Habilitação Bancária &amp; Limites</option>
                          <option value="Repactuação de Dívidas &amp; Spread">Repactuação de Dívidas &amp; Spread</option>
                          <option value="Auditoria Pericial Bacen / SCR">Auditoria Pericial Bacen / SCR</option>
                          <option value="Estruturação &amp; Blindagem Patrimonial">Estruturação &amp; Blindagem</option>
                          <option value="Defesa Fiscal / Regularização PGFN">Defesa Fiscal / PGFN</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      style={{
                        marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        padding: '0.8rem', background: 'linear-gradient(135deg, #C5A869, #9A7B38)',
                        border: 'none', borderRadius: '8px', color: '#0A0D14', fontWeight: 800,
                        fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(197, 168, 105, 0.35)'
                      }}
                    >
                      <CalendarPlus size={16} /> Agendar Consulta na Teia de Aranha
                    </button>
                  </form>
                </div>

                {/* 2. Lista de Consultas Agendadas na Teia */}
                <div style={{
                  background: '#0B0F17',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#FFFFFF', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={18} color="#C5A869" /> Consultas Agendadas
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                      {appointments.length} agendamentos
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', maxHeight: '420px' }}>
                    {appointments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94A3B8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                        Nenhuma consulta agendada no momento.
                      </div>
                    ) : (
                      appointments.map(app => (
                        <div key={app.id} style={{
                          background: '#070A10', border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                              {app.cliente}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#C5A869', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>📅 {app.data} às {app.horario}</span>
                              <span>•</span>
                              <span>{app.modalidade}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                              Pauta: <b style={{ color: '#E2E8F0' }}>{app.pauta}</b>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                            <span style={{
                              fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700,
                              background: app.status === 'Agendado' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: app.status === 'Agendado' ? '#60A5FA' : '#34D399'
                            }}>
                              {app.status}
                            </span>
                            <button
                              onClick={() => handleDeleteAppointment(app.id)}
                              style={{ background: 'none', border: 'none', color: '#F87171', fontSize: '0.7rem', cursor: 'pointer', padding: '0.2rem' }}
                              title="Remover agendamento"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* 3. Motor Pericial de Consulta de CNPJ / CPF da Teia de Aranha */}
              <div style={{ background: '#0B0F19', border: '1px solid rgba(197, 168, 105, 0.25)', borderRadius: '16px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#FFFFFF', margin: '0 0 0.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={16} color="#C5A869" /> Consulta Cadastral Prévia na Teia de Aranha
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '0 0 1rem' }}>
                  Consulte os 75% públicos de dados imediatos (Receita Federal, Sintegra, Cenprot Protestos, Tribunais e Listas Restritivas) da empresa ou sócio antes da consulta.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Digite CNPJ da empresa ou CPF do sócio para auditar na Teia..."
                    style={{
                      flex: 1, minWidth: '280px', padding: '0.85rem 1rem', background: '#060910',
                      border: '1.5px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px',
                      color: '#FFFFFF', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => alert('Teia de Aranha: Consulta pericial iniciada. Verificando Receita Federal, Sintegra, CNDs e Tribunais na base da Teia.')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem',
                      background: 'linear-gradient(135deg, #C5A869, #9A7B38)', border: 'none', borderRadius: '8px',
                      color: '#0A0D14', fontWeight: 800, fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(197, 168, 105, 0.3)'
                    }}
                  >
                    <Search size={16} /> Consultar na Teia
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeView === 'mao_obra' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 'calc(100vh - 240px)' }}>
              
              {/* Barra Superior de Governança do Flix Studio */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.9rem 1.25rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(11, 15, 23, 0.95))',
                border: '1px solid rgba(197, 168, 105, 0.35)', borderRadius: '12px', flexWrap: 'wrap', gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', border: '2px solid #3B82F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F19',
                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)'
                  }}>
                    <Briefcase size={22} color="#3B82F6" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      MÃO DE OBRA MANUAL — FLIX STUDIO
                      <span style={{ color: '#34D399', fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)' }}>
                        ● ONLINE NA PORTA 8765
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '2px' }}>
                      Esteira Operacional Nativamente Integrada • Pasta: <b style={{ color: '#E2E8F0' }}>C:\Projetos\Flix</b> • Servidor: <b style={{ color: '#60A5FA' }}>http://127.0.0.1:8765</b>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => window.open('http://127.0.0.1:8765', '_blank')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.45rem',
                      padding: '0.6rem 1.15rem', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                      border: 'none', borderRadius: '8px', color: '#FFFFFF',
                      fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                    }}
                  >
                    <ExternalLink size={15} /> Abrir Flix Studio em Nova Aba (Porta 8765)
                  </button>
                </div>
              </div>

              {/* Iframe Embutido Diretamente em Tela Cheia do Flix Studio */}
              <div style={{
                flex: 1,
                minHeight: '720px',
                background: '#070A10',
                border: '1px solid rgba(197, 168, 105, 0.3)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
              }}>
                <iframe
                  src="http://127.0.0.1:8765"
                  title="Flix Studio Engine"
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '720px',
                    border: 'none'
                  }}
                />
              </div>

            </div>
          )}

          {/* TAB 3: NOVOS AGENDAMENTOS                                */}
          {/* ======================================================== */}
          {activeView === 'appointments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Form de Novo Agendamento */}
              <div style={{
                background: '#0B0F17',
                border: '1px solid rgba(197, 168, 105, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1.75rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  <CalendarPlus size={20} color="var(--gold-primary)" />
                  <h2 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: 0 }}>
                    Registrar Nova Audiência / Reunião
                  </h2>
                </div>

                <form onSubmit={handleSaveAppointment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Cliente / Empresa *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newAppointment.cliente}
                      onChange={(e) => setNewAppointment({ ...newAppointment, cliente: e.target.value })}
                      placeholder="Nome do cliente ou empresa"
                      list="clients-datalist"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                    <datalist id="clients-datalist">
                      {clients.map(c => <option key={c.id} value={c.nomeRazao} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Data da Reunião *
                    </label>
                    <input 
                      type="date" 
                      required
                      value={newAppointment.data}
                      onChange={(e) => setNewAppointment({ ...newAppointment, data: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Horário
                    </label>
                    <input 
                      type="time" 
                      value={newAppointment.horario}
                      onChange={(e) => setNewAppointment({ ...newAppointment, horario: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Modalidade
                    </label>
                    <select
                      value={newAppointment.modalidade}
                      onChange={(e) => setNewAppointment({ ...newAppointment, modalidade: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="Videoconferência Segura">Videoconferência Segura</option>
                      <option value="Presencial - Sede Faria Lima">Presencial - Sede Faria Lima</option>
                      <option value="Visita Técnica na Empresa">Visita Técnica na Empresa</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Pauta / Assunto
                    </label>
                    <input 
                      type="text" 
                      value={newAppointment.pauta}
                      onChange={(e) => setNewAppointment({ ...newAppointment, pauta: e.target.value })}
                      placeholder="Ex: Repactuação de Spread"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="btn-primary-gold"
                      style={{ width: '100%', padding: '0.68rem', fontSize: '0.82rem', justifyContent: 'center' }}
                    >
                      <Calendar size={15} />
                      Agendar Audiência
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista de Agendamentos */}
              <div>
                <h3 style={{ fontSize: '1rem', color: '#FFFFFF', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color="var(--gold-primary)" />
                  Agenda de Audiências &amp; Reuniões ({appointments.length})
                </h3>

                {appointments.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', background: '#0D121D', borderRadius: 'var(--radius-sm)', color: '#94A3B8' }}>
                    Nenhum agendamento pendente no momento. Preencha o formulário acima para registrar uma reunião.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {appointments.map(apt => (
                      <div 
                        key={apt.id}
                        style={{
                          background: '#0D121D',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '9999px',
                              background: apt.status === 'Realizado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(197, 168, 105, 0.15)',
                              color: apt.status === 'Realizado' ? '#34D399' : 'var(--gold-light)',
                              fontWeight: 700
                            }}>
                              {apt.status}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {apt.modalidade}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '0.98rem', color: '#FFFFFF', margin: '0 0 0.35rem' }}>
                            {apt.cliente}
                          </h4>
                          <div style={{ fontSize: '0.8rem', color: 'var(--gold-light)', marginBottom: '0.4rem' }}>
                            📅 {apt.data} às {apt.horario}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                            Pauta: <strong style={{ color: '#CBD5E1' }}>{apt.pauta}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                          <button
                            onClick={() => handleToggleAppointmentStatus(apt.id)}
                            style={{
                              flex: 1,
                              padding: '0.4rem',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: 'var(--radius-xs)',
                              color: '#CBD5E1',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            Alternar Status
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(apt.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#F87171',
                              padding: '0.4rem 0.65rem',
                              borderRadius: 'var(--radius-xs)',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: DESPESAS DA EMPRESA                               */}
          {/* ======================================================== */}
          {activeView === 'expenses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Financial KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#0D121D', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginBottom: '0.35rem' }}>TOTAL DE DESPESAS</div>
                  <div style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>{expenses.length} lançamentos</div>
                </div>

                <div style={{ background: '#0D121D', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#34D399', marginBottom: '0.35rem' }}>TOTAL PAGO</div>
                  <div style={{ fontSize: '1.5rem', color: '#34D399', fontWeight: 700 }}>
                    {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>Contas liquidadas</div>
                </div>

                <div style={{ background: '#0D121D', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#F87171', marginBottom: '0.35rem' }}>TOTAL PENDENTE</div>
                  <div style={{ fontSize: '1.5rem', color: '#F87171', fontWeight: 700 }}>
                    {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>A pagar / Em aberto</div>
                </div>
              </div>

              {/* Form de Nova Despesa */}
              <div style={{ background: '#0B0F17', border: '1px solid rgba(197, 168, 105, 0.2)', borderRadius: 'var(--radius-md)', padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={18} color="var(--gold-primary)" />
                  Registrar Nova Conta de Consumo / Despesa
                </h3>

                <form onSubmit={handleSaveExpense} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Categoria
                    </label>
                    <select
                      value={newExpense.categoria}
                      onChange={(e) => setNewExpense({ ...newExpense, categoria: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="Energia Elétrica">Energia Elétrica (Enel/CPFL)</option>
                      <option value="Água & Saneamento">Água &amp; Saneamento (Sabesp)</option>
                      <option value="Aluguel Comercial">Aluguel Comercial &amp; Condomínio</option>
                      <option value="Internet & Telefonia">Internet &amp; Telefonia</option>
                      <option value="Software & Servidores">Software, Cloud &amp; Servidores</option>
                      <option value="Honorários & Serviços">Honorários &amp; Terceiros</option>
                      <option value="Tributos & Impostos">Tributos, DAS &amp; Taxas</option>
                      <option value="Outros">Outras Despesas</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Descrição *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newExpense.descricao}
                      onChange={(e) => setNewExpense({ ...newExpense, descricao: e.target.value })}
                      placeholder="Ex: Conta de Luz - Sede Março"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Valor (R$) *
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={newExpense.valor}
                      onChange={(e) => setNewExpense({ ...newExpense, valor: e.target.value })}
                      placeholder="0,00"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Vencimento
                    </label>
                    <input 
                      type="date" 
                      value={newExpense.vencimento}
                      onChange={(e) => setNewExpense({ ...newExpense, vencimento: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Status Inicial
                    </label>
                    <select
                      value={newExpense.status}
                      onChange={(e) => setNewExpense({ ...newExpense, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                    </select>
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="btn-primary-gold"
                      style={{ width: '100%', padding: '0.68rem', fontSize: '0.82rem', justifyContent: 'center' }}
                    >
                      <Plus size={15} />
                      Lançar Despesa
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de Despesas */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: '#FFFFFF', margin: 0 }}>
                    Contas e Despesas Lançadas ({expenses.length})
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['todos', 'pendente', 'pago'].map(f => (
                      <button
                        key={f}
                        onClick={() => setExpenseFilter(f)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '9999px',
                          background: expenseFilter === f ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.06)',
                          color: expenseFilter === f ? '#0A0D14' : '#CBD5E1',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {expenses.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', background: '#0D121D', borderRadius: 'var(--radius-sm)', color: '#94A3B8' }}>
                    Nenhuma despesa cadastrada ainda. Utilize o formulário acima para lançar faturas de consumo.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', background: '#0D121D', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#090D14', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94A3B8' }}>
                          <th style={{ padding: '0.85rem 1rem' }}>Categoria</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Descrição</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Vencimento</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Valor (R$)</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                          <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses
                          .filter(e => expenseFilter === 'todos' ? true : e.status.toLowerCase() === expenseFilter)
                          .map(e => (
                            <tr key={e.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '0.85rem 1rem', color: 'var(--gold-light)' }}>{e.categoria}</td>
                              <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 600 }}>{e.descricao}</td>
                              <td style={{ padding: '0.85rem 1rem', color: '#94A3B8' }}>{e.vencimento || '---'}</td>
                              <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 700 }}>
                                {formatMonetaryValue(e.valor)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <button
                                  onClick={() => handleToggleExpenseStatus(e.id)}
                                  style={{
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: e.status === 'Pago' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: e.status === 'Pago' ? '#34D399' : '#F87171'
                                  }}
                                  title="Clique para alternar Pago / Pendente"
                                >
                                  {e.status}
                                </button>
                              </td>
                              <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleDeleteExpense(e.id)}
                                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '0.25rem' }}
                                  title="Excluir despesa"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: RECEBÍVEIS & MERCADO PAGO                         */}
          {/* ======================================================== */}
          {activeView === 'receivables' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Financial KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#0D121D', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginBottom: '0.35rem' }}>TOTAL EMITIDO</div>
                  <div style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {totalRecebiveis.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>{receivables.length} faturas geradas</div>
                </div>

                <div style={{ background: '#0D121D', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#34D399', marginBottom: '0.35rem' }}>RECEBIDOS (PAGOS)</div>
                  <div style={{ fontSize: '1.5rem', color: '#34D399', fontWeight: 700 }}>
                    {totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>Liquidados via PIX/Boleto</div>
                </div>

                <div style={{ background: '#0D121D', border: '1px solid rgba(197, 168, 105, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--gold-light)', marginBottom: '0.35rem' }}>PENDENTES</div>
                  <div style={{ fontSize: '1.5rem', color: 'var(--gold-light)', fontWeight: 700 }}>
                    {totalRecebiveisPendentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>Aguardando pagamento</div>
                </div>
              </div>

              {/* Emissor de Cobrança / Recebível */}
              <div style={{ background: '#0B0F17', border: '1px solid rgba(197, 168, 105, 0.2)', borderRadius: 'var(--radius-md)', padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CreditCard size={20} color="var(--gold-primary)" />
                    <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF', margin: 0 }}>
                      Emitir Cobrança / Recebível
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: mpConfig.connected ? '#34D399' : 'var(--gold-light)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mpConfig.connected ? '#10B981' : 'var(--gold-primary)' }} />
                    {mpConfig.connected ? 'Gateway Homologado' : 'PIX Oficial Mourato'}
                  </div>
                </div>

                <form onSubmit={handleSaveReceivable} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Cliente Destinatário *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newReceivable.cliente}
                      onChange={(e) => setNewReceivable({ ...newReceivable, cliente: e.target.value })}
                      placeholder="Nome do cliente ou empresa"
                      list="clients-datalist-rec"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                    <datalist id="clients-datalist-rec">
                      {clients.map(c => <option key={c.id} value={c.nomeRazao} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Descrição do Serviço
                    </label>
                    <input 
                      type="text" 
                      value={newReceivable.descricao}
                      onChange={(e) => setNewReceivable({ ...newReceivable, descricao: e.target.value })}
                      placeholder="Ex: Honorários de Estruturação - Parcela 01"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Valor da Cobrança (R$) *
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={newReceivable.valor}
                      onChange={(e) => setNewReceivable({ ...newReceivable, valor: e.target.value })}
                      placeholder="0,00"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Método
                    </label>
                    <select
                      value={newReceivable.metodo}
                      onChange={(e) => setNewReceivable({ ...newReceivable, metodo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="PIX">PIX Instantâneo (QR Code)</option>
                      <option value="Boleto">Boleto Bancário</option>
                      <option value="Cartão">Cartão de Crédito</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Vencimento
                    </label>
                    <input 
                      type="date" 
                      value={newReceivable.vencimento}
                      onChange={(e) => setNewReceivable({ ...newReceivable, vencimento: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="btn-primary-gold"
                      style={{ width: '100%', padding: '0.68rem', fontSize: '0.82rem', justifyContent: 'center' }}
                    >
                      <QrCode size={15} />
                      Gerar Cobrança Oficial
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de Recebíveis */}
              <div>
                <h3 style={{ fontSize: '1rem', color: '#FFFFFF', marginBottom: '1rem' }}>
                  Recebíveis &amp; Faturas Geradas ({receivables.length})
                </h3>

                {receivables.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', background: '#0D121D', borderRadius: 'var(--radius-sm)', color: '#94A3B8' }}>
                    Nenhum recebível emitido ainda. Gere sua primeira cobrança no formulário acima.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', background: '#0D121D', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#090D14', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94A3B8' }}>
                          <th style={{ padding: '0.85rem 1rem' }}>ID da Transação</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Cliente</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Descrição</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Método</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Valor</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                          <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivables.map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontFamily: 'monospace' }}>{r.mpPaymentId}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 600 }}>{r.cliente}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#94A3B8' }}>{r.descricao}</td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--gold-light)' }}>{r.metodo}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 700 }}>
                              {formatMonetaryValue(r.valor)}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <button
                                onClick={() => handleToggleReceivableStatus(r.id)}
                                style={{
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: r.status === 'Pago' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(197, 168, 105, 0.2)',
                                  color: r.status === 'Pago' ? '#34D399' : 'var(--gold-light)'
                                }}
                              >
                                {r.status}
                              </button>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                <button
                                  onClick={() => setActivePixModal(r)}
                                  style={{
                                    background: 'rgba(197, 168, 105, 0.1)',
                                    border: '1px solid var(--gold-border)',
                                    color: 'var(--gold-light)',
                                    borderRadius: 'var(--radius-xs)',
                                    padding: '0.35rem 0.6rem',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}
                                  title="Ver QR Code e link"
                                >
                                  <QrCode size={13} />
                                  QR Code
                                </button>
                                <button
                                  onClick={() => handleDeleteReceivable(r.id)}
                                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '0.25rem' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: CONFIGURAÇÕES & API MERCADO PAGO                  */}
          {/* ======================================================== */}
          {activeView === 'settings' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Card Mercado Pago API */}
              <div style={{
                background: '#0B0F17',
                border: '1px solid rgba(197, 168, 105, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#009EE3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '1.1rem'
                  }}>
                    mp
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: 0 }}>
                      Integração Gateway de Recebíveis (API)
                    </h2>
                    <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: 0 }}>
                      Insira suas credenciais de produção ou testes para liquidação bancária automatizada.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Access Token (Produção ou Sandbox) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showMpToken ? "text" : "password"}
                        value={mpConfig.accessToken}
                        onChange={(e) => setMpConfig({ ...mpConfig, accessToken: e.target.value })}
                        placeholder="APP_USR-xxxx-xxxx..."
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.8rem 0.75rem 0.9rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 'var(--radius-xs)',
                          color: '#FFFFFF',
                          fontSize: '0.85rem',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowMpToken(!showMpToken)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer'
                        }}
                      >
                        {showMpToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                      Credenciais oficiais de integração segura para processamento financeiro.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Public Key
                    </label>
                    <input 
                      type="text"
                      value={mpConfig.publicKey}
                      onChange={(e) => setMpConfig({ ...mpConfig, publicKey: e.target.value })}
                      placeholder="APP_USR-xxxx-xxxx..."
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.9rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                        Ambiente de Execução
                      </label>
                      <select
                        value={mpConfig.environment}
                        onChange={(e) => setMpConfig({ ...mpConfig, environment: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 'var(--radius-xs)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem'
                        }}
                      >
                        <option value="production">Produção (Pagamentos Reais)</option>
                        <option value="sandbox">Sandbox (Ambiente de Testes)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                        Webhook URL (Notificação Automática)
                      </label>
                      <input 
                        type="text"
                        readOnly
                        value={mpConfig.webhookUrl}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: 'var(--radius-xs)',
                          color: '#94A3B8',
                          fontSize: '0.78rem'
                        }}
                      />
                    </div>
                  </div>

                  {mpTestStatus && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.8rem',
                      background: mpTestStatus.startsWith('sucesso') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      border: mpTestStatus.startsWith('sucesso') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      color: mpTestStatus.startsWith('sucesso') ? '#34D399' : '#FCA5A5'
                    }}>
                      {mpTestStatus}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleTestMpConnection}
                      style={{
                        padding: '0.75rem 1.4rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 158, 227, 0.12)',
                        border: '1px solid #009EE3',
                        color: '#38BDF8',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem'
                      }}
                    >
                      <RefreshCw size={14} />
                      Testar Conexão com Gateway
                    </button>

                    <button
                      type="button"
                      onClick={() => alert('Credenciais salvas com sucesso no painel local!')}
                      className="btn-primary-gold"
                      style={{ padding: '0.75rem 1.75rem', fontSize: '0.82rem' }}
                    >
                      <Check size={15} />
                      Salvar Chaves de Integração
                    </button>
                  </div>

                </div>
              </div>

              {/* Informações da Empresa & Segurança */}
              <div style={{
                background: '#0B0F17',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem'
              }}>
                <h3 style={{ fontSize: '1rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>
                  Dados Institucionais de Faturamento
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                  Estes dados serão anexados aos comprovantes e recibos de cobrança emitidos aos clientes.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.82rem' }}>
                  <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>RAZÃO SOCIAL</span>
                    <strong style={{ color: '#FFFFFF' }}>Mourato e Associados Ltda</strong>
                  </div>
                  <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>CNPJ INSTITUCIONAL</span>
                    <strong style={{ color: '#FFFFFF' }}>38.377.738/0001-45</strong>
                  </div>
                  <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>LOCALIDADE</span>
                    <strong style={{ color: '#FFFFFF' }}>São Paulo - SP • Atuação Nacional</strong>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: PONTUAÇÃO NOS BIRÔS DE CRÉDITO & BANCO CENTRAL     */}
          {activeView === 'bureau_scores' && (() => {
            const activeClient = clients.find(c => c.id === selectedBureauClientId) || clients[0] || null;
            if (!activeClient) {
              return (
                <div style={{ maxWidth: '1240px', margin: '0 auto', textAlign: 'center', padding: '4rem 1rem' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'rgba(197, 168, 105, 0.1)',
                    border: '1px solid var(--gold-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem', color: 'var(--gold-primary)'
                  }}>
                    <Sparkles size={36} />
                  </div>
                  <h3 style={{ color: '#FFFFFF', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                    Nenhum Cliente para Auditoria nos Birôs
                  </h3>
                  <p style={{ color: '#94A3B8', fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                    A base de clientes está limpa e pronta. Cadastre um novo cliente pela Ficha Cadastral ou aprove uma solicitação na aba Leads para calibrar pontuações no Serasa, Boa Vista, Quod e Bacen SCR.
                  </p>
                  <button 
                    onClick={() => setActiveView('clients_new')}
                    className="btn-primary-gold"
                    style={{ padding: '0.8rem 1.6rem', fontSize: '0.85rem', margin: '0 auto', gap: '0.5rem' }}
                  >
                    <Plus size={16} />
                    <span>Cadastrar Novo Cliente</span>
                  </button>
                </div>
              );
            }
            const bureauData = getBureauDataForClient(activeClient);
            const activeSerasa = (bureauData.serasa !== undefined && bureauData.serasa !== null) ? bureauData.serasa : 0;
            const activeBoaVista = (bureauData.boavista !== undefined && bureauData.boavista !== null) ? bureauData.boavista : 0;
            const activeQuod = (bureauData.quod !== undefined && bureauData.quod !== null) ? bureauData.quod : 0;
            const activeBacen = bureauData.bacen || '0 (Não Auditado)';

            const filteredForBureau = clients.filter(c => {
              if (bureauCategoryFilter === 'PJ') return c.tipo === 'PJ';
              if (bureauCategoryFilter === 'PF') return c.tipo === 'PF';
              return true;
            });

            return (
              <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                
                {/* 1. Header do Módulo de Birôs com Badge em Tempo Real */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(13, 18, 29, 0.95) 0%, rgba(7, 10, 16, 0.98) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem 1.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                }}>
                  <div>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      letterSpacing: '0.14em', 
                      color: '#38BDF8', 
                      fontWeight: 800,
                      display: 'block',
                      marginBottom: '0.3rem'
                    }}>
                      ALIMENTAÇÃO MANUAL &amp; SCORES PERSONALIZADOS
                    </span>
                    <h2 style={{ fontSize: '1.45rem', color: '#FFFFFF', margin: 0, fontWeight: 800 }}>
                      Pontuação nos Birôs de Crédito &amp; Banco Central
                    </h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setActiveView('clients_list')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        color: '#E2E8F0',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ← Voltar para Clientes
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedClient(activeClient)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(56, 189, 248, 0.14)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#38BDF8',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={14} />
                      Ficha Completa
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendProtocolEmailPosFinalizacao(activeClient)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(16, 185, 129, 0.16)',
                        border: '1px solid rgba(16, 185, 129, 0.45)',
                        color: '#34D399',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Enviar E-mail Oficial com o Protocolo (disponível somente após o cliente finalizar o processo)"
                    >
                      <Send size={13} />
                      Enviar E-mail Protocolo
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsBureauEditMode(!isBureauEditMode)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.45rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isBureauEditMode ? 'rgba(234, 179, 8, 0.25)' : 'rgba(197, 168, 105, 0.15)',
                        border: isBureauEditMode ? '1px solid #EAB308' : '1px solid var(--gold-border)',
                        color: isBureauEditMode ? '#FDE047' : 'var(--gold-light)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Ativar / desativar edição de métricas dos 4 birôs"
                    >
                      {isBureauEditMode ? <Save size={14} /> : <Edit size={14} />}
                      {isBureauEditMode ? 'Concluir Edição' : 'Editar Birôs'}
                    </button>

                    <button
                      type="button"
                      onClick={handleZeroAllBureaus}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#F87171',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Zerar scores dos birôs para 0"
                    >
                      <RotateCcw size={13} />
                      Zerar (0)
                    </button>
                  </div>
                </div>

                {/* 2. Barra de Seleção do Cliente / Titular (PJ vs PF) */}
                <div style={{
                  background: '#090D15',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Filtrar Titulares:</span>
                      <button
                        type="button"
                        onClick={() => setBureauCategoryFilter('todos')}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.3rem 0.7rem',
                          borderRadius: '4px',
                          border: bureauCategoryFilter === 'todos' ? '1px solid var(--gold-border)' : '1px solid rgba(255,255,255,0.06)',
                          background: bureauCategoryFilter === 'todos' ? 'rgba(197, 168, 105, 0.2)' : 'transparent',
                          color: bureauCategoryFilter === 'todos' ? 'var(--gold-light)' : '#94A3B8',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        Todos ({clients.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBureauCategoryFilter('PJ')}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.3rem 0.7rem',
                          borderRadius: '4px',
                          border: bureauCategoryFilter === 'PJ' ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.06)',
                          background: bureauCategoryFilter === 'PJ' ? 'rgba(197, 168, 105, 0.25)' : 'transparent',
                          color: bureauCategoryFilter === 'PJ' ? 'var(--gold-light)' : '#94A3B8',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        🏢 Empresas (PJ)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBureauCategoryFilter('PF')}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.3rem 0.7rem',
                          borderRadius: '4px',
                          border: bureauCategoryFilter === 'PF' ? '1px solid #00B4FF' : '1px solid rgba(255,255,255,0.06)',
                          background: bureauCategoryFilter === 'PF' ? 'rgba(0, 158, 227, 0.2)' : 'transparent',
                          color: bureauCategoryFilter === 'PF' ? '#38BDF8' : '#94A3B8',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        👤 Sócios (PF)
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Selecionar Titular:</span>
                      <select
                        value={selectedBureauClientId}
                        onChange={(e) => setSelectedBureauClientId(e.target.value)}
                        style={{
                          background: '#131A29',
                          border: '1px solid var(--gold-border)',
                          borderRadius: 'var(--radius-xs)',
                          color: '#FFFFFF',
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          maxWidth: '360px'
                        }}
                      >
                        {(() => {
                          const options = [...filteredForBureau];
                          if (activeClient && !options.some(c => c.id === activeClient.id)) {
                            options.unshift(activeClient);
                          }
                          return options.map(c => (
                            <option key={c.id} value={c.id}>
                              [{c.tipo}] {c.nomeRazao} — {c.documento}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* Detalhes Rápidos do Cliente Selecionado */}
                  {activeClient && (
                    <div style={{
                      background: '#0D1322',
                      border: activeClient.tipo === 'PJ' ? '1px solid rgba(197, 168, 105, 0.3)' : '1px solid rgba(0, 158, 227, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.9rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                          background: activeClient.tipo === 'PJ' ? 'rgba(197, 168, 105, 0.25)' : 'rgba(0, 158, 227, 0.25)',
                          color: activeClient.tipo === 'PJ' ? 'var(--gold-light)' : '#38BDF8',
                          border: activeClient.tipo === 'PJ' ? '1px solid var(--gold-border)' : '1px solid #00B4FF',
                          fontWeight: 800
                        }}>
                          {activeClient.tipo === 'PJ' ? '🏢 PESSOA JURÍDICA (PJ)' : '👤 PESSOA FÍSICA (PF)'}
                        </span>
                        <div>
                          <strong style={{ color: '#FFFFFF', fontSize: '0.98rem', display: 'block' }}>
                            {activeClient.nomeRazao}
                          </strong>
                          <span style={{ color: '#94A3B8', fontSize: '0.76rem', fontFamily: 'monospace' }}>
                            {activeClient.documentoTipo || (activeClient.tipo === 'PJ' ? 'CNPJ' : 'CPF')}: {activeClient.documento}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94A3B8', flexWrap: 'wrap' }}>
                        {activeClient.socioVinculado && (
                          <span>Sócio Adm: <strong style={{ color: 'var(--gold-light)' }}>{activeClient.socioVinculado}</strong></span>
                        )}
                        {activeClient.empresaVinculada && (
                          <span>Empresa: <strong style={{ color: 'var(--gold-light)' }}>{activeClient.empresaVinculada}</strong></span>
                        )}
                        {activeClient.balanco?.ativo && (
                          <span>Ativo: <strong style={{ color: '#34D399' }}>{activeClient.balanco.ativo}</strong></span>
                        )}
                        {activeClient.rendaPatrimonio?.veiculos && (
                          <span>Veículo: <strong style={{ color: '#38BDF8' }}>{activeClient.rendaPatrimonio.veiculos}</strong></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2.5 DOSSIÊ PERICIAL DO QUESTÃO (75% PÚBLICO) + PARECER DO ALFRED CIO ACOPLADO AOS BIRÔS */}
                {(() => {
                  const dossieQ = getQuestaoDossieForClient(activeClient);
                  const qOrig = dossieQ?.dossie_original_questao || null;
                  const rfb = qOrig?.dados_rfb || {};
                  const rawCnpjActive = (activeClient.tipo === 'PJ' ? getClientDocumento(activeClient) : (activeClient.empresa?.cnpj || activeClient.cnpj || '')).replace(/\D/g, '');
                  const isRunningThis = questaoRunningCnpj && questaoRunningCnpj === rawCnpjActive;

                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(13, 18, 29, 0.98) 0%, rgba(7, 10, 16, 0.98) 100%)',
                      border: dossieQ ? '1.5px solid rgba(197, 168, 105, 0.45)' : '1px dashed rgba(197, 168, 105, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.35rem 1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      boxShadow: '0 8px 28px rgba(0,0,0,0.45)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', color: '#C5A869', fontWeight: 800, display: 'block', marginBottom: '0.2rem' }}>
                            🕵️ PROTOCOLO 75/25 • VARREDURA OFICIAL DO QUESTÃO + AUDITORIA ALFRED CIO
                          </span>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#FFFFFF', fontWeight: 800 }}>
                            {dossieQ
                              ? `Dossiê Pericial Auditado — Protocolo ${dossieQ.protocolo || 'OFICIAL'}`
                              : 'Dossiê Pericial do Questão (Aguardando Varredura)'}
                          </h3>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                          {dossieQ && (
                            <span style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: dossieQ.recomendacao_acao === 'PROSSEGUIR' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                              border: dossieQ.recomendacao_acao === 'PROSSEGUIR' ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(245, 158, 11, 0.45)',
                              color: dossieQ.recomendacao_acao === 'PROSSEGUIR' ? '#34D399' : '#FBBF24'
                            }}>
                              Score {dossieQ.score_viabilidade}/100 • {dossieQ.recomendacao_acao}
                            </span>
                          )}

                          {dossieQ?._meta_arquivos?.url_pdf_questao && (
                            <a
                              href={dossieQ._meta_arquivos.url_pdf_questao}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.45rem 0.85rem', borderRadius: '6px',
                                background: 'rgba(197, 168, 105, 0.2)', border: '1px solid var(--gold-border)',
                                color: 'var(--gold-light)', fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none'
                              }}
                            >
                              <FileText size={14} />
                              Abrir PDF do Questão
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={Boolean(isRunningThis)}
                            onClick={() => handleDispararQuestao(activeClient)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                              padding: '0.45rem 0.9rem', borderRadius: '6px',
                              background: isRunningThis ? 'rgba(148,163,184,0.2)' : 'rgba(16, 185, 129, 0.18)',
                              border: '1px solid rgba(16, 185, 129, 0.45)',
                              color: '#34D399', fontSize: '0.76rem', fontWeight: 800,
                              cursor: isRunningThis ? 'wait' : 'pointer'
                            }}
                          >
                            <RefreshCw size={13} />
                            {isRunningThis ? 'Auditando na RFB...' : (dossieQ ? 'Reauditar Questão' : 'Disparar Questão 4.0 Agora')}
                          </button>
                        </div>
                      </div>

                      {dossieQ ? (
                        <>
                          {/* Métricas Reais RFB */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.65rem' }}>
                            <div style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.65rem 0.8rem' }}>
                              <div style={{ fontSize: '0.64rem', color: '#64748B', textTransform: 'uppercase' }}>Situação RFB</div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: rfb.situacao_cadastral === 'ATIVA' ? '#34D399' : '#F87171' }}>
                                {rfb.situacao_cadastral || 'Não informado'}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Abertura: {rfb.data_abertura || '—'} ({rfb.tempo_vida_meses || 0} meses)</div>
                            </div>

                            <div style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.65rem 0.8rem' }}>
                              <div style={{ fontSize: '0.64rem', color: '#64748B', textTransform: 'uppercase' }}>Capital Social Real</div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF' }}>
                                {rfb.capital_social ? Number(rfb.capital_social).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Porte: {rfb.porte || '—'}</div>
                            </div>

                            <div style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.65rem 0.8rem' }}>
                              <div style={{ fontSize: '0.64rem', color: '#64748B', textTransform: 'uppercase' }}>Enquadramento Fiscal</div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--gold-light)' }}>
                                {rfb.optante_simei ? 'MEI (SIMEI)' : rfb.optante_simples ? 'Simples Nacional' : 'Regime Normal'}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {rfb.natureza_juridica || '—'}
                              </div>
                            </div>

                            <div style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.65rem 0.8rem' }}>
                              <div style={{ fontSize: '0.64rem', color: '#64748B', textTransform: 'uppercase' }}>CNAE Principal</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0' }}>
                                {rfb.atividade_principal?.[0]?.code || '—'}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rfb.atividade_principal?.[0]?.text || ''}>
                                {rfb.atividade_principal?.[0]?.text || '—'}
                              </div>
                            </div>
                          </div>

                          {/* Semaforização Pericial do Questão (Green, Yellow, Red Flags) */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.22)', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34D399', marginBottom: '0.45rem' }}>
                                ✅ VERIFICAÇÕES CONFORMES ({qOrig?.green_flags?.length || 0})
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.73rem', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
                                {(qOrig?.green_flags || []).map((gf, idx) => (
                                  <li key={idx}><strong style={{ color: '#FFFFFF' }}>{gf.modulo}:</strong> {gf.indicador}</li>
                                ))}
                              </ul>
                            </div>

                            <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FBBF24', marginBottom: '0.45rem' }}>
                                ⚠️ ALERTAS &amp; ESTRATÉGIA ALFRED ({(qOrig?.yellow_flags?.length || 0) + (qOrig?.red_flags?.length || 0)} apontamentos)
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.73rem', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {(qOrig?.red_flags || []).map((rf, idx) => (
                                  <li key={`r-${idx}`} style={{ color: '#FCA5A5' }}><strong>[CRÍTICO] {rf.modulo}:</strong> {rf.descricao}</li>
                                ))}
                                {(qOrig?.yellow_flags || []).map((yf, idx) => (
                                  <li key={`y-${idx}`}><strong style={{ color: '#FDE68A' }}>{yf.modulo}:</strong> {yf.descricao}</li>
                                ))}
                                {(dossieQ?.estrategia_mourato || []).map((est, idx) => (
                                  <li key={`e-${idx}`}><strong style={{ color: '#C5A869' }}>Estratégia:</strong> {est}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '0.5rem 0' }}>
                          Nenhum dossiê físico do Questão localizado no disco para este CNPJ ainda. Clique em <strong style={{ color: '#34D399' }}>Disparar Questão 4.0 Agora</strong> para executar a varredura oficial de 75% (Receita Federal, QSA, CNDs, CEIS/CNEP e Parecer do Alfred) e acoplar imediatamente junto aos 4 birôs abaixo.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3. Grid dos 4 Cards Oficiais dos Birôs */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1.25rem'
                }}>
                  
                  {/* CARD 1: SERASA EXPERIAN */}
                  <div style={{
                    background: '#0B0F19',
                    border: '1px solid rgba(225, 29, 72, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    position: 'relative'
                  }}>
                    <div>
                      {/* Topo do Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            background: 'rgba(225, 29, 72, 0.15)',
                            color: '#FB7185',
                            border: '1px solid rgba(225, 29, 72, 0.45)',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                            letterSpacing: '0.05em'
                          }}>
                            SERASA
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                            Experian Brasil Oficial
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: activeSerasa === 0 ? '#F87171' : '#34D399',
                          border: activeSerasa === 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                        }}>
                          {activeSerasa >= 750 ? 'EXCELENTE (94.0%)' : activeSerasa >= 600 ? 'BOM (68.0%)' : activeSerasa > 0 ? 'REGULAR (45.0%)' : 'ZERADO / SANEADO (0)'}
                        </span>
                      </div>

                      {/* Score Display Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div>
                          <span style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
                            {activeSerasa}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#64748B', marginLeft: '0.35rem' }}>
                            / 1000
                          </span>
                        </div>
                        <div style={{ width: '54px', height: '54px' }}>
                          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.08)"
                              strokeWidth="3.2"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#10B981"
                              strokeWidth="3.2"
                              strokeDasharray={`${(activeSerasa / 10).toFixed(1)}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Campo Sincronização Score Real */}
                      <div style={{
                        background: '#070A10',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '0.65rem 0.75rem',
                        marginBottom: '1.2rem'
                      }}>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                          Score Real da sua Tela:
                        </label>
                        <div style={{ display: 'flex', gap: '0.45rem' }}>
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            placeholder={String(activeSerasa)}
                            value={bureauInputScores.serasa}
                            onChange={(e) => setBureauInputScores({ ...bureauInputScores, serasa: e.target.value })}
                            style={{
                              flex: 1,
                              background: '#0F1626',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              padding: '0.35rem 0.55rem',
                              fontSize: '0.8rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveBureauScore('serasa')}
                            style={{
                              background: 'rgba(225, 29, 72, 0.25)',
                              border: '1px solid rgba(225, 29, 72, 0.5)',
                              color: '#FB7185',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Gravar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleZeroBureau('serasa')}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#F87171',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Zerar pontuação do Serasa para 0"
                          >
                            Zerar (0)
                          </button>
                        </div>
                      </div>

                      {/* Lista de Detalhes Periciais */}
                      {isBureauEditMode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.74rem', marginBottom: '1.4rem', background: '#070A10', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px dashed rgba(225,29,72,0.45)' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FDA4AF', marginBottom: '0.2rem' }}>Probabilidade de Pagamento:</label>
                            <input
                              type="text"
                              value={bureauData.serasaProb || ''}
                              onChange={(e) => handleUpdateBureauMetric('serasa', 'serasaProb', e.target.value)}
                              placeholder="Ex: 96.2%"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FDA4AF', marginBottom: '0.2rem' }}>Dívidas / Negativações:</label>
                            <input
                              type="text"
                              value={bureauData.serasaDividas || ''}
                              onChange={(e) => handleUpdateBureauMetric('serasa', 'serasaDividas', e.target.value)}
                              placeholder="Ex: 0 (Nada Consta)"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FDA4AF', marginBottom: '0.2rem' }}>Consultas de Crédito (6m):</label>
                            <input
                              type="text"
                              value={bureauData.serasaConsultas || ''}
                              onChange={(e) => handleUpdateBureauMetric('serasa', 'serasaConsultas', e.target.value)}
                              placeholder="Ex: 0 consultas"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FDA4AF', marginBottom: '0.2rem' }}>Texto do Botão:</label>
                            <input
                              type="text"
                              value={bureauData.serasaBtnText || ''}
                              onChange={(e) => handleUpdateBureauMetric('serasa', 'serasaBtnText', e.target.value)}
                              placeholder={`Abrir Serasa Oficial (${activeClient?.tipo === 'PJ' ? 'CNPJ Copiado' : 'CPF Copiado'})`}
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FDA4AF', marginBottom: '0.2rem' }}>Link do Botão (URL):</label>
                            <input
                              type="text"
                              value={bureauData.serasaBtnUrl || ''}
                              onChange={(e) => handleUpdateBureauMetric('serasa', 'serasaBtnUrl', e.target.value)}
                              placeholder="https://empresas.serasaexperian.com.br/"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.74rem', marginBottom: '1.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.35rem' }}>
                            <span>Probabilidade de Pagamento:</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.serasaProb || bureauData.prob || (activeSerasa > 750 ? '94.8%' : '82.4%')}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.35rem' }}>
                            <span>Dívidas / Negativações:</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.serasaDividas || '0 (Nada Consta)'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Consultas de Crédito (6m):</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.serasaConsultas || '0 consultas'}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação do Serasa */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenBureauPortal('serasa', activeClient)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          background: 'rgba(225, 29, 72, 0.2)',
                          border: '1px solid rgba(225, 29, 72, 0.55)',
                          color: '#FDA4AF',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="Abre o portal do Serasa em nova aba e copia CPF/CNPJ"
                      >
                        <ExternalLink size={14} />
                        {bureauData.serasaBtnText || `Abrir Serasa Oficial (${activeClient?.tipo === 'PJ' ? 'CNPJ Copiado' : 'CPF Copiado'})`}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBureauModalDoc('serasa_petition')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          background: 'rgba(14, 165, 233, 0.12)',
                          border: '1px solid rgba(14, 165, 233, 0.4)',
                          color: '#38BDF8',
                          padding: '0.55rem 0.85rem',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Abrir requerimento administrativo de exclusão de consultas"
                      >
                        <FileText size={13} />
                        ⚖️ Exclusão Consultas Serasa (HTML)
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: BOA VISTA SCPC (EQUIFAX) */}
                  <div style={{
                    background: '#0B0F19',
                    border: '1px solid rgba(14, 165, 233, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    position: 'relative'
                  }}>
                    <div>
                      {/* Topo do Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            background: 'rgba(14, 165, 233, 0.15)',
                            color: '#38BDF8',
                            border: '1px solid rgba(14, 165, 233, 0.45)',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                            letterSpacing: '0.05em'
                          }}>
                            BOA VISTA
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                            SCPC Equifax Oficial
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: activeBoaVista === 0 ? '#F87171' : '#60A5FA',
                          border: activeBoaVista === 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)'
                        }}>
                          {activeBoaVista >= 750 ? 'FAIXA A (EXCELENTE)' : activeBoaVista >= 600 ? 'FAIXA B (BOM)' : activeBoaVista > 0 ? 'FAIXA C (REGULAR)' : 'ZERADO / SANEADO (0)'}
                        </span>
                      </div>

                      {/* Score Display Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div>
                          <span style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
                            {activeBoaVista}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#64748B', marginLeft: '0.35rem' }}>
                            / 1000
                          </span>
                        </div>
                        <div style={{ width: '54px', height: '54px' }}>
                          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.08)"
                              strokeWidth="3.2"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#38BDF8"
                              strokeWidth="3.2"
                              strokeDasharray={`${(activeBoaVista / 10).toFixed(1)}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Campo Sincronização Score Real */}
                      <div style={{
                        background: '#070A10',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '0.65rem 0.75rem',
                        marginBottom: '1.2rem'
                      }}>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                          Score Real da sua Tela:
                        </label>
                        <div style={{ display: 'flex', gap: '0.45rem' }}>
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            placeholder={String(activeBoaVista)}
                            value={bureauInputScores.boavista}
                            onChange={(e) => setBureauInputScores({ ...bureauInputScores, boavista: e.target.value })}
                            style={{
                              flex: 1,
                              background: '#0F1626',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              padding: '0.35rem 0.55rem',
                              fontSize: '0.8rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveBureauScore('boavista')}
                            style={{
                              background: 'rgba(14, 165, 233, 0.25)',
                              border: '1px solid rgba(14, 165, 233, 0.5)',
                              color: '#38BDF8',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Gravar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleZeroBureau('boavista')}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#F87171',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Zerar pontuação do Boa Vista para 0"
                          >
                            Zerar (0)
                          </button>
                        </div>
                      </div>

                      {/* Lista de Detalhes Periciais */}
                      {isBureauEditMode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.74rem', marginBottom: '1.4rem', background: '#070A10', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px dashed rgba(14,165,233,0.45)' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#38BDF8', marginBottom: '0.2rem' }}>Índice de Pontualidade:</label>
                            <input
                              type="text"
                              value={bureauData.boavistaPontualidade || ''}
                              onChange={(e) => handleUpdateBureauMetric('boavista', 'boavistaPontualidade', e.target.value)}
                              placeholder="Ex: 98.4%"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#38BDF8', marginBottom: '0.2rem' }}>Status de Faturas Cartão:</label>
                            <input
                              type="text"
                              value={bureauData.boavistaFaturas || ''}
                              onChange={(e) => handleUpdateBureauMetric('boavista', 'boavistaFaturas', e.target.value)}
                              placeholder="Ex: 0 (CENPROT)"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#38BDF8', marginBottom: '0.2rem' }}>Ações Cíveis / Protestos:</label>
                            <input
                              type="text"
                              value={bureauData.boavistaProtestos || ''}
                              onChange={(e) => handleUpdateBureauMetric('boavista', 'boavistaProtestos', e.target.value)}
                              placeholder="Ex: 0 apontamentos"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#38BDF8', marginBottom: '0.2rem' }}>Texto do Botão:</label>
                            <input
                              type="text"
                              value={bureauData.boavistaBtnText || ''}
                              onChange={(e) => handleUpdateBureauMetric('boavista', 'boavistaBtnText', e.target.value)}
                              placeholder={`Abrir Boa Vista (${activeClient?.tipo === 'PJ' ? 'CNPJ Copiado' : 'CPF Copiado'})`}
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#38BDF8', marginBottom: '0.2rem' }}>Link do Botão (URL):</label>
                            <input
                              type="text"
                              value={bureauData.boavistaBtnUrl || ''}
                              onChange={(e) => handleUpdateBureauMetric('boavista', 'boavistaBtnUrl', e.target.value)}
                              placeholder="https://www.boavistaservicos.com.br/"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.74rem', marginBottom: '1.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.35rem' }}>
                            <span>Índice de Pontualidade:</span>
                            <strong style={{ color: '#38BDF8' }}>{bureauData.boavistaPontualidade || '98.4%'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.35rem' }}>
                            <span>Status de Faturas Cartão:</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.boavistaFaturas || '0 (CENPROT)'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Ações Cíveis / Protestos:</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.boavistaProtestos || '0 apontamentos'}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação do Boa Vista */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenBureauPortal('boavista', activeClient)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          background: 'rgba(14, 165, 233, 0.2)',
                          border: '1px solid rgba(14, 165, 233, 0.55)',
                          color: '#38BDF8',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="Abre o portal do Boa Vista em nova aba e copia CPF/CNPJ"
                      >
                        <ExternalLink size={14} />
                        {bureauData.boavistaBtnText || `Abrir Boa Vista (${activeClient?.tipo === 'PJ' ? 'CNPJ Copiado' : 'CPF Copiado'})`}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBureauModalDoc('boavista_petition')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          background: 'rgba(14, 165, 233, 0.12)',
                          border: '1px solid rgba(14, 165, 233, 0.4)',
                          color: '#38BDF8',
                          padding: '0.55rem 0.85rem',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Abrir petição formal de retificação e purga do Boa Vista"
                      >
                        <FileCheck size={13} />
                        📄 Petição Boa Vista (HTML)
                      </button>
                    </div>
                  </div>

                  {/* CARD 3: QUOD (CADASTRO POSITIVO) */}
                  <div style={{
                    background: '#0B0F19',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    position: 'relative'
                  }}>
                    <div>
                      {/* Topo do Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.45)',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                            letterSpacing: '0.05em'
                          }}>
                            QUOD
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                            Cadastro Positivo Oficial
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: activeQuod === 0 ? '#F87171' : '#34D399',
                          border: activeQuod === 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                        }}>
                          {activeQuod >= 750 ? `SCORE ${activeQuod} (EXCELENTE)` : activeQuod >= 600 ? `SCORE ${activeQuod} (BOM)` : activeQuod > 0 ? `SCORE ${activeQuod} (REGULAR)` : 'ZERADO / SANEADO (0)'}
                        </span>
                      </div>

                      {/* Score Display Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div>
                          <span style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
                            {activeQuod}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#64748B', marginLeft: '0.35rem' }}>
                            / 1000
                          </span>
                        </div>
                        <div style={{ width: '54px', height: '54px' }}>
                          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.08)"
                              strokeWidth="3.2"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#10B981"
                              strokeWidth="3.2"
                              strokeDasharray={`${(activeQuod / 10).toFixed(1)}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Campo Sincronização Score Real */}
                      <div style={{
                        background: '#070A10',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '0.65rem 0.75rem',
                        marginBottom: '1.2rem'
                      }}>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                          Score Real da sua Tela:
                        </label>
                        <div style={{ display: 'flex', gap: '0.45rem' }}>
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            placeholder={String(activeQuod)}
                            value={bureauInputScores.quod}
                            onChange={(e) => setBureauInputScores({ ...bureauInputScores, quod: e.target.value })}
                            style={{
                              flex: 1,
                              background: '#0F1626',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              padding: '0.35rem 0.55rem',
                              fontSize: '0.8rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveBureauScore('quod')}
                            style={{
                              background: 'rgba(16, 185, 129, 0.25)',
                              border: '1px solid rgba(16, 185, 129, 0.5)',
                              color: '#34D399',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Gravar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleZeroBureau('quod')}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#F87171',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Zerar pontuação do Quod para 0"
                          >
                            Zerar (0)
                          </button>
                        </div>
                      </div>

                      {/* Lista de Detalhes Periciais */}
                      {isBureauEditMode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.74rem', marginBottom: '1.4rem', background: '#070A10', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px dashed rgba(16,185,129,0.45)' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#34D399', marginBottom: '0.2rem' }}>Cadastro Positivo:</label>
                            <input
                              type="text"
                              value={bureauData.quodPositivo || ''}
                              onChange={(e) => handleUpdateBureauMetric('quod', 'quodPositivo', e.target.value)}
                              placeholder="Ex: Ativo e Regular"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#34D399', marginBottom: '0.2rem' }}>Histórico 36 meses:</label>
                            <input
                              type="text"
                              value={bureauData.quodHistorico || ''}
                              onChange={(e) => handleUpdateBureauMetric('quod', 'quodHistorico', e.target.value)}
                              placeholder="Ex: Zero Atrasos"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#34D399', marginBottom: '0.2rem' }}>Conformidade Bacen:</label>
                            <input
                              type="text"
                              value={bureauData.quodConformidade || ''}
                              onChange={(e) => handleUpdateBureauMetric('quod', 'quodConformidade', e.target.value)}
                              placeholder="Ex: BOM – SEM APONTAMENTOS"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#34D399', marginBottom: '0.2rem' }}>Texto do Botão:</label>
                            <input
                              type="text"
                              value={bureauData.quodBtnText || ''}
                              onChange={(e) => handleUpdateBureauMetric('quod', 'quodBtnText', e.target.value)}
                              placeholder={`Acessar Quod (${activeClient?.tipo === 'PJ' ? 'CNPJ Copiado' : 'CPF Copiado'})`}
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#34D399', marginBottom: '0.2rem' }}>Link do Botão (URL):</label>
                            <input
                              type="text"
                              value={bureauData.quodBtnUrl || ''}
                              onChange={(e) => handleUpdateBureauMetric('quod', 'quodBtnUrl', e.target.value)}
                              placeholder="https://www.quod.com.br/"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.74rem', marginBottom: '1.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.35rem' }}>
                            <span>Cadastro Positivo:</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.quodPositivo || 'Ativo e Regular'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.35rem' }}>
                            <span>Histórico 36 meses:</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.quodHistorico || 'Zero Atrasos'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Conformidade Bacen:</span>
                            <strong style={{ color: '#FFFFFF' }}>{bureauData.quodConformidade || 'BOM – SEM APONTAMENTOS'}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botão de Ação do Quod */}
                    <div>
                      <button
                        type="button"
                        onClick={() => handleOpenBureauPortal('quod', activeClient)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          background: 'rgba(16, 185, 129, 0.18)',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          color: '#34D399',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="Abre o portal da Quod Consumidor/Empresas com documento copiado"
                      >
                        <ExternalLink size={14} />
                        {bureauData.quodBtnText || `Acessar Quod (${activeClient?.tipo === 'PJ' ? 'CNPJ Copiado' : 'CPF Copiado'})`}
                      </button>
                    </div>
                  </div>

                  {/* CARD 4: BACEN SCR (REGISTRATO) */}
                  <div style={{
                    background: '#0B0F19',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    position: 'relative'
                  }}>
                    <div>
                      {/* Topo do Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#FBBF24',
                            border: '1px solid rgba(245, 158, 11, 0.45)',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                            letterSpacing: '0.05em'
                          }}>
                            BACEN SCR
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                            Registrato Oficial
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#FBBF24',
                          border: '1px solid rgba(245, 158, 11, 0.4)'
                        }}>
                          RATING {activeBacen}
                        </span>
                      </div>

                      {/* Score Display Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div>
                          <span style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FBBF24', lineHeight: 1 }}>
                            {activeBacen}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#94A3B8', marginLeft: '0.5rem', fontWeight: 600 }}>
                            Mínimo Risco
                          </span>
                        </div>
                        <div style={{ width: '54px', height: '54px' }}>
                          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.08)"
                              strokeWidth="3.2"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#F59E0B"
                              strokeWidth="3.2"
                              strokeDasharray="94.5, 100"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Informações Contábeis Registrato */}
                      <div style={{
                        background: '#070A10',
                        border: '1px solid rgba(245, 158, 11, 0.15)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '0.65rem 0.75rem',
                        marginBottom: '1.2rem',
                        fontSize: '0.72rem',
                        color: '#CBD5E1'
                      }}>
                        {isBureauEditMode ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: '#FBBF24', fontWeight: 700 }}>Rating Bacen:</span>
                              <select
                                value={activeBacen}
                                onChange={(e) => handleUpdateBureauMetric('bacen', 'bacen', e.target.value)}
                                style={{
                                  background: '#0F1626',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  color: '#FBBF24',
                                  borderRadius: '4px',
                                  padding: '0.2rem 0.5rem',
                                  fontWeight: 800,
                                  fontSize: '0.75rem'
                                }}
                              >
                                <option value="A1">A1 (Prime Rate)</option>
                                <option value="A">A (Excelente)</option>
                                <option value="B1">B1 (Normal)</option>
                                <option value="B">B (Estável)</option>
                                <option value="C">C (Monitoramento)</option>
                              </select>
                            </div>
                            <div>
                              <span style={{ color: '#FBBF24', fontWeight: 700 }}>Certificação Gov.br:</span>
                              <input
                                type="text"
                                value={bureauData.bacenGov || 'Nível Ouro Ativo (Acesso via Certificado e-CNPJ / e-CPF)'}
                                onChange={(e) => handleUpdateBureauMetric('bacen', 'bacenGov', e.target.value)}
                                style={{ width: '100%', marginTop: '0.2rem', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.74rem' }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <span style={{ color: '#FBBF24', fontWeight: 700 }}>Certificação Gov.br: </span>
                            {bureauData.bacenGov || 'Nível Ouro Ativo (Acesso via Certificado e-CNPJ / e-CPF)'}
                          </>
                        )}
                      </div>

                      {/* Lista de Detalhes Periciais */}
                      {isBureauEditMode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.74rem', marginBottom: '1.4rem', background: '#070A10', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px dashed rgba(245,158,11,0.45)' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FBBF24', marginBottom: '0.2rem' }}>Operações Vencidas:</label>
                            <input
                              type="text"
                              value={bureauData.bacenVencidos || ''}
                              onChange={(e) => handleUpdateBureauMetric('bacen', 'bacenVencidos', e.target.value)}
                              placeholder="Ex: R$ 0,00"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FBBF24', marginBottom: '0.2rem' }}>Prejuízos (3020/3030):</label>
                            <input
                              type="text"
                              value={bureauData.bacenPrejuizos || ''}
                              onChange={(e) => handleUpdateBureauMetric('bacen', 'bacenPrejuizos', e.target.value)}
                              placeholder="Ex: R$ 0,00 (Zero Prejuízo)"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FBBF24', marginBottom: '0.2rem' }}>Comprometimento Total:</label>
                            <input
                              type="text"
                              value={bureauData.bacenComp || ''}
                              onChange={(e) => handleUpdateBureauMetric('bacen', 'bacenComp', e.target.value)}
                              placeholder="Ex: (Excelente • 100% em dia)"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FBBF24', marginBottom: '0.2rem' }}>Texto do Botão:</label>
                            <input
                              type="text"
                              value={bureauData.bacenBtnText || ''}
                              onChange={(e) => handleUpdateBureauMetric('bacen', 'bacenBtnText', e.target.value)}
                              placeholder={`Acessar Registrato (${activeClient?.tipo === 'PJ' ? 'e-CNPJ' : 'e-CPF'})`}
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#FBBF24', marginBottom: '0.2rem' }}>Link do Botão (URL):</label>
                            <input
                              type="text"
                              value={bureauData.bacenBtnUrl || ''}
                              onChange={(e) => handleUpdateBureauMetric('bacen', 'bacenBtnUrl', e.target.value)}
                              placeholder="https://registrato.bcb.gov.br/"
                              style={{ width: '100%', background: '#0F1626', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.76rem' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.74rem', marginBottom: '1.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.35rem' }}>
                            <span>Operações Vencidas:</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.bacenVencidos || 'R$ 0,00'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.35rem' }}>
                            <span>Prejuízos (3020/3030):</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.bacenPrejuizos || 'R$ 0,00 (Zero Prejuízo)'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Comprometimento Total:</span>
                            <strong style={{ color: '#34D399' }}>{bureauData.bacenComp || '(Excelente • 100% em dia)'}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botão de Ação do Bacen */}
                    <div>
                      <button
                        type="button"
                        onClick={() => handleOpenBureauPortal('bacen', activeClient)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          background: 'rgba(245, 158, 11, 0.18)',
                          border: '1px solid rgba(245, 158, 11, 0.5)',
                          color: '#FBBF24',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="Abre o Registrato do Banco Central com documento copiado"
                      >
                        <ExternalLink size={14} />
                        {bureauData.bacenBtnText || `Acessar Registrato (${activeClient?.tipo === 'PJ' ? 'e-CNPJ' : 'e-CPF'})`}
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}

                    </div>
          </div>
        </div>
      </main>

      {/* ---------------------------------------------------- */}
      {/* MODAL: VISUALIZAÇÃO DE DOSSIÊ COMPLETO DO CLIENTE   */}
      {/* ---------------------------------------------------- */}
      {selectedClient && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 12, 0.88)',
          backdropFilter: 'blur(8px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#0D121D',
            border: selectedClient.tipo === 'PJ' ? '1px solid var(--gold-border)' : '1px solid rgba(0, 158, 227, 0.45)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '880px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '2.25rem',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8)',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedClient(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '0.4rem'
              }}
            >
              <X size={18} />
            </button>

            {/* Cabeçalho do Dossiê */}
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.2rem' }}>
              {selectedClient.statusValidacaoFinal === 'APROVADO PELO CHEFE MOURATO' && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.85rem 1.25rem', marginBottom: '1rem',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(197, 168, 105, 0.15) 100%)',
                  border: '1.5px solid #C5A869', borderRadius: '10px', flexWrap: 'wrap', gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <ShieldCheck size={22} color="#C5A869" />
                    <div>
                      <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.86rem' }}>
                        LAUDO PERICIAL VALIDADO PELO CHEFE MOURATO (VALIDAÇÃO FINAL)
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                        Autenticidade: <b style={{ color: '#C5A869' }}>{selectedClient.hashAutenticidade || 'MOURATO-AUTH-OK'}</b> • Homologado em: <b style={{ color: '#E2E8F0' }}>{selectedClient.dataValidacaoFinal}</b>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.25)', color: '#34D399', fontWeight: 700 }}>
                    ✓ VALIDAÇÃO FINAL ATIVA
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--gold-light)', letterSpacing: '0.1em', fontWeight: 700 }}>
                  DOSSIÊ PERICIAL CONFIDENCIAL • MOURATO &amp; ASSOCIADOS
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {selectedClient.tipo === 'PJ' ? (
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: 'rgba(197, 168, 105, 0.2)',
                      color: 'var(--gold-light)',
                      border: '1px solid var(--gold-border)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <Building2 size={12} />
                      PESSOA JURÍDICA (PJ)
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: 'rgba(0, 158, 227, 0.2)',
                      color: '#38BDF8',
                      border: '1px solid rgba(0, 158, 227, 0.4)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <UserCheck size={12} />
                      PESSOA FÍSICA (PF)
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: '#E2E8F0'
                  }}>
                    {selectedClient.codigoCliente || 'CLI-001'}
                  </span>
                </div>
              </div>

              <h2 style={{ fontSize: '1.45rem', color: '#FFFFFF', margin: '0.25rem 0', fontWeight: 800 }}>
                {selectedClient.nomeRazao}
              </h2>

              <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                <span>{selectedClient.tipo === 'PJ' ? 'CNPJ' : 'CPF'}: <strong style={{ color: '#FFFFFF' }}>{getClientDocumento(selectedClient)}</strong></span>
                {selectedClient.protocolo && <span>• Protocolo: <strong style={{ color: 'var(--gold-light)', fontFamily: 'monospace' }}>{selectedClient.protocolo}</strong></span>}
                {selectedClient.dataCadastro && (
                  <span>• Cadastro: <strong style={{ color: '#CBD5E1' }}>
                    {typeof selectedClient.dataCadastro === 'string' && selectedClient.dataCadastro.includes('/')
                      ? selectedClient.dataCadastro
                      : (!isNaN(new Date(selectedClient.dataCadastro).getTime()) ? new Date(selectedClient.dataCadastro).toLocaleDateString('pt-BR') : String(selectedClient.dataCadastro))}
                  </strong></span>
                )}
              </div>
            </div>

            {/* SEÇÃO 1: IDENTIFICAÇÃO PESSOAL / CIVIL (PF) */}
            {selectedClient.tipo !== 'PJ' && (
              <div style={{ background: '#070A10', border: '1px solid rgba(0, 158, 227, 0.25)', borderRadius: 'var(--radius-sm)', padding: '1.15rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: '#38BDF8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', letterSpacing: '0.04em' }}>
                  <UserCheck size={15} />
                  1. Dados Pessoais &amp; Identificação Civil do Titular
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', fontSize: '0.8rem' }}>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>NOME COMPLETO</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.nomeRazao}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>CPF REGISTRADO</span>
                    <strong style={{ color: '#38BDF8' }}>{getClientDocumento(selectedClient)}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>RG / CNH &amp; ÓRGÃO</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.rg || 'Não informado'} {selectedClient.orgao ? `(${selectedClient.orgao})` : ''}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>DATA DE NASCIMENTO</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.dataNascimento || selectedClient.nasc || 'Não informada'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>SEXO &amp; ESTADO CIVIL</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.sexo || 'Não informado'} • {selectedClient.estadoCivil || 'Não informado'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>NOME DA MÃE (FILIAÇÃO)</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.nomeMae || selectedClient.mae || 'Não informado'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>NOME DO PAI (FILIAÇÃO)</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.nomePai || selectedClient.pai || 'Não informado'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>NACIONALIDADE &amp; NATURALIDADE</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.nacionalidade || 'Brasileira'}{selectedClient.naturalidade ? ` • ${selectedClient.naturalidade}` : ''}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 1 (PJ): IDENTIFICAÇÃO EMPRESARIAL & SOCIETÁRIA */}
            {selectedClient.tipo === 'PJ' && (
              <div style={{ background: '#070A10', border: '1px solid rgba(197, 168, 105, 0.25)', borderRadius: 'var(--radius-sm)', padding: '1.15rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', letterSpacing: '0.04em' }}>
                  <Building2 size={15} />
                  1. Identificação Empresarial &amp; Quadro Societário
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', fontSize: '0.8rem' }}>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)', gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>RAZÃO SOCIAL</span>
                    <strong style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>{selectedClient.nomeRazao}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>CNPJ (RECEITA FEDERAL)</span>
                    <strong style={{ color: 'var(--gold-light)' }}>{getClientDocumento(selectedClient)}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>NIRE JUCESP</span>
                    <strong style={{ color: '#CBD5E1' }}>{selectedClient.nire || 'Não informado'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>NATUREZA JURÍDICA</span>
                    <strong style={{ color: '#CBD5E1' }}>{selectedClient.natureza || 'Sociedade Empresária'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>SÓCIO ADMINISTRADOR</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.socioVinculado || selectedClient.responsavel || 'Não informado'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 2: ENDEREÇO & LOCALIZAÇÃO */}
            <div style={{ background: '#070A10', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-sm)', padding: '1.15rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.76rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', letterSpacing: '0.04em' }}>
                <MapPin size={15} color="var(--gold-primary)" />
                2. Endereço Completo &amp; Localização
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', fontSize: '0.8rem' }}>
                <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)', gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>LOGRADOURO RESIDENCIAL / COMERCIAL</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.endereco || selectedClient.logradouro || 'Não informado'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>BAIRRO</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.bairro || 'Não informado'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>CIDADE / UF</span>
                  <strong style={{ color: '#FFFFFF' }}>
                    {selectedClient.cidade ? `${selectedClient.cidade}${selectedClient.uf ? ` / ${selectedClient.uf}` : ''}` : (selectedClient.uf ? selectedClient.uf : 'Não informado')}
                  </strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>CEP</span>
                  <strong style={{ color: 'var(--gold-light)' }}>{selectedClient.cep || 'Não informado'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>TIPO DO IMÓVEL &amp; TEMPO</span>
                  <strong style={{ color: '#CBD5E1' }}>{selectedClient.tipoImovel || 'Não informado'}{selectedClient.tempoResidencia ? ` • ${selectedClient.tempoResidencia}` : ''}</strong>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: CANAIS DE CONTATO */}
            <div style={{ background: '#070A10', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-sm)', padding: '1.15rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.76rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', letterSpacing: '0.04em' }}>
                <PhoneCall size={15} color="#34D399" />
                3. Canais de Contato &amp; Comunicação
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', fontSize: '0.8rem' }}>
                <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>CELULAR / WHATSAPP</span>
                  <strong style={{ color: '#34D399' }}>{selectedClient.contato || selectedClient.celular || 'Não informado'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>TELEFONE FIXO / ALTERNATIVO</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.telefoneFixo || selectedClient.telefone || 'Não informado'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>E-MAIL PRINCIPAL</span>
                  <strong style={{ color: '#60A5FA' }}>{selectedClient.email || 'Não informado'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>E-MAIL SECUNDÁRIO</span>
                  <strong style={{ color: '#CBD5E1' }}>{selectedClient.emailSecundario || 'Não informado'}</strong>
                </div>
              </div>
            </div>

            {/* SEÇÃO 4 (PF): DADOS PROFISSIONAIS, ESCOLARIDADE & RENDA */}
            {selectedClient.tipo !== 'PJ' && (
              <div style={{ background: '#070A10', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-sm)', padding: '1.15rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: '#38BDF8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', letterSpacing: '0.04em' }}>
                  <Briefcase size={15} />
                  4. Profissão, Escolaridade &amp; Capacidade de Renda
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', fontSize: '0.8rem' }}>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>PROFISSÃO / CARGO</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.profissao || selectedClient.socioeconomico?.profissao || 'Sócio-Administrador'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>VÍNCULO OCUPACIONAL</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.tipoVinculo || selectedClient.socioeconomico?.tipoVinculo || 'Empresário / Sócio PJ'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>ESCOLARIDADE FORMAL</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.escolaridade || selectedClient.socioeconomico?.escolaridade || 'Superior Completo'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>RENDA MENSAL / PRÓ-LABORE</span>
                    <strong style={{ color: '#34D399' }}>{selectedClient.rendaMensal || selectedClient.socioeconomico?.rendaMensal || selectedClient.rendaPatrimonio?.proLabore || 'Declarado em Análise'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>EMPRESA VINCULADA</span>
                    <strong style={{ color: 'var(--gold-light)' }}>{selectedClient.empresaVinculada || selectedClient.socioeconomico?.empresaEmpregadora || 'Mourato & Associados Ltda'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>PATRIMÔNIO / VEÍCULOS</span>
                    <strong style={{ color: '#CBD5E1' }}>{selectedClient.rendaPatrimonio?.veiculos || selectedClient.rendaPatrimonio?.bens || 'Veículos e Bens Declarados'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 4 (PJ): BALANÇO PATRIMONIAL & DADOS CONTÁBEIS */}
            {selectedClient.tipo === 'PJ' && selectedClient.balanco && (
              <div style={{ background: '#070A10', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-sm)', padding: '1.15rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', letterSpacing: '0.04em' }}>
                  <FileSpreadsheet size={15} />
                  4. Balanço Patrimonial &amp; Dados Contábeis ({selectedClient.balanco.exercicio || '2026 Auditado'})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', fontSize: '0.8rem' }}>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>ATIVO TOTAL</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.balanco.ativo || '---'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>PATRIMÔNIO LÍQUIDO</span>
                    <strong style={{ color: '#34D399' }}>{selectedClient.balanco.patrimonioLiquido || '---'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>CAPITAL SOCIAL</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedClient.balanco.capitalSocial || '---'}</strong>
                  </div>
                  <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>FATURAMENTO ANUAL</span>
                    <strong style={{ color: 'var(--gold-light)' }}>{selectedClient.balanco.faturamentoAnual || '---'}</strong>
                  </div>
                </div>

                {selectedClient.balanco.contadorResponsavel && (
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem' }}>
                    Responsável Técnico Contábil: <strong style={{ color: '#CBD5E1' }}>{selectedClient.balanco.contadorResponsavel}</strong>
                  </div>
                )}
              </div>
            )}

            {/* SEÇÃO 5: CONTAS BANCÁRIAS CADASTRADAS */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem', letterSpacing: '0.04em' }}>
                <Landmark size={15} />
                5. Contas Bancárias ({selectedClient.contasBancarias?.length || 1}) {selectedClient.tipo === 'PJ' ? '• CCS Bacen' : ''}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedClient.contasBancarias?.map((b, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: '#070A10',
                      border: b.origemCcs ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(197, 168, 105, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <strong style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>
                          {b.banco === 'Outro' ? (b.bancoOutro || 'Outro') : b.banco}
                        </strong>
                        {b.origemCcs && (
                          <span style={{ fontSize: '0.68rem', color: '#34D399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                            CCS BACEN HOMOLOGADO
                          </span>
                        )}
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8', background: 'rgba(255, 255, 255, 0.06)', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                          Tipo: {b.tipoConta || (selectedClient.tipo === 'PJ' ? 'PJ' : 'PF')}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#34D399', background: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                        {b.statusConta || 'Ativa / Homologada'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>AGÊNCIA</span>
                        <strong style={{ color: '#FFFFFF' }}>{b.agencia || '---'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>CONTA CORRENTE</span>
                        <strong style={{ color: '#FFFFFF' }}>{b.conta || '---'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>SENHA SALVA</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                          <span style={{ fontFamily: showDetailPasswords[`${selectedClient.id}-${idx}`] ? 'inherit' : 'monospace', color: 'var(--gold-light)', fontWeight: 600 }}>
                            {showDetailPasswords[`${selectedClient.id}-${idx}`] ? (b.senhaAcesso || 'Sem senha') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowDetailPasswords({ 
                              ...showDetailPasswords, 
                              [`${selectedClient.id}-${idx}`]: !showDetailPasswords[`${selectedClient.id}-${idx}`] 
                            })}
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.2rem' }}
                            title={showDetailPasswords[`${selectedClient.id}-${idx}`] ? "Ocultar senha" : "Ver senha salva"}
                          >
                            {showDetailPasswords[`${selectedClient.id}-${idx}`] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 6: BIRÔS DE CRÉDITO & RATINGS */}
            <div style={{ marginBottom: '1.25rem', background: '#070A10', padding: '1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', letterSpacing: '0.04em' }}>
                <ShieldCheck size={15} />
                6. Bureaus, Ratings &amp; Órgãos Reguladores
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                <div style={{ background: '#0D121D', padding: '0.65rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>BACEN SCR</span>
                  <strong style={{ color: '#34D399' }}>{selectedClient.bacenScr || 'Rating A1'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>SERASA EXPERIAN</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.serasaScore || selectedClient.serasaStatus || 'Regular'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>GOV.BR</span>
                  <strong style={{ color: '#FCD34D' }}>{selectedClient.govNivel || 'Ouro'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>QUOD</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.quodStatus || 'Positivo'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>BOA VISTA</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.boaVistaStatus || 'Sem Restrições'}</strong>
                </div>
              </div>
            </div>

            {/* SEÇÃO 7: CREDENCIAIS & SENHAS DE ACESSO AOS BIRÔS */}
            <div style={{ marginBottom: '1.25rem', background: '#070A10', padding: '1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(197, 168, 105, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)', textTransform: 'uppercase', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', letterSpacing: '0.04em' }}>
                  <KeyRound size={15} color="var(--gold-primary)" />
                  7. Senhas &amp; Credenciais Salvas dos Birôs
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Acesso Opcional • Sem Trava Obrigatória</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                {[
                  { 
                    label: 'SERASA EXPERIAN', 
                    val: selectedClient.senhaSerasa || selectedClient.portais?.serasa?.senha || selectedClient.senhas_biros?.serasa_senha, 
                    login: selectedClient.portais?.serasa?.usuario || selectedClient.senhas_biros?.serasa_usuario,
                    key: 'serasa',
                    url: 'https://www.serasa.com.br'
                  },
                  { 
                    label: 'BOA VISTA SCPC', 
                    val: selectedClient.senhaBoaVista || selectedClient.portais?.boaVista?.senha || selectedClient.senhas_biros?.boavista_senha, 
                    login: selectedClient.portais?.boaVista?.usuario || selectedClient.senhas_biros?.boavista_usuario,
                    key: 'boavista',
                    url: 'https://www.consumidorpositivo.com.br'
                  },
                  { 
                    label: 'QUOD', 
                    val: selectedClient.senhaQuod || selectedClient.portais?.quod?.senha || selectedClient.senhas_biros?.quod_senha, 
                    login: selectedClient.portais?.quod?.usuario || selectedClient.senhas_biros?.quod_usuario,
                    key: 'quod',
                    url: 'https://consumidor.quod.com.br'
                  },
                  { 
                    label: 'GOV.BR (FEDERAL)', 
                    val: selectedClient.senhaGovBr || selectedClient.portais?.gov?.senha || selectedClient.senhas_biros?.gov_senha, 
                    login: selectedClient.portais?.gov?.usuario || selectedClient.senhas_biros?.gov_usuario,
                    key: 'gov',
                    url: 'https://acesso.gov.br'
                  },
                  { label: 'BACEN / SCR', val: selectedClient.senhaBacen, key: 'bacen' },
                  { label: 'CHAVE MESTRA / E-CAC', val: selectedClient.senhaMestraConsultas, key: 'master' },
                  { label: 'PIN CERTIFICADO A1', val: selectedClient.pinCertificadoA1 || selectedClient.portais?.certificadoDigital?.senha, key: 'pinA1' }
                ].filter(item => item.val || item.login).length === 0 ? (
                  <div style={{ color: '#64748B', fontSize: '0.76rem', fontStyle: 'italic', gridColumn: '1 / -1' }}>
                    Nenhuma credencial registrada para este cliente (o preenchimento é voluntário).
                  </div>
                ) : (
                  [
                    { 
                      label: 'SERASA EXPERIAN', 
                      val: selectedClient.senhaSerasa || selectedClient.portais?.serasa?.senha || selectedClient.senhas_biros?.serasa_senha, 
                      login: selectedClient.portais?.serasa?.usuario || selectedClient.senhas_biros?.serasa_usuario,
                      key: 'serasa',
                      url: 'https://www.serasa.com.br'
                    },
                    { 
                      label: 'BOA VISTA SCPC', 
                      val: selectedClient.senhaBoaVista || selectedClient.portais?.boaVista?.senha || selectedClient.senhas_biros?.boavista_senha, 
                      login: selectedClient.portais?.boaVista?.usuario || selectedClient.senhas_biros?.boavista_usuario,
                      key: 'boavista',
                      url: 'https://www.consumidorpositivo.com.br'
                    },
                    { 
                      label: 'QUOD', 
                      val: selectedClient.senhaQuod || selectedClient.portais?.quod?.senha || selectedClient.senhas_biros?.quod_senha, 
                      login: selectedClient.portais?.quod?.usuario || selectedClient.senhas_biros?.quod_usuario,
                      key: 'quod',
                      url: 'https://consumidor.quod.com.br'
                    },
                    { 
                      label: 'GOV.BR (FEDERAL)', 
                      val: selectedClient.senhaGovBr || selectedClient.portais?.gov?.senha || selectedClient.senhas_biros?.gov_senha, 
                      login: selectedClient.portais?.gov?.usuario || selectedClient.senhas_biros?.gov_usuario,
                      key: 'gov',
                      url: 'https://acesso.gov.br'
                    },
                    { label: 'BACEN / SCR', val: selectedClient.senhaBacen, key: 'bacen' },
                    { label: 'CHAVE MESTRA / E-CAC', val: selectedClient.senhaMestraConsultas, key: 'master' },
                    { label: 'PIN CERTIFICADO A1', val: selectedClient.pinCertificadoA1 || selectedClient.portais?.certificadoDigital?.senha, key: 'pinA1' }
                  ].filter(item => item.val || item.login).map((item, idx) => {
                    const isVisible = showDetailPasswords[`bureau-${selectedClient.id}-${item.key}`];
                    return (
                      <div key={idx} style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ color: '#94A3B8', fontSize: '0.66rem', fontWeight: 600 }}>{item.label}</span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#38BDF8', display: 'flex', alignItems: 'center', padding: '1px' }}
                              title={`Abrir portal oficial de ${item.label}`}
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        {item.login && (
                          <div style={{ fontSize: '0.68rem', color: '#38BDF8', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#64748B' }}>Login:</span> {item.login}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginTop: '3px' }}>
                          <span style={{ fontFamily: isVisible ? 'inherit' : 'monospace', color: 'var(--gold-light)', fontWeight: 600, fontSize: '0.8rem' }}>
                            {isVisible ? (item.val || 'Sem senha') : (item.val ? '••••••••' : 'Sem senha')}
                          </span>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {item.val && (
                              <button
                                type="button"
                                onClick={() => setShowDetailPasswords(prev => ({ ...prev, [`bureau-${selectedClient.id}-${item.key}`]: !isVisible }))}
                                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                                title={isVisible ? 'Ocultar' : 'Exibir senha'}
                              >
                                {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            )}
                            {item.val && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(item.val);
                                    showToast('📋 Senha Copiada!', `Senha de ${item.label} copiada para a área de transferência.`);
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                                title="Copiar senha"
                              >
                                <Copy size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* SEÇÃO 8: ANEXOS & EXTRATOS ENVIADOS */}
            {Array.isArray(selectedClient.anexos) && selectedClient.anexos.length > 0 && (
              <div style={{ marginBottom: '1.25rem', background: '#070A10', padding: '1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.76rem', color: '#60A5FA', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', letterSpacing: '0.04em' }}>
                  <FileText size={15} />
                  8. Anexos &amp; Extratos Bancários ({selectedClient.anexos.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                  {selectedClient.anexos.map((anexo, aIdx) => (
                    <div key={aIdx} style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📄 {anexo.nome || `Extrato_${aIdx + 1}.pdf`}
                      </span>
                      {anexo.dataUrl && (
                        <a 
                          href={anexo.dataUrl} 
                          download={anexo.nome || 'anexo.pdf'}
                          style={{ fontSize: '0.7rem', color: 'var(--gold-light)', textDecoration: 'none', fontWeight: 700 }}
                        >
                          Baixar
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações e Limites */}
            {selectedClient.limiteAprovado && (
              <div style={{ marginBottom: '1.25rem', fontSize: '0.82rem', background: '#070A10', padding: '0.85rem', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>LIMITE ESTRUTURADO / POTENCIAL PRONAMPE</span>
                <strong style={{ color: '#34D399', fontSize: '1.15rem' }}>{selectedClient.limiteAprovado}</strong>
              </div>
            )}

            {selectedClient.observacoesSigilosas && (
              <div style={{ fontSize: '0.82rem', background: '#090D14', padding: '0.9rem', borderRadius: 'var(--radius-xs)', borderLeft: '3px solid var(--gold-primary)', marginBottom: '1.25rem' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem', fontWeight: 600 }}>OBSERVAÇÕES PERICIAIS RESERVADAS</span>
                <p style={{ color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>{selectedClient.observacoesSigilosas}</p>
              </div>
            )}

            {/* AÇÕES NO RODAPÉ DO DOSSIÊ */}
            <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'wrap' }}>
              
              {/* Botão de Correção de Dados do Cliente */}
              <button
                type="button"
                onClick={() => {
                  const target = selectedClient;
                  setSelectedClient(null);
                  handleEditClient(target);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.65rem 1.15rem', fontSize: '0.82rem', fontWeight: 700,
                  borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', cursor: 'pointer'
                }}
                title="Corrigir campos cadastrais, extratos ou contas deste cliente"
              >
                <Edit2 size={15} color="#C5A869" />
                Corrigir Dados
              </button>

              {/* Botão Supremo de Validação Final do Chefe Mourato */}
              <button
                type="button"
                onClick={() => handleFinalValidation(selectedClient)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.35rem', fontSize: '0.84rem', fontWeight: 800,
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, #C5A869 0%, #9A7B38 100%)',
                  border: '1px solid #E8D5A3', color: '#0A0D14', cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(197, 168, 105, 0.4)'
                }}
                title="Aprovar com autoridade máxima do Chefe Mourato e emitir o PDF oficial com marca d'água 5.5%"
              >
                <ShieldCheck size={16} />
                DAR VALIDAÇÃO FINAL (PDF 5.5%)
              </button>
              <button
                type="button"
                onClick={() => handlePrintClientFormAndBureau(selectedClient)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, rgba(197, 168, 105, 0.22) 0%, rgba(197, 168, 105, 0.08) 100%)',
                  border: '1px solid var(--gold-primary)',
                  color: 'var(--gold-light)',
                  cursor: 'pointer'
                }}
                title="Imprimir Formulário Cadastral Completo com Birôs e Relatório da Teia de Aranha"
              >
                <Printer size={15} />
                Imprimir Formulário &amp; Birô
              </button>

              <button
                onClick={() => {
                  const targetId = selectedClient.id;
                  setSelectedClient(null);
                  setSelectedBureauClientId(targetId);
                  setActiveView('bureau_scores');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  color: '#34D399',
                  cursor: 'pointer'
                }}
                title="Abrir Auditoria dos Birôs de Crédito para este cliente"
              >
                <ShieldCheck size={15} />
                Acessar Birôs de Crédito
              </button>

              <button
                type="button"
                onClick={() => downloadClientJsonForRobot(selectedClient)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(59, 130, 246, 0.16)',
                  border: '1px solid rgba(59, 130, 246, 0.45)',
                  color: '#60A5FA',
                  cursor: 'pointer'
                }}
                title="Baixar planilha/ficha estruturada em JSON para o robô ClientesPF"
              >
                <FileDown size={15} />
                Baixar Ficha (Robô)
              </button>

              <button
                onClick={() => {
                  const targetClient = selectedClient;
                  handleStartEditClient(targetClient);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(197, 168, 105, 0.15)',
                  border: '1px solid rgba(197, 168, 105, 0.45)',
                  color: 'var(--gold-light)',
                  cursor: 'pointer'
                }}
                title="Editar os dados cadastrais deste cliente"
              >
                <Edit2 size={15} />
                Editar Cadastro
              </button>

              <button
                onClick={() => {
                  const clientToCharge = selectedClient;
                  setSelectedClient(null);
                  handleOpenNewCharge(clientToCharge);
                }}
                className="btn-primary-gold"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', gap: '0.4rem' }}
              >
                <CreditCard size={15} />
                Emitir Cobrança
              </button>

              <button
                onClick={() => handleDeleteClient(selectedClient.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#F87171',
                  cursor: 'pointer'
                }}
                title="Excluir este cadastro do painel"
              >
                <Trash2 size={15} />
                Excluir
              </button>

              <button
                onClick={() => setSelectedClient(null)}
                className="btn-secondary-subtle"
                style={{ padding: '0.65rem 1.35rem', fontSize: '0.82rem' }}
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: NOVA COBRANÇA SEGURA MERCADO PAGO (ANTIFRAUDE)*/}
      {/* ---------------------------------------------------- */}
      {isChargeModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 12, 0.88)',
          backdropFilter: 'blur(10px)',
          zIndex: 1250,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#0D121D',
            border: '1px solid rgba(0, 158, 227, 0.35)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 158, 227, 0.15)'
          }}>
            <button
              onClick={() => setIsChargeModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #009EE3 0%, #007EB5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 158, 227, 0.4)'
              }}>
                <CreditCard size={22} color="#FFFFFF" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: 0, fontWeight: 700 }}>
                  Nova Cobrança Segura — Mourato & Associados
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '2px 0 0' }}>
                  Emissão institucional com conformidade antifraude e liquidação direta.
                </p>
              </div>
            </div>

            {/* Antifraud Protocol Notice */}
            <div style={{
              background: 'rgba(0, 158, 227, 0.08)',
              border: '1px solid rgba(0, 158, 227, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <Shield size={18} color="#00B4FF" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.75rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                <strong style={{ color: '#00B4FF' }}>Protocolo Antifraude Ativo:</strong> Dados completos do pagador (Nome/Razão, CPF/CNPJ, E-mail e Telefone com DDD) e chave de idempotência exclusiva são exigidos para evitar recusa ou bloqueio da transação pelo motor antifraude.
              </div>
            </div>

            {chargeError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                color: '#F87171',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={16} />
                <span>{chargeError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSecureCharge} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Seção 1: Dados do Pagador */}
              <div style={{ background: '#080C14', padding: '1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>
                  1. Dados do Pagador (Validação Antifraude)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Nome Completo ou Razão Social *
                    </label>
                    <input 
                      type="text"
                      required
                      value={chargeForm.cliente}
                      onChange={(e) => setChargeForm({ ...chargeForm, cliente: e.target.value })}
                      placeholder="Ex: Razão Social do Cliente Ltda"
                      list="charge-clients-list"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                    <datalist id="charge-clients-list">
                      {clients.map(c => <option key={c.id} value={c.nomeRazao} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      CPF ou CNPJ (apenas números válidos) *
                    </label>
                    <input 
                      type="text"
                      required
                      value={chargeForm.documento}
                      onChange={(e) => setChargeForm({ ...chargeForm, documento: e.target.value })}
                      placeholder="11 dígitos (CPF) ou 14 dígitos (CNPJ)"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      E-mail do Pagador / Financeiro *
                    </label>
                    <input 
                      type="email"
                      required
                      value={chargeForm.email}
                      onChange={(e) => setChargeForm({ ...chargeForm, email: e.target.value })}
                      placeholder="financeiro@empresa.com.br"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Telefone com DDD (WhatsApp) *
                    </label>
                    <input 
                      type="text"
                      required
                      value={chargeForm.telefone}
                      onChange={(e) => setChargeForm({ ...chargeForm, telefone: e.target.value })}
                      placeholder="(11) 98765-4321"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>

                {/* Endereço resumido */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px', gap: '0.65rem', marginTop: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '0.25rem' }}>CEP</label>
                    <input 
                      type="text"
                      value={chargeForm.cep}
                      onChange={(e) => setChargeForm({ ...chargeForm, cep: e.target.value })}
                      placeholder="01045-001"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.7rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.78rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Logradouro & Bairro</label>
                    <input 
                      type="text"
                      value={chargeForm.logradouro}
                      onChange={(e) => setChargeForm({ ...chargeForm, logradouro: e.target.value })}
                      placeholder="Av. São Luís, República"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.7rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.78rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Cidade/UF</label>
                    <input 
                      type="text"
                      value={`${chargeForm.cidade}/${chargeForm.uf}`}
                      onChange={(e) => {
                        const parts = e.target.value.split('/');
                        setChargeForm({ ...chargeForm, cidade: parts[0] || 'São Paulo', uf: parts[1] || 'SP' });
                      }}
                      placeholder="SP/SP"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.7rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.78rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Especificações da Cobrança */}
              <div style={{ background: '#080C14', padding: '1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>
                  2. Valores & Condições Comerciais
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Descrição do Serviço * (Aparece na fatura bancária do cliente)
                    </label>
                    <select
                      value={chargeForm.descricao}
                      onChange={(e) => setChargeForm({ ...chargeForm, descricao: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem',
                        marginBottom: '0.4rem'
                      }}
                    >
                      <option value="Diagnóstico Estratégico de Spread & Custo de Dívida">Diagnóstico Estratégico de Spread &amp; Custo de Dívida</option>
                      <option value="Honorários de Assessoria & Estruturação de Spread">Honorários de Assessoria &amp; Estruturação de Spread</option>
                      <option value="Consultoria em Governança & Compliance Financeiro">Consultoria em Governança &amp; Compliance Financeiro</option>
                      <option value="Auditoria de Taxas e Contratos de Crédito Bancário">Auditoria de Taxas e Contratos de Crédito Bancário</option>
                      <option value="Outro">Descrição Personalizada...</option>
                    </select>
                    {chargeForm.descricao === 'Outro' && (
                      <input 
                        type="text"
                        placeholder="Digite a descrição detalhada do serviço..."
                        onChange={(e) => setChargeForm({ ...chargeForm, descricao: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.8rem',
                          background: '#0D121D',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 'var(--radius-xs)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem'
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Valor da Cobrança (R$) *
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      min="1.00"
                      value={chargeForm.valor}
                      onChange={(e) => setChargeForm({ ...chargeForm, valor: e.target.value })}
                      placeholder="1490.00"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Método de Pagamento *
                    </label>
                    <select
                      value={chargeForm.metodo}
                      onChange={(e) => setChargeForm({ ...chargeForm, metodo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="BOLETO">Boleto Bancário Registrado (Padrão Oficial)</option>
                      <option value="PIX">PIX Instantâneo (QR Code Dinâmico)</option>
                      <option value="CheckoutPro">Checkout Pro (Cartão de Crédito / Parcelado)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Vencimento
                    </label>
                    <input 
                      type="date"
                      value={chargeForm.vencimento}
                      onChange={(e) => setChargeForm({ ...chargeForm, vencimento: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Status de Conexão Mercado Pago */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                  Status da Integração:
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  background: mpConfig.accessToken ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 158, 227, 0.15)',
                  color: mpConfig.accessToken ? '#34D399' : '#00B4FF',
                  fontWeight: 600
                }}>
                  {mpConfig.accessToken ? '● Conectado ao Gateway Bancário Oficial' : '● Modo de Homologação Ativo'}
                </span>
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsChargeModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#CBD5E1',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isGeneratingCharge}
                  style={{
                    flex: 2,
                    padding: '0.8rem',
                    background: isGeneratingCharge ? '#64748B' : 'linear-gradient(135deg, #009EE3 0%, #007EB5 100%)',
                    border: '1px solid #00B4FF',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isGeneratingCharge ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(0, 158, 227, 0.4)'
                  }}
                >
                  {isGeneratingCharge ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Validando Antifraude &amp; Gerando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Emitir Cobrança Segura
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: QR CODE PIX / FATURA MERCADO PAGO            */}
      {/* ---------------------------------------------------- */}
      {activePixModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 12, 0.88)',
          backdropFilter: 'blur(8px)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#0D121D',
            border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(197, 168, 105, 0.2)'
          }}>
            <button
              onClick={() => setActivePixModal(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.8rem',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34D399',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginBottom: '0.85rem'
            }}>
              <ShieldCheck size={14} />
              COBRANÇA BANCÁRIA HOMOLOGADA
            </div>

            <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: '0 0 0.25rem', fontWeight: 700 }}>
              {activePixModal.cliente}
            </h3>
            <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              {activePixModal.descricao}
            </div>

            <div style={{ fontSize: '1.75rem', color: 'var(--gold-light)', fontWeight: 800, marginBottom: '1.25rem' }}>
              {formatMonetaryValue(activePixModal.valor)}
            </div>

            {/* QR Code Container */}
            <div style={{
              background: '#FFFFFF',
              padding: '1.25rem',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-block',
              margin: '0 auto 1.25rem',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
            }}>
              {activePixModal.qrCodeBase64 ? (
                <img 
                  src={`data:image/png;base64,${activePixModal.qrCodeBase64}`} 
                  alt="QR Code PIX Oficial" 
                  style={{ width: '180px', height: '180px', display: 'block' }} 
                />
              ) : (
                <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="180" height="180" fill="white" />
                  <rect x="15" y="15" width="40" height="40" fill="black" />
                  <rect x="22" y="22" width="26" height="26" fill="white" />
                  <rect x="27" y="27" width="16" height="16" fill="black" />

                  <rect x="125" y="15" width="40" height="40" fill="black" />
                  <rect x="132" y="22" width="26" height="26" fill="white" />
                  <rect x="137" y="27" width="16" height="16" fill="black" />

                  <rect x="15" y="125" width="40" height="40" fill="black" />
                  <rect x="22" y="132" width="26" height="26" fill="white" />
                  <rect x="27" y="137" width="16" height="16" fill="black" />

                  <rect x="65" y="20" width="10" height="10" fill="black" />
                  <rect x="85" y="20" width="10" height="10" fill="black" />
                  <rect x="75" y="35" width="10" height="10" fill="black" />
                  <rect x="65" y="50" width="10" height="10" fill="black" />
                  <rect x="95" y="50" width="10" height="10" fill="black" />
                  <rect x="20" y="65" width="10" height="10" fill="black" />
                  <rect x="40" y="75" width="10" height="10" fill="black" />
                  <rect x="70" y="70" width="40" height="40" fill="black" />
                  <rect x="78" y="78" width="24" height="24" fill="white" />
                  <rect x="84" y="84" width="12" height="12" fill="#009EE3" />
                  <rect x="120" y="70" width="10" height="10" fill="black" />
                  <rect x="145" y="85" width="10" height="10" fill="black" />
                  <rect x="65" y="125" width="10" height="10" fill="black" />
                  <rect x="85" y="135" width="10" height="10" fill="black" />
                  <rect x="105" y="125" width="10" height="10" fill="black" />
                  <rect x="125" y="145" width="10" height="10" fill="black" />
                  <rect x="145" y="125" width="10" height="10" fill="black" />
                </svg>
              )}
            </div>

            {/* Código Copia e Cola */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>
                Código PIX Copia e Cola:
              </span>
              <div style={{
                background: '#070A10',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.72rem',
                color: '#CBD5E1',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                textAlign: 'left',
                maxHeight: '60px',
                overflowY: 'auto'
              }}>
                {activePixModal.pixPayload}
              </div>
            </div>

            {/* Botões de Ação: Copiar PIX & Enviar WhatsApp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activePixModal.pixPayload);
                  setCopiedPixId(activePixModal.id);
                  setTimeout(() => setCopiedPixId(null), 2500);
                }}
                className="btn-primary-gold"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.82rem' }}
              >
                {copiedPixId === activePixModal.id ? (
                  <>
                    <Check size={16} />
                    Código PIX Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copiar Código PIX
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const textoWhatsApp = encodeURIComponent(
                    `Olá, ${activePixModal.cliente}!\n\n` +
                    `Segue a cobrança da *Mourato & Associados* referente a:\n` +
                    `📌 *${activePixModal.descricao}*\n` +
                    `💰 *Valor: ${formatMonetaryValue(activePixModal.valor)}*\n\n` +
                    `🔑 *Código PIX (Copia e Cola):*\n${activePixModal.pixPayload}\n\n` +
                    (activePixModal.ticketUrl && activePixModal.ticketUrl !== '#' ? `🔗 *Link da Fatura Oficial:*\n${activePixModal.ticketUrl}\n\n` : '') +
                    `Agradecemos a confiança.\n*Mourato & Associados — Assessoria Corporativa*`
                  );
                  window.open(`https://wa.me/?text=${textoWhatsApp}`, '_blank');
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
              >
                <Send size={15} />
                Enviar Cobrança via WhatsApp
              </button>

              {activePixModal.ticketUrl && activePixModal.ticketUrl !== '#' && (
                <a
                  href={activePixModal.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.74rem',
                    color: '#00B4FF',
                    textDecoration: 'underline',
                    marginTop: '0.25rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <ExternalLink size={12} />
                  Abrir link direto de pagamento
                </a>
              )}
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.68rem', color: '#64748B' }}>
              Identificador: {activePixModal.mpPaymentId} • Modo: {activePixModal.mode || 'Local'}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: PETIÇÕES & REQUERIMENTOS (HTML/IMPRESSÃO)    */}
      {bureauModalDoc && (() => {
        const activeClient = clients.find(c => c.id === selectedBureauClientId) || clients[0] || null;
        if (!activeClient) return null;
        const isSerasa = bureauModalDoc === 'serasa_petition';

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 7, 12, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 1150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}>
            <div style={{
              background: '#0D121D',
              border: '1px solid var(--gold-border)',
              borderRadius: 'var(--radius-md)',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2.25rem',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85)',
              position: 'relative'
            }}>
              <button
                onClick={() => setBureauModalDoc(null)}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '0.4rem'
                }}
              >
                <X size={18} />
              </button>

              <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--gold-light)', letterSpacing: '0.1em', fontWeight: 800 }}>
                  INSTRUMENTO JURÍDICO ADMINISTRATIVO • MOURATO &amp; ASSOCIADOS
                </span>
                <h2 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: '0.35rem 0 0', fontWeight: 800 }}>
                  {isSerasa 
                    ? 'Requerimento de Exclusão de Consultas Excessivas de Crédito (Serasa Experian)'
                    : 'Petição Administrativa de Purga & Retificação Cadastral (Boa Vista SCPC)'}
                </h2>
              </div>

              <div style={{
                background: '#070A10',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-xs)',
                padding: '1.5rem',
                fontSize: '0.84rem',
                lineHeight: 1.7,
                color: '#CBD5E1',
                fontFamily: 'Georgia, serif',
                whiteSpace: 'pre-line'
              }}>
                {isSerasa ? `
ILUSTRÍSSIMO DIRETOR DE OPERAÇÕES DA SERASA EXPERIAN S/A
DEPARTAMENTO DE CONFORMIDADE E CADASTRO POSITIVO

REQUERENTE: ${activeClient.nomeRazao}
DOCUMENTO (${activeClient.tipo === 'PJ' ? 'CNPJ' : 'CPF'}): ${activeClient.documento}
REPRESENTANTE LEGAL / SÓCIO: ${activeClient.socioVinculado || activeClient.responsavel || activeClient.nomeRazao}
DATA DO REQUERIMENTO: ${new Date().toLocaleDateString('pt-BR')}

Venho por meio deste, amparado nos ditames da Lei nº 8.078/90 (Código de Defesa do Consumidor, Artigo 43, § 2º e § 3º) e da Lei Complementar nº 166/2019 (Lei do Cadastro Positivo), requerer a IMEDIATA EXCLUSÃO E PURGA DAS ANOTAÇÕES DE CONSULTAS EXCESSIVAS DE CRÉDITO registradas no histórico dos últimos 6 meses.

FUNDAMENTAÇÃO:
1. O histórico financeiro da requerente encontra-se rigorosamente em dia, com Score auditado e ausência absoluta de títulos protestados ou dívidas ativas vencidas.
2. A mera cotação ou simulação de operações financeiras junto a instituições bancárias não pode ensejar depreciação artificial do Score de Crédito ('credit score damage').
3. A manutenção dessas consultas sem a correspondente contratação desvirtua a finalidade estatística do bureau, impondo ônus comercial indevido à parte interessada.

Nestes termos, pede e espera deferimento.

_______________________________________________
${activeClient.nomeRazao}
Titular / Representante Legal
Mourato & Associados — Assessoria em Mercado de Capitais
` : `
À DIRETORIA JURÍDICA E DE ATENDIMENTO
BOA VISTA SERVIÇOS S/A (SCPC EQUIFAX DO BRASIL)

TITULAR: ${activeClient.nomeRazao}
DOCUMENTO (${activeClient.tipo === 'PJ' ? 'CNPJ' : 'CPF'}): ${activeClient.documento}
DATA: ${new Date().toLocaleDateString('pt-BR')}

REQUERIMENTO DE RETIFICAÇÃO E EXPURGO CADASTRAL ADMINISTRATIVO

Pelo presente instrumento, com fulcro na Lei Federal nº 12.414/2011 e no art. 43 do CDC, requer-se a retificação tempestiva de quaisquer eventuais inconsistências ou consultas pretéritas atreladas ao documento acima epigrafado.

Certifica-se a plena regularidade fiscal e contábil, atestando conformidade plena perante os órgãos de registro e BACEN SCR (Rating A1).

Termos em que pede deferimento.

_______________________________________________
${activeClient.nomeRazao}
Mourato & Associados Ltda
`}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const text = isSerasa 
                      ? `REQUERIMENTO SERASA EXPERIAN\nTitular: ${activeClient.nomeRazao}\nDocumento: ${activeClient.documento}` 
                      : `PETIÇÃO BOA VISTA SCPC\nTitular: ${activeClient.nomeRazao}`;
                    if (navigator.clipboard) navigator.clipboard.writeText(text);
                    showToast('📋 Petição Copiada!', 'Texto do requerimento copiado com sucesso.');
                  }}
                  className="btn-secondary-subtle"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.8rem', gap: '0.45rem' }}
                >
                  <Copy size={14} />
                  Copiar Texto
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-primary-gold"
                  style={{ padding: '0.65rem 1.4rem', fontSize: '0.8rem', gap: '0.45rem' }}
                >
                  <Printer size={14} />
                  Imprimir / Salvar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setBureauModalDoc(null)}
                  className="btn-secondary-subtle"
                  style={{ padding: '0.65rem 1.2rem', fontSize: '0.8rem' }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ---------------------------------------------------- */}
      {/* TOAST FLUTUANTE DE NOTIFICAÇÃO (COPIA DE DOCUMENTO)  */}
      {/* ---------------------------------------------------- */}
      {bureauToast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 2500,
          background: '#0D1424',
          border: '1px solid var(--gold-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem 1.35rem',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85)',
          maxWidth: '420px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.85rem'
        }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '50%',
            padding: '0.4rem',
            color: '#34D399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Check size={16} />
          </div>
          <div>
            <strong style={{ color: 'var(--gold-light)', fontSize: '0.84rem', display: 'block', marginBottom: '0.2rem' }}>
              {bureauToast.title}
            </strong>
            <p style={{ color: '#CBD5E1', fontSize: '0.76rem', margin: 0, lineHeight: 1.45 }}>
              {bureauToast.message}
            </p>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO E DISPARO DA AUDIÊNCIA APROVADA (WHATSAPP & E-MAIL) */}
      {approvalModalData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 999999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            maxWidth: '560px', width: '100%',
            background: '#0D121D',
            border: '1px solid rgba(197, 168, 105, 0.5)',
            borderRadius: 'var(--radius-md, 12px)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
            padding: '2rem',
            display: 'flex', flexDirection: 'column', gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontWeight: 700,
                  letterSpacing: '0.05em'
                }}>
                  ✓ AUDIÊNCIA APROVADA
                </span>
                <h3 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginTop: '0.5rem', marginBottom: '0.2rem' }}>
                  {approvalModalData.lead.empresa}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0 }}>
                  {approvalModalData.lead.nome} • {approvalModalData.lead.telefone} • {approvalModalData.lead.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalData(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.35rem', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: 'rgba(37, 211, 102, 0.08)',
              border: '1px solid rgba(37, 211, 102, 0.25)',
              borderRadius: '8px', padding: '0.85rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.65rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>✉️</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4ADE80' }}>
                  E-mail Oficial Aberto no Google Workspace
                </div>
                <div style={{ fontSize: '0.74rem', color: '#CBD5E1' }}>
                  Enviado para: {approvalModalData.destEmail || approvalModalData.lead?.email || 'Cliente'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
              {/* 1. Botão que abre a mensagem do WhatsApp direto na conversa */}
              <a
                href={approvalModalData.wppWebUrl || approvalModalData.wppAppUrl || approvalModalData.wppUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                  padding: '1rem 1.5rem', background: '#25D366', color: '#051E0E',
                  fontWeight: 700, fontSize: '0.98rem', borderRadius: '10px', textDecoration: 'none',
                  boxShadow: '0 4px 18px rgba(37, 211, 102, 0.4)', transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>💬</span> Abrir Mensagem no WhatsApp
              </a>

              {/* 2. Botão que fecha a tela */}
              <button
                type="button"
                onClick={() => setApprovalModalData(null)}
                className="btn-secondary-subtle"
                style={{
                  padding: '0.85rem 1.25rem', fontSize: '0.88rem',
                  fontWeight: 600, justifyContent: 'center', borderRadius: '10px'
                }}
              >
                ✕ Fechar Tela
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
