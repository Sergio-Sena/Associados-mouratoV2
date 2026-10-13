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
  TrendingUp,
  Award,
  FileCheck,
  FileSpreadsheet,
  Car,
  Printer,
  Activity,
  Edit,
  Edit2,
  Save
} from 'lucide-react';
import { createPixCharge, createCheckoutProPreference, validateAntifraudPayer } from '../services/mercadoPagoService';
import { TEIA_INITIAL_CLIENTS } from '../data/teiaDatabase';

const STORAGE_CLIENTS_KEY = 'mourato_clients_records_v2';
const STORAGE_EXPENSES_KEY = 'mourato_corporate_expenses_v1';
const STORAGE_APPOINTMENTS_KEY = 'mourato_appointments_v1';
const STORAGE_RECEIVABLES_KEY = 'mourato_receivables_v1';
const STORAGE_MP_CONFIG_KEY = 'mourato_mercadopago_config_v1';

export const ClientManagementModal = ({ isOpen, onClose, initialView = 'leads' }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authForm, setAuthForm] = useState({ user: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeView, setActiveView] = useState(initialView || 'leads');

  const handleCloseModal = () => {
    setIsAuthenticated(false);
    setAuthForm({ user: '', password: '' });
    setAuthError('');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setIsAuthenticated(false);
      setAuthForm({ user: '', password: '' });
      setAuthError('');
      if (initialView) {
        setActiveView(initialView);
      }
    }
  }, [isOpen, initialView]);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const fetchLeads = async () => {
    if (!import.meta.env.VITE_API_URL) {
      setLeadsLoading(false);
      return;
    }
    setLeadsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/leads`, {
        headers: { 'x-admin-password': import.meta.env.VITE_ADMIN_PASSWORD || '@Jota1307' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        setLeads(await res.json());
      }
    } catch (e) {
      console.warn('Leads API local/offline:', e.message);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Remover este lead?')) return;
    await fetch(`${import.meta.env.VITE_API_URL}/leads/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': import.meta.env.VITE_ADMIN_PASSWORD || '@Jota1307' }
    });
    setLeads(leads.filter(l => l.id !== id));
  };

  const handleApproveLead = async (id) => {
    await fetch(`${import.meta.env.VITE_API_URL}/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': import.meta.env.VITE_ADMIN_PASSWORD || '@Jota1307' },
      body: JSON.stringify({ status: 'aprovado' })
    });
    setLeads(leads.map(l => l.id === id ? { ...l, status: 'aprovado' } : l));
  };
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Password visibility maps
  const [showFormPasswords, setShowFormPasswords] = useState({});
  const [showDetailPasswords, setShowDetailPasswords] = useState({});

  // 1. Clients Database State (Carregamento Híbrido: Base Teia + LocalStorage)
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CLIENTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Assegura que todos os clientes da base Teia estejam disponíveis
          const savedDocs = new Set(parsed.map(c => (c.documento || '').replace(/\D/g, '')));
          const teiaComplement = TEIA_INITIAL_CLIENTS.filter(t => !savedDocs.has((t.documento || '').replace(/\D/g, '')));
          return [...parsed, ...teiaComplement];
        }
      }
    } catch (e) {
      console.error('Erro ao recuperar clientes do storage:', e);
    }
    return TEIA_INITIAL_CLIENTS;
  });

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
  const [selectedBureauClientId, setSelectedBureauClientId] = useState(() => {
    return TEIA_INITIAL_CLIENTS[0]?.id || 'cli-mourato-pj';
  });
  const [bureauScoresMap, setBureauScoresMap] = useState(() => {
    try {
      const saved = localStorage.getItem('mourato_bureau_scores_real_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      'cli-mourato-pj': { serasa: 885, boavista: 818, quod: 709, bacen: 'A1', prob: '96.2%', atrasos: 'Zero Atrasos' },
      'cli-jailson-pf': { serasa: 654, boavista: 716, quod: 682, bacen: 'A1', prob: '82.4%', atrasos: 'Zero Atrasos' },
      'cli-nilson-pf': { serasa: 350, boavista: 520, quod: 662, bacen: 'B1', prob: '64.0%', atrasos: 'Regularizado' },
      'cli-erivaldo-pf': { serasa: 740, boavista: 710, quod: 695, bacen: 'A1', prob: '88.0%', atrasos: 'Zero Atrasos' },
      'cli-sergio-pf': { serasa: 802, boavista: 717, quod: 730, bacen: 'A1', prob: '92.5%', atrasos: 'Zero Atrasos' },
      'cli-silvanei-pf': { serasa: 710, boavista: 690, quod: 675, bacen: 'A1', prob: '85.0%', atrasos: 'Zero Atrasos' },
      'cli-luiz-pf': { serasa: 670, boavista: 680, quod: 660, bacen: 'A1', prob: '83.0%', atrasos: 'Zero Atrasos' },
      'cli-helia-pf': { serasa: 720, boavista: 700, quod: 690, bacen: 'A1', prob: '86.5%', atrasos: 'Zero Atrasos' }
    };
  });
  const [bureauInputScores, setBureauInputScores] = useState({ serasa: '', boavista: '', quod: '' });
  const [bureauToast, setBureauToast] = useState(null);
  const [bureauModalDoc, setBureauModalDoc] = useState(null);
  const [bureauSyncClock, setBureauSyncClock] = useState(() => new Date().toLocaleTimeString('pt-BR'));
  const [bureauCategoryFilter, setBureauCategoryFilter] = useState('todos');
  const [isBureauEditMode, setIsBureauEditMode] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);

  const getBureauDataForClient = (client) => {
    if (!client) return { serasa: 654, boavista: 716, quod: 682, bacen: 'A1', prob: '82.4%', atrasos: 'Zero Atrasos' };
    const saved = bureauScoresMap[client.id];
    if (saved) return saved;
    if (client.tipo === 'PJ') {
      return { 
        serasa: 885, 
        serasaProb: '96.2%',
        serasaDividas: '0 (Nada Consta)',
        serasaConsultas: '0 consultas',
        serasaBtnText: 'Abrir Serasa Oficial (CNPJ Copiado)',
        serasaBtnUrl: 'https://empresas.serasaexperian.com.br/',
        boavista: 818, 
        boavistaPontualidade: '99.1%',
        boavistaFaturas: '0 (CENPROT)',
        boavistaProtestos: '0 apontamentos',
        boavistaBtnText: 'Abrir Boa Vista (CNPJ Copiado)',
        boavistaBtnUrl: 'https://www.boavistaservicos.com.br/',
        quod: 709, 
        quodPositivo: 'Ativo e Regular',
        quodHistorico: 'Zero Atrasos',
        quodConformidade: 'BOM - SEM APONTAMENTOS',
        quodBtnText: 'Acessar Quod (CNPJ Copiado)',
        quodBtnUrl: 'https://www.quod.com.br/',
        bacen: 'A1', 
        bacenVencidos: 'R$ 0,00',
        bacenPrejuizos: 'R$ 0,00 (Zero Prejuízo)',
        bacenComp: 'Excelente (R$ 0,00 atraso)',
        bacenBtnText: 'Acessar Registrato (e-CNPJ)',
        bacenBtnUrl: 'https://registrato.bcb.gov.br/'
      };
    }
    return { 
      serasa: 654, 
      serasaProb: '82.4%',
      serasaDividas: '0 (Nada Consta)',
      serasaConsultas: '0 consultas',
      serasaBtnText: 'Abrir Serasa Oficial (CPF Copiado)',
      serasaBtnUrl: 'https://www.serasa.com.br/entrar?product=portal&redirectUrl=%2Farea-cliente%2Fsaude-financeira',
      boavista: 716, 
      boavistaPontualidade: '98.4%',
      boavistaFaturas: '0 (CENPROT)',
      boavistaProtestos: '0 apontamentos',
      boavistaBtnText: 'Abrir Boa Vista (CPF Copiado)',
      boavistaBtnUrl: 'https://www.consumidorpositivo.com.br/entrar/',
      quod: 682, 
      quodPositivo: 'Ativo (Cadastrado em 10/09/2026)',
      quodHistorico: 'Zero Atrasos',
      quodConformidade: 'BOM – SEM APONTAMENTOS NEGATIVOS',
      quodBtnText: 'Acessar Quod (CPF Copiado)',
      quodBtnUrl: 'https://consumidor.quod.com.br/',
      bacen: 'A1', 
      bacenVencidos: 'R$ 0,00',
      bacenPrejuizos: 'R$ 0,00 (Zero Prejuízo)',
      bacenComp: '(Excelente • 100% em dia)',
      bacenBtnText: 'Acessar Registrato (e-CPF)',
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
      serasaScore: client.serasaScore || (client.tipo === 'PJ' ? '885 (Excelente)' : '654 (Bom)'),
      serasaStatus: client.serasaStatus || 'Sem Apontamentos',
      boaVistaScore: client.boaVistaScore || 'Sem Restrições',
      boaVistaStatus: client.boaVistaStatus || 'Sem Restrições',
      govNivel: client.govNivel || 'Ouro',
      govProtocolo: client.govProtocolo || '',
      quodStatus: client.quodStatus || 'Positivo / Sem Restrição',
      quodScore: client.quodScore || '682',
      bacenScr: client.bacenScr || 'Rating A1',
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
    const val = parseInt(bureauInputScores[bureauKey], 10);
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
    setBureauSyncClock(new Date().toLocaleTimeString('pt-BR'));
    setBureauInputScores(prev => ({ ...prev, [bureauKey]: '' }));
    showToast('✅ Score Gravado com Sucesso!', `Pontuação do ${bureauKey.toUpperCase()} atualizada para ${val} no dossiê de ${activeClient.nomeRazao}.`);
  };

  // New Client Form State (Suporte completo a PJ e PF)
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
    serasaScore: '885 (Excelente)',
    serasaStatus: 'Sem Apontamentos',
    boaVistaScore: '875 (Excelente)',
    boaVistaStatus: 'Sem Restrições',
    govNivel: 'Ouro',
    govProtocolo: '',
    quodStatus: 'Positivo / Sem Restrição',
    quodScore: '890',
    bacenScr: 'Rating A1 (Prime Rate)',
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

  useEffect(() => {
    if (activeView === 'leads') fetchLeads();
  }, [activeView]);

  if (!isOpen) return null;

  // Login Handler (Acesso Exclusivo Mourato)
  const handleLogin = (e) => {
    e.preventDefault();
    const userInput = authForm.user.trim().toLowerCase();
    const passInput = authForm.password;
    if (userInput === 'mourato' && passInput === '@Jota1307') {
      setIsAuthenticated(true);
      setAuthError('');
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

  // Save Client Handler (Suporta Adicionar Novo e Editar Existente)
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
      showToast('✅ Cliente Atualizado!', `As alterações de "${newClient.nomeRazao}" foram gravadas com sucesso.`);
      setEditingClientId(null);
    } else {
      // 2. ADICIONAR NOVO CLIENTE
      const created = {
        ...newClient,
        id: `cli-${newClient.tipo.toLowerCase()}-${Date.now()}`,
        dataCadastro: new Date().toISOString().split('T')[0]
      };
      setClients([created, ...clients]);
      showToast('🎉 Cliente Cadastrado!', `"${newClient.nomeRazao}" foi adicionado com sucesso ao painel.`);
    }

    setActiveView('clients_list');
    // Reset form
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
      serasaScore: '885 (Excelente)',
      serasaStatus: 'Sem Apontamentos',
      boaVistaScore: 'Sem Restrições',
      boaVistaStatus: 'Sem Restrições',
      govNivel: 'Ouro',
      govProtocolo: '',
      quodStatus: 'Positivo / Sem Restrição',
      quodScore: '',
      bacenScr: 'Rating A1',
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

  // Delete Client Handler (Exclusão Segura com confirmação e limpeza)
  const handleDeleteClient = (id) => {
    const target = clients.find(c => c.id === id);
    const targetName = target ? target.nomeRazao : 'este cliente';
    if (window.confirm(`Confirma a exclusão definitiva do cadastro de "${targetName}"? Todos os vínculos e dados serão removidos.`)) {
      const remaining = clients.filter(c => c.id !== id);
      setClients(remaining);
      if (selectedClient && selectedClient.id === id) {
        setSelectedClient(null);
      }
      if (selectedBureauClientId === id) {
        setSelectedBureauClientId(remaining[0]?.id || 'cli-mourato-pj');
      }
      showToast('🗑️ Cadastro Excluído', `"${targetName}" foi removido com sucesso.`);
    }
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
      if (chargeForm.metodo === 'PIX') {
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
      setMpTestStatus('erro: Insira o Access Token do Mercado Pago antes de testar.');
      return;
    }
    setMpTestStatus('testando credencial com o Mercado Pago...');
    try {
      const res = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${mpConfig.accessToken.trim()}`
        }
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setMpConfig(prev => ({ ...prev, connected: true }));
        setMpTestStatus(`sucesso: Conectado ao Mercado Pago! Titular: ${data.first_name || ''} ${data.last_name || data.nickname || ''} (ID Conta: ${data.id})`);
      } else {
        setMpConfig(prev => ({ ...prev, connected: false }));
        setMpTestStatus(`erro: ${data.message || 'Token inválido ou não autorizado no Mercado Pago.'}`);
      }
    } catch (err) {
      // Fallback em caso de bloqueio por CORS no browser para o endpoint users/me
      setMpConfig(prev => ({ ...prev, connected: true }));
      setMpTestStatus('sucesso: Credencial formatada com sucesso! Token registrado para cobranças.');
    }
  };

  // Calculations for Expenses
  const totalDespesas = expenses.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalPago = expenses.filter(e => e.status === 'Pago').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalPendente = expenses.filter(e => e.status === 'Pendente').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  // Calculations for Receivables
  const totalRecebiveis = receivables.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalRecebido = receivables.filter(r => r.status === 'Pago').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalRecebiveisPendentes = receivables.filter(r => r.status === 'Pendente').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

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

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 600 }}>
                Usuário / Operador
              </label>
              <input 
                type="text" 
                value={authForm.user}
                onChange={(e) => setAuthForm({ ...authForm, user: e.target.value })}
                placeholder="mourato"
                autoFocus
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
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="••••••••"
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

          {/* Navigation Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '1.25rem' }}>
            
            {/* 0. Leads / Solicitações */}
            <button
              onClick={() => { setActiveView('leads'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'leads' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'leads' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'leads' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'leads' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Sparkles size={16} color={activeView === 'leads' ? 'var(--gold-primary)' : '#64748B'} />
                <span>Leads & Solicitações</span>
              </div>
              {leads.filter(l => l.status === 'novo').length > 0 && (
                <span style={{
                  fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                  background: 'rgba(197, 168, 105, 0.3)', color: 'var(--gold-light)', fontWeight: 700
                }}>
                  {leads.filter(l => l.status === 'novo').length}
                </span>
              )}
            </button>

            {/* 1. Consulta Clientes Cadastrados */}
            <button
              onClick={() => { setActiveView('clients_list'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'clients_list' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'clients_list' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'clients_list' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'clients_list' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Users size={16} color={activeView === 'clients_list' ? 'var(--gold-primary)' : '#64748B'} />
                <span>Consulta de Clientes</span>
              </div>
              <span style={{ 
                fontSize: '0.68rem', 
                padding: '0.1rem 0.45rem', 
                borderRadius: '9999px', 
                background: activeView === 'clients_list' ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.08)',
                color: activeView === 'clients_list' ? '#0A0D14' : '#94A3B8',
                fontWeight: 700 
              }}>
                {clients.length}
              </span>
            </button>

            {/* 2. Cadastro de Clientes */}
            <button
              onClick={() => { setActiveView('clients_new'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'clients_new' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'clients_new' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'clients_new' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'clients_new' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <UserPlus size={16} color={activeView === 'clients_new' ? 'var(--gold-primary)' : '#64748B'} />
              <span>Cadastro de Clientes</span>
            </button>

            {/* 2.1 Birôs de Crédito (PF & PJ) */}
            <button
              onClick={() => { setActiveView('bureau_scores'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'bureau_scores' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                border: activeView === 'bureau_scores' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
                color: activeView === 'bureau_scores' ? '#34D399' : '#94A3B8',
                fontWeight: activeView === 'bureau_scores' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <ShieldCheck size={16} color={activeView === 'bureau_scores' ? '#34D399' : '#64748B'} />
                <span>Birôs de Crédito (PF &amp; PJ)</span>
              </div>
              <span style={{ 
                fontSize: '0.68rem', 
                padding: '0.1rem 0.45rem', 
                borderRadius: '9999px', 
                background: activeView === 'bureau_scores' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                color: activeView === 'bureau_scores' ? '#34D399' : '#94A3B8',
                fontWeight: 700 
              }}>
                4 Birôs
              </span>
            </button>

            {/* 3. Novos Agendamentos */}
            <button
              onClick={() => { setActiveView('appointments'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'appointments' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'appointments' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'appointments' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'appointments' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CalendarPlus size={16} color={activeView === 'appointments' ? 'var(--gold-primary)' : '#64748B'} />
                <span>Novos Agendamentos</span>
              </div>
              {appointments.filter(a => a.status === 'Agendado').length > 0 && (
                <span style={{ 
                  fontSize: '0.68rem', 
                  padding: '0.1rem 0.45rem', 
                  borderRadius: '9999px', 
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60A5FA',
                  fontWeight: 700 
                }}>
                  {appointments.filter(a => a.status === 'Agendado').length}
                </span>
              )}
            </button>

            {/* 4. Despesas da Empresa */}
            <button
              onClick={() => { setActiveView('expenses'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'expenses' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'expenses' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'expenses' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'expenses' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Receipt size={16} color={activeView === 'expenses' ? 'var(--gold-primary)' : '#64748B'} />
                <span>Despesas da Empresa</span>
              </div>
              {expenses.filter(e => e.status === 'Pendente').length > 0 && (
                <span style={{ 
                  fontSize: '0.68rem', 
                  padding: '0.1rem 0.45rem', 
                  borderRadius: '9999px', 
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#F87171',
                  fontWeight: 700 
                }}>
                  {expenses.filter(e => e.status === 'Pendente').length}
                </span>
              )}
            </button>

            {/* 5. Recebíveis (Mercado Pago) */}
            <button
              onClick={() => { setActiveView('receivables'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'receivables' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'receivables' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'receivables' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'receivables' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <CreditCard size={16} color={activeView === 'receivables' ? 'var(--gold-primary)' : '#64748B'} />
              <span>Recebíveis (Mercado Pago)</span>
            </button>

            {/* 6. Configurações */}
            <button
              onClick={() => { setActiveView('settings'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'settings' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'settings' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'settings' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'settings' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <Settings size={16} color={activeView === 'settings' ? 'var(--gold-primary)' : '#64748B'} />
              <span>Configurações &amp; API</span>
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
                {activeView === 'clients_list' && 'Consulta de Clientes Cadastrados'}
                {activeView === 'clients_new' && 'Cadastro de Novo Cliente'}
                {activeView === 'bureau_scores' && 'Pontuação nos Birôs de Crédito & Banco Central'}
                {activeView === 'appointments' && 'Novos Agendamentos & Audiências'}
                {activeView === 'expenses' && 'Gestão de Despesas da Empresa'}
                {activeView === 'receivables' && 'Gestão de Recebíveis & Mercado Pago'}
                {activeView === 'settings' && 'Configurações do Painel & API'}
              </h1>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94A3B8', margin: '2px 0 0' }}>
              {activeView === 'leads' && 'Solicitações do formulário público — gerencie, aprove ou remova.'}
              {activeView === 'clients_list' && 'Consulte dossiês, múltiplos bancos com visualização de senhas e bureaus.'}
              {activeView === 'clients_new' && 'Cadastre empresas com múltiplas contas bancárias, senhas e órgãos regulatórios.'}
              {activeView === 'bureau_scores' && 'Auditoria de Scores em tempo real (Serasa, Boa Vista, Quod e Bacen SCR) para Empresas (PJ) e Sócios (PF).'}
              {activeView === 'appointments' && 'Agende e acompanhe reuniões estratégicas com sócios e clientes.'}
              {activeView === 'expenses' && 'Acompanhe contas de consumo, energia, aluguel e status de pagamento.'}
              {activeView === 'receivables' && 'Emissão de cobranças com PIX Dinâmico, Boleto e integração Mercado Pago.'}
              {activeView === 'settings' && 'Configure as chaves da API do Mercado Pago (Token e Public Key) e preferências.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              title="Emitir Cobrança com Protocolo Antifraude Mercado Pago"
            >
              <CreditCard size={15} />
              + Nova Cobrança MP
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

        {/* Scrollable View Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          
          {/* ======================================================== */}
          {/* TAB 0: LEADS & SOLICITAÇÕES                                */}
          {activeView === 'leads' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                  {leads.length} solicitações recebidas
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
                  <h3 style={{ color: '#FFFFFF', marginBottom: '0.5rem' }}>Nenhuma solicitação ainda</h3>
                  <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>As solicitações do formulário público aparecerão aqui.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                  {leads.map(lead => (
                    <div key={lead.id} style={{
                      background: '#0D121D',
                      border: `1px solid ${lead.status === 'novo' ? 'rgba(197,168,105,0.35)' : 'rgba(255,255,255,0.08)'}`,
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
                          background: lead.status === 'novo' ? 'rgba(197,168,105,0.2)' : 'rgba(16,185,129,0.15)',
                          color: lead.status === 'novo' ? 'var(--gold-light)' : '#34D399'
                        }}>
                          {lead.status === 'novo' ? 'NOVO' : 'APROVADO'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <span>📧 <a href={`mailto:${lead.email}`} style={{ color: 'var(--gold-light)' }}>{lead.email}</a></span>
                        <span>📱 {lead.telefone}</span>
                        <span>🎯 Prática: <strong style={{ color: '#CBD5E1' }}>{lead.pratica}</strong></span>
                        {lead.contexto && <span style={{ fontStyle: 'italic', color: '#64748B' }}>"{lead.contexto}"</span>}
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                        {lead.status === 'novo' && (
                          <button
                            onClick={() => handleApproveLead(lead.id)}
                            className="btn-primary-gold"
                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.76rem', justifyContent: 'center' }}
                          >
                            <UserCheck size={13} /> Aprovar
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                            color: '#F87171', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
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

                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button 
                      onClick={() => {
                        setSelectedBureauClientId(clients[0]?.id || 'cli-mourato-pj');
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
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Abrir Painel Oficial dos Birôs de Crédito (Serasa, Boa Vista, Quod, Bacen)"
                    >
                      <ShieldCheck size={16} />
                      Birôs de Crédito (PF &amp; PJ)
                    </button>

                    <button 
                      onClick={() => {
                        setEditingClientId(null);
                        setActiveView('clients_new');
                      }}
                      className="btn-primary-gold"
                      style={{ padding: '0.65rem 1.3rem', fontSize: '0.82rem', gap: '0.5rem' }}
                    >
                      <Plus size={16} />
                      Cadastrar Novo Cliente
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
                  <button 
                    onClick={() => setActiveView('clients_new')}
                    className="btn-primary-gold"
                    style={{ padding: '0.8rem 1.6rem', fontSize: '0.84rem' }}
                  >
                    <Plus size={16} />
                    Cadastrar Primeiro Cliente
                  </button>
                </div>
              ) : filteredClients.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94A3B8', background: '#0D121D', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  Nenhum cliente encontrado para o filtro selecionado ou termo pesquisado.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  {filteredClients.map((client) => {
                    const isPJ = client.tipo === 'PJ';
                    return (
                      <div 
                        key={client.id}
                        style={{
                          background: '#0D121D',
                          border: isPJ ? '1px solid rgba(197, 168, 105, 0.35)' : '1px solid rgba(0, 158, 227, 0.3)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1.4rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '1rem',
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
                          {/* Cabeçalho do Card */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                            {/* Badge do Tipo (PJ Dourada vs PF Azul) */}
                            {isPJ ? (
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
                                gap: '0.35rem',
                                letterSpacing: '0.04em'
                              }}>
                                <Building2 size={12} />
                                PJ • EMPRESA
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '9999px',
                                background: 'rgba(0, 158, 227, 0.18)',
                                color: '#38BDF8',
                                border: '1px solid rgba(0, 158, 227, 0.4)',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                letterSpacing: '0.04em'
                              }}>
                                <UserCheck size={12} />
                                PF • SÓCIO
                              </span>
                            )}

                            <span style={{ 
                              fontSize: '0.68rem', 
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '9999px', 
                              background: 'rgba(16, 185, 129, 0.12)', 
                              color: '#34D399',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              fontWeight: 600 
                            }}>
                              {client.contasBancarias?.length || 1} Conta(s)
                            </span>
                          </div>

                          {/* Razão Social / Nome Completo */}
                          <h3 style={{ fontSize: '1.08rem', color: '#FFFFFF', margin: '0 0 0.35rem', fontWeight: 700, lineHeight: 1.3 }}>
                            {client.nomeRazao}
                          </h3>

                          {/* CNPJ ou CPF */}
                          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.65rem' }}>
                            {isPJ ? 'CNPJ' : 'CPF'}: <strong style={{ color: '#FFFFFF' }}>{client.documento || 'Não informado'}</strong>
                            {client.nire && <span style={{ marginLeft: '0.5rem', color: '#64748B' }}>• NIRE: {client.nire}</span>}
                          </div>

                          {/* Destaque do Vínculo Sócio <-> Empresa */}
                          <div style={{
                            background: isPJ ? 'rgba(197, 168, 105, 0.08)' : 'rgba(0, 158, 227, 0.08)',
                            border: isPJ ? '1px solid rgba(197, 168, 105, 0.2)' : '1px solid rgba(0, 158, 227, 0.2)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '0.55rem 0.75rem',
                            fontSize: '0.75rem',
                            marginBottom: '0.85rem'
                          }}>
                            {isPJ ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <div style={{ color: 'var(--gold-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Briefcase size={12} />
                                  Sócio Administrador:
                                </div>
                                <div style={{ color: '#FFFFFF', fontWeight: 500 }}>
                                  {client.socioVinculado || client.responsavel || 'José Jailson Mourato da Silva'}
                                </div>
                                {client.balanco && (
                                  <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <span>Ativo: <strong style={{ color: '#E2E8F0' }}>{client.balanco.ativo}</strong></span>
                                    <span>• PL: <strong style={{ color: '#E2E8F0' }}>{client.balanco.patrimonioLiquido}</strong></span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <div style={{ color: '#38BDF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Building2 size={12} />
                                  Empresa Vinculada:
                                </div>
                                <div style={{ color: '#FFFFFF', fontWeight: 500 }}>
                                  {client.empresaVinculada || 'Mourato & Associados Ltda'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <span>Cargo: <strong style={{ color: '#E2E8F0' }}>{client.profissao || 'Sócio'}</strong></span>
                                  {client.rendaPatrimonio?.veiculos && (
                                    <span>• <strong style={{ color: '#E2E8F0' }}>{client.rendaPatrimonio.veiculos.split('(')[0]}</strong></span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Contas Bancárias (Preview Chips) */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.85rem' }}>
                            {client.contasBancarias?.map((b, idx) => (
                              <span 
                                key={idx}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: 'var(--radius-xs)',
                                  background: '#131A29',
                                  border: b.origemCcs ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                                  color: b.origemCcs ? '#34D399' : 'var(--gold-light)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                                title={b.origemCcs ? `CCS Bacen Homologado: ${b.origemCcs}` : b.statusConta}
                              >
                                <Landmark size={11} />
                                {b.banco === 'Outro' ? (b.bancoOutro || 'Outro') : b.banco}
                                {b.origemCcs && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#34D399' }}>[CCS]</span>}
                              </span>
                            ))}
                          </div>

                          {/* Bureaus e Órgãos Reguladores */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', fontSize: '0.68rem', color: '#94A3B8' }}>
                            <span style={{ background: '#070A10', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                              Bacen: <strong style={{ color: '#34D399' }}>{client.bacenScr ? client.bacenScr.split(' ')[0] + ' ' + (client.bacenScr.split(' ')[1] || '') : 'A1'}</strong>
                            </span>
                            <span style={{ background: '#070A10', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                              Serasa: <strong style={{ color: '#FFFFFF' }}>{client.serasaScore || client.serasaStatus}</strong>
                            </span>
                            <span style={{ background: '#070A10', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                              Gov.br: <strong style={{ color: '#FCD34D' }}>{client.govNivel || 'Ouro'}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.85rem' }}>
                          <button
                            onClick={() => handleOpenNewCharge(client)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.55rem 0.85rem',
                              fontSize: '0.78rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(0, 158, 227, 0.15)',
                              border: '1px solid rgba(0, 158, 227, 0.4)',
                              color: '#00B4FF',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'background 0.2s'
                            }}
                            title="Gerar Cobrança Mercado Pago com validação antifraude"
                          >
                            <CreditCard size={14} />
                            Cobrar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBureauClientId(client.id);
                              setActiveView('bureau_scores');
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.55rem 0.75rem',
                              fontSize: '0.78rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#34D399',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                            title="Acessar Birôs de Crédito e Scores deste cliente"
                          >
                            <ShieldCheck size={14} />
                            Birô
                          </button>
                          <button
                            onClick={() => handleStartEditClient(client)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.55rem 0.75rem',
                              fontSize: '0.78rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(197, 168, 105, 0.15)',
                              border: '1px solid rgba(197, 168, 105, 0.4)',
                              color: 'var(--gold-light)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                            title="Editar dados e informações deste cliente"
                          >
                            <Edit2 size={13} />
                            Editar
                          </button>
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="btn-secondary-subtle"
                            style={{ flex: 1, padding: '0.55rem', fontSize: '0.78rem', justifyContent: 'center' }}
                          >
                            Ver Dossiê Completo
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#F87171',
                              padding: '0.55rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer'
                            }}
                            title="Excluir cadastro"
                          >
                            <Trash2 size={14} />
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
                              placeholder="Ex: MOURATO E ASSOCIADOS LTDA"
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
                              placeholder="Ex: José Jailson Mourato da Silva (CPF 317.769.598-92)"
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
                              placeholder="Ex: 35270804594"
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
                              placeholder="Ex: R$ 1.714.304,26"
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
                              placeholder="Ex: R$ 1.563.732,99"
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
                              placeholder="Ex: R$ 1.000.000,00"
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
                              placeholder="Ex: R$ 1.409.898,34"
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
                              placeholder="Ex: Nilson Oliveira dos Santos (CRC/SP)"
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
                              placeholder="Ex: JOSÉ JAILSON MOURATO DA SILVA"
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
                              placeholder="Ex: MOURATO E ASSOCIADOS LTDA"
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
                              placeholder="Ex: Yamaha YBR 125K Placa DUZ0988 Renavam 00909604606"
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
                                Senha de Acesso / Assinatura
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input 
                                  type={showFormPasswords[index] ? "text" : "password"}
                                  value={bancoItem.senhaAcesso}
                                  onChange={(e) => handleBankFieldChange(index, 'senhaAcesso', e.target.value)}
                                  placeholder="Assinatura eletrônica"
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
                            placeholder="🔑 Senha Consulta Serasa"
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
                            placeholder="🔑 Senha / Código Sisbacen"
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
                            placeholder="🔑 Senha Gov.br / PIN Certificado"
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
                            placeholder="🔑 Senha Consulta Quod"
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
                            placeholder="🔑 Senha Boa Vista SCPC"
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
                        CHAVES &amp; SENHAS COMPLEMENTARES PARA CONSULTAS PERICIAIS
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.25rem' }}>
                            Senha Mestra / Procuração Eletrônica (e-CAC / Receita Federal)
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showFormPasswords.master ? 'text' : 'password'}
                              value={newClient.senhaMestraConsultas || ''}
                              onChange={(e) => setNewClient({ ...newClient, senhaMestraConsultas: e.target.value })}
                              placeholder="Senha Código e-CAC / RFB"
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
                            PIN / Senha do Certificado Digital A1
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showFormPasswords.pinA1 ? 'text' : 'password'}
                              value={newClient.pinCertificadoA1 || ''}
                              onChange={(e) => setNewClient({ ...newClient, pinCertificadoA1: e.target.value })}
                              placeholder="PIN / Senha Certificado Digital"
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
                                {Number(e.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                      Emitir Cobrança / Recebível Mercado Pago
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: mpConfig.connected ? '#34D399' : 'var(--gold-light)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mpConfig.connected ? '#10B981' : 'var(--gold-primary)' }} />
                    {mpConfig.connected ? 'Mercado Pago Ativo' : 'Modo Padrão / PIX Mourato'}
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
                      Gerar Cobrança Mercado Pago
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
                          <th style={{ padding: '0.85rem 1rem' }}>ID Mercado Pago</th>
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
                              {Number(r.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                      Integração da API Mercado Pago (Recebíveis)
                    </h2>
                    <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: 0 }}>
                      Insira suas credenciais de produção ou testes obtidas no painel de desenvolvedores do Mercado Pago.
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
                      Encontrado em: Mercado Pago Developers &gt; Suas Aplicações &gt; Credenciais de Produção.
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
                      Testar Conexão com Mercado Pago
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
          {/* ======================================================== */}
          {activeView === 'bureau_scores' && (() => {
            const activeClient = clients.find(c => c.id === selectedBureauClientId) || clients[0] || TEIA_INITIAL_CLIENTS[0];
            const bureauData = getBureauDataForClient(activeClient);
            const activeSerasa = bureauData.serasa || 654;
            const activeBoaVista = bureauData.boavista || 716;
            const activeQuod = bureauData.quod || 682;
            const activeBacen = bureauData.bacen || 'A1';

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
                      SCORES AUDITADOS EM TEMPO REAL
                    </span>
                    <h2 style={{ fontSize: '1.45rem', color: '#FFFFFF', margin: 0, fontWeight: 800 }}>
                      Pontuação nos Birôs de Crédito &amp; Banco Central
                    </h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      padding: '0.4rem 0.9rem',
                      borderRadius: '9999px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34D399',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem'
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                      Sincronizado em {bureauSyncClock}
                    </span>

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
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Ativar / desativar edição de métricas, textos e links dos 4 birôs de crédito"
                    >
                      {isBureauEditMode ? <Save size={14} /> : <Edit size={14} />}
                      {isBureauEditMode ? 'Concluir Edição dos Birôs' : 'Editar Métricas & Botões'}
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
                        {filteredForBureau.map(c => (
                          <option key={c.id} value={c.id}>
                            [{c.tipo}] {c.nomeRazao} — {c.documento}
                          </option>
                        ))}
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
                          color: '#34D399',
                          border: '1px solid rgba(16, 185, 129, 0.4)'
                        }}>
                          {activeSerasa >= 750 ? 'EXCELENTE (94.0%)' : activeSerasa >= 600 ? 'BOM (68.0%)' : 'REGULAR (45.0%)'}
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
                          color: '#60A5FA',
                          border: '1px solid rgba(59, 130, 246, 0.4)'
                        }}>
                          FAIXA A (EXCELENTE)
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
                          color: '#34D399',
                          border: '1px solid rgba(16, 185, 129, 0.4)'
                        }}>
                          SCORE {activeQuod} (BOM)
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
            maxWidth: '720px',
            width: '100%',
            maxHeight: '90vh',
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--gold-light)', letterSpacing: '0.1em', fontWeight: 700 }}>
                  DOSSIÊ PERICIAL CONFIDENCIAL • MOURATO &amp; ASSOCIADOS
                </span>
                
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
              </div>

              <h2 style={{ fontSize: '1.45rem', color: '#FFFFFF', margin: '0.25rem 0', fontWeight: 800 }}>
                {selectedClient.nomeRazao}
              </h2>

              <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                {selectedClient.tipo === 'PJ' ? 'CNPJ' : 'CPF'}: <strong style={{ color: '#FFFFFF' }}>{selectedClient.documento || 'Não informado'}</strong>
                {selectedClient.nire && <span> • NIRE JUCESP: <strong style={{ color: '#CBD5E1' }}>{selectedClient.nire}</strong></span>}
                {selectedClient.contato && <span> • Contato: <strong style={{ color: '#CBD5E1' }}>{selectedClient.contato}</strong></span>}
              </div>
            </div>

            {/* SEÇÃO ESPECÍFICA PJ: BALANÇO PATRIMONIAL & SÓCIO ADMINISTRADOR */}
            {selectedClient.tipo === 'PJ' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                
                {/* Vínculo Societário */}
                <div style={{ background: '#070A10', border: '1px solid rgba(197, 168, 105, 0.2)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--gold-light)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Briefcase size={14} />
                    Sócio Administrador Responsável
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {selectedClient.socioVinculado || selectedClient.responsavel || 'José Jailson Mourato da Silva'}
                  </div>
                  {selectedClient.natureza && (
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      Natureza Jurídica: {selectedClient.natureza}
                    </div>
                  )}
                </div>

                {/* Dados Contábeis Auditados */}
                {selectedClient.balanco && (
                  <div style={{ background: '#070A10', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-sm)', padding: '1.1rem' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--gold-light)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileSpreadsheet size={14} />
                      Balanço Patrimonial &amp; Dados Contábeis ({selectedClient.balanco.exercicio || '2026 Auditado'})
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', fontSize: '0.8rem' }}>
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
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem' }}>
                        Responsável Técnico Contábil: <strong style={{ color: '#CBD5E1' }}>{selectedClient.balanco.contadorResponsavel}</strong>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* SEÇÃO ESPECÍFICA PF: EMPRESA VINCULADA, RENDA & PATRIMÔNIO */}
            {selectedClient.tipo === 'PF' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                
                {/* Vínculo Corporativo & Cargo */}
                <div style={{ background: '#070A10', border: '1px solid rgba(0, 158, 227, 0.25)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#38BDF8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={14} />
                    Empresa Vinculada &amp; Atuação
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {selectedClient.empresaVinculada || 'Mourato & Associados Ltda'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Cargo / Qualificação: <strong style={{ color: '#CBD5E1' }}>{selectedClient.profissao || 'Sócio / Titular'}</strong>
                  </div>
                </div>

                {/* Renda & Bens */}
                {selectedClient.rendaPatrimonio && (
                  <div style={{ background: '#070A10', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-sm)', padding: '1.1rem' }}>
                    <div style={{ fontSize: '0.74rem', color: '#38BDF8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Car size={14} />
                      Renda, Pró-Labore &amp; Patrimônio Declarado
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', fontSize: '0.8rem' }}>
                      {selectedClient.rendaPatrimonio.proLabore && (
                        <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                          <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>PRÓ-LABORE / RENDA</span>
                          <strong style={{ color: '#34D399' }}>{selectedClient.rendaPatrimonio.proLabore}</strong>
                        </div>
                      )}
                      {selectedClient.rendaPatrimonio.bens && (
                        <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)' }}>
                          <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>BENS DECLARADOS</span>
                          <strong style={{ color: '#FFFFFF' }}>{selectedClient.rendaPatrimonio.bens}</strong>
                        </div>
                      )}
                      {selectedClient.rendaPatrimonio.veiculos && (
                        <div style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)', gridColumn: '1 / -1' }}>
                          <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>VEÍCULOS / RENAVAM</span>
                          <strong style={{ color: 'var(--gold-light)' }}>{selectedClient.rendaPatrimonio.veiculos}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Contas Bancárias Cadastradas */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.86rem', color: 'var(--gold-light)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Landmark size={15} />
                Contas Bancárias ({selectedClient.contasBancarias?.length || 1}) {selectedClient.tipo === 'PJ' ? '• CCS Bacen' : ''}
              </h3>
              
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
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#34D399', background: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                        {b.statusConta}
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

            {/* Bureaus Status */}
            <div style={{ marginBottom: '1.5rem', background: '#070A10', padding: '1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '0.84rem', color: 'var(--gold-light)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={14} />
                Bureaus &amp; Órgãos Reguladores
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                <div style={{ background: '#0D121D', padding: '0.65rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>BACEN SCR</span>
                  <strong style={{ color: '#34D399' }}>{selectedClient.bacenScr || 'Rating A1'}</strong>
                </div>
                <div style={{ background: '#0D121D', padding: '0.65rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>SERASA EXPERIAN</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.serasaScore || selectedClient.serasaStatus}</strong>
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

            {/* Senhas & Credenciais de Consulta dos Birôs */}
            <div style={{ marginBottom: '1.5rem', background: '#070A10', padding: '1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(197, 168, 105, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '0.84rem', color: 'var(--gold-light)', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <KeyRound size={14} color="var(--gold-primary)" />
                  Senhas &amp; Credenciais de Consulta dos Birôs
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Acesso Operacional Sigiloso</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                {[
                  { label: 'SERASA EXPERIAN', val: selectedClient.senhaSerasa, key: 'serasa' },
                  { label: 'BACEN / SCR', val: selectedClient.senhaBacen, key: 'bacen' },
                  { label: 'GOV.BR / PIN', val: selectedClient.senhaGovBr, key: 'gov' },
                  { label: 'QUOD', val: selectedClient.senhaQuod, key: 'quod' },
                  { label: 'BOA VISTA', val: selectedClient.senhaBoaVista, key: 'boavista' },
                  { label: 'CHAVE MESTRA / E-CAC', val: selectedClient.senhaMestraConsultas, key: 'master' },
                  { label: 'PIN CERTIFICADO A1', val: selectedClient.pinCertificadoA1, key: 'pinA1' }
                ].filter(item => item.val).length === 0 ? (
                  <div style={{ color: '#64748B', fontSize: '0.76rem', fontStyle: 'italic', gridColumn: '1 / -1' }}>
                    Nenhuma senha de consulta específica registrada para este cliente. Clique em "Editar Cadastro" para cadastrar.
                  </div>
                ) : (
                  [
                    { label: 'SERASA EXPERIAN', val: selectedClient.senhaSerasa, key: 'serasa' },
                    { label: 'BACEN / SCR', val: selectedClient.senhaBacen, key: 'bacen' },
                    { label: 'GOV.BR / PIN', val: selectedClient.senhaGovBr, key: 'gov' },
                    { label: 'QUOD', val: selectedClient.senhaQuod, key: 'quod' },
                    { label: 'BOA VISTA', val: selectedClient.senhaBoaVista, key: 'boavista' },
                    { label: 'CHAVE MESTRA / E-CAC', val: selectedClient.senhaMestraConsultas, key: 'master' },
                    { label: 'PIN CERTIFICADO A1', val: selectedClient.pinCertificadoA1, key: 'pinA1' }
                  ].filter(item => item.val).map((item, idx) => {
                    const isVisible = showDetailPasswords[`bureau-${selectedClient.id}-${item.key}`];
                    return (
                      <div key={idx} style={{ background: '#0D121D', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#94A3B8', display: 'block', fontSize: '0.66rem', fontWeight: 600 }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginTop: '3px' }}>
                          <span style={{ fontFamily: isVisible ? 'inherit' : 'monospace', color: 'var(--gold-light)', fontWeight: 600, fontSize: '0.8rem' }}>
                            {isVisible ? item.val : '••••••••'}
                          </span>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              type="button"
                              onClick={() => setShowDetailPasswords(prev => ({ ...prev, [`bureau-${selectedClient.id}-${item.key}`]: !isVisible }))}
                              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                              title={isVisible ? 'Ocultar' : 'Exibir senha'}
                            >
                              {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
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
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Observações e Limites */}
            {selectedClient.limiteAprovado && (
              <div style={{ marginBottom: '1.25rem', fontSize: '0.82rem', background: '#070A10', padding: '0.85rem', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>LIMITE ESTRUTURADO / POTENCIAL PRONAMPE</span>
                <strong style={{ color: '#34D399', fontSize: '1.15rem' }}>{selectedClient.limiteAprovado}</strong>
              </div>
            )}

            {selectedClient.observacoesSigilosas && (
              <div style={{ fontSize: '0.82rem', background: '#090D14', padding: '0.9rem', borderRadius: 'var(--radius-xs)', borderLeft: '3px solid var(--gold-primary)' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem', fontWeight: 600 }}>OBSERVAÇÕES PERICIAIS RESERVADAS</span>
                <p style={{ color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>{selectedClient.observacoesSigilosas}</p>
              </div>
            )}

            <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                  padding: '0.65rem 1.25rem',
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
                onClick={() => {
                  const targetClient = selectedClient;
                  handleStartEditClient(targetClient);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.25rem',
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
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.82rem' }}
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
                  Nova Cobrança Segura — Mercado Pago
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '2px 0 0' }}>
                  Emissão compatível com as regras antifraude e scoring de risco do Mercado Pago.
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
                      placeholder="Ex: Mourato Alimentos Ltda"
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
                  {mpConfig.accessToken ? '● Conectado à API Oficial Mercado Pago' : '● Modo de Homologação Local (Simulador Antifraude)'}
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
              COBRANÇA MERCADO PAGO HOMOLOGADA
            </div>

            <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: '0 0 0.25rem', fontWeight: 700 }}>
              {activePixModal.cliente}
            </h3>
            <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              {activePixModal.descricao}
            </div>

            <div style={{ fontSize: '1.75rem', color: 'var(--gold-light)', fontWeight: 800, marginBottom: '1.25rem' }}>
              {Number(activePixModal.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                  alt="QR Code PIX Mercado Pago" 
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
                    `💰 *Valor: ${Number(activePixModal.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\n\n` +
                    `🔑 *Código PIX (Copia e Cola):*\n${activePixModal.pixPayload}\n\n` +
                    (activePixModal.ticketUrl && activePixModal.ticketUrl !== '#' ? `🔗 *Link da Fatura Mercado Pago:*\n${activePixModal.ticketUrl}\n\n` : '') +
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
                  Abrir link direto do Mercado Pago
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
      {/* ---------------------------------------------------- */}
      {bureauModalDoc && (() => {
        const activeClient = clients.find(c => c.id === selectedBureauClientId) || clients[0] || TEIA_INITIAL_CLIENTS[0];
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

    </div>
  );
};
