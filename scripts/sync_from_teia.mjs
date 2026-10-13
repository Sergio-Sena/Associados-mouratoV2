import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório padrão da Teia de Aranha
const DEFAULT_TEIA_DATA = process.env.TEIA_DATA_PATH || 'C:\\Projetos\\Empreas\\data';
const TARGET_DB_FILE = path.resolve(__dirname, '../src/data/teiaDatabase.js');

console.log('====================================================');
console.log('🕷️  SINCRONIZADOR TEIA DE ARANHA -> MOURATO & ASSOCIADOS');
console.log('====================================================');
console.log(`📁 Origem dos dados: ${DEFAULT_TEIA_DATA}`);
console.log(`🎯 Destino do banco: ${TARGET_DB_FILE}`);

if (!fs.existsSync(DEFAULT_TEIA_DATA)) {
  console.warn(`⚠️ Diretório ${DEFAULT_TEIA_DATA} não foi encontrado.`);
  console.log('Mantendo a base oficial estática intacta em src/data/teiaDatabase.js.');
  process.exit(0);
}

try {
  const fichasFile = path.join(DEFAULT_TEIA_DATA, 'fichas_cadastrais_db.json');
  let fichas = [];
  if (fs.existsSync(fichasFile)) {
    fichas = JSON.parse(fs.readFileSync(fichasFile, 'utf8'));
    console.log(`✅ Fichas cadastrais lidas: ${fichas.length} registros encontrados.`);
  }

  // Verificar bureau scores de Mourato PJ
  const pjScoreFile = path.join(DEFAULT_TEIA_DATA, 'bureau_scores_38377738000145.json');
  let pjScore = {};
  if (fs.existsSync(pjScoreFile)) {
    pjScore = JSON.parse(fs.readFileSync(pjScoreFile, 'utf8'));
    console.log('✅ Dados periciais de MOURATO E ASSOCIADOS LTDA (PJ) carregados.');
  }

  // Lista consolidada de clientes
  const clients = [];

  // 1. Cadastrar PJ Oficial: MOURATO E ASSOCIADOS LTDA
  clients.push({
    id: 'cli-pj-mourato',
    tipo: 'PJ',
    nomeRazao: pjScore.empresa || 'MOURATO E ASSOCIADOS LTDA',
    documento: pjScore.cnpj || '38.377.738/0001-45',
    documentoTipo: 'CNPJ',
    natureza: pjScore.qualificacao || '206-2 - Sociedade Empresária Limitada Unipessoal (ME)',
    nire: pjScore.nire || '35270804594',
    situacao: pjScore.situacao || 'ATIVA',
    dataAbertura: pjScore.dataAbertura || '08/09/2020',
    socioVinculado: pjScore.socioAdministrador?.nome || 'JOSÉ JAILSON MOURATO DA SILVA',
    responsavel: `${pjScore.socioAdministrador?.nome || 'JOSÉ JAILSON MOURATO DA SILVA'} (CPF ${pjScore.socioAdministrador?.cpf || '317.769.598-92'})`,
    contato: '(11) 98765-4321',
    email: 'mourato.importacao@gmail.com',
    endereco: 'Av. São Luís, 187, Sala 69 - República, São Paulo - SP',
    cep: '01046-001',
    balanco: {
      exercicio: pjScore.balancoPatrimonial?.exercicio || '2026 (Auditado)',
      ativo: 'R$ 1.714.304,26',
      patrimonioLiquido: 'R$ 1.563.732,99',
      capitalSocial: 'R$ 1.000.000,00',
      faturamentoAnual: 'R$ 1.409.898,34',
      contadorResponsavel: 'Nilson Oliveira dos Santos (CRC/SP)'
    },
    contasBancarias: [
      {
        id: 1,
        banco: 'Nu Pagamentos',
        bancoOutro: 'Nu Pagamentos - IP (18.236.120)',
        agencia: '0001',
        conta: 'Conta de Pagamento PJ',
        senhaAcesso: 'Acesso App Nu PJ',
        statusConta: 'Aberta e Operando (CCS Bacen Ativo)',
        origemCcs: '18.236.120 - NU PAGAMENTOS - IP'
      },
      {
        id: 2,
        banco: 'Nu Financeira',
        bancoOutro: 'Nu Financeira S.A. CFI (30.680.829)',
        agencia: '0001',
        conta: 'Crédito Corporativo / Financiamentos',
        senhaAcesso: 'Linha FGO / Pronampe',
        statusConta: 'Aberta e Operando (CCS Bacen Ativo)',
        origemCcs: '30.680.829 - NU FINANCEIRA S.A. CFI'
      },
      {
        id: 3,
        banco: 'Itaú',
        bancoOutro: 'Itaú Unibanco S.A. (60.701.190)',
        agencia: 'Histórico',
        conta: 'Histórico Bancário',
        senhaAcesso: '',
        statusConta: 'Encerrada Regularmente',
        origemCcs: '60.701.190 - ITAÚ UNIBANCO S.A.'
      }
    ],
    serasaScore: `${pjScore.serasa?.scoreProjetadoAposSaneamento || 885} (Projetado pós-saneamento)`,
    serasaStatus: 'Sem Apontamentos Negativos',
    boaVistaScore: `${pjScore.boaVista?.score || 875} (Excelente)`,
    boaVistaStatus: 'Faixa A (99.2% Pontualidade)',
    quodScore: `${pjScore.quod?.score || 890}`,
    quodStatus: 'Positivo / Sem Restrição (Risco Mínimo)',
    bacenScr: 'Rating A1 (Prime Rate Corporativo - R$ 0,00 Vencidos/Prejuízos)',
    govNivel: 'Ouro',
    govProtocolo: 'e-CNPJ SyngularID A1 Ativo',
    limiteAprovado: 'R$ 1.450.000,00 (Potencial Pronampe/FGO)',
    observacoesSigilosas: 'Empresa homologada com Rating A1 no Registrato PJ Bacen. Balanço Patrimonial estruturado pelo CRC Nilson Oliveira. Certificados e CND Federal e Previdenciária 100% negativas.',
    dataCadastro: '2026-09-08'
  });

  // 2. Mapear cada Pessoa Física da Teia
  for (const f of fichas) {
    const rawCpf = f.cpf_raw;
    const scorePath = path.join(DEFAULT_TEIA_DATA, `bureau_scores_${rawCpf}.json`);
    let scoreData = null;
    if (fs.existsSync(scorePath)) {
      try { scoreData = JSON.parse(fs.readFileSync(scorePath, 'utf8')); } catch (e) {}
    }

    // Determinar vinculo de empresa se houver
    let empresaVinculada = '';
    if (f.empresas_vinculadas && f.empresas_vinculadas.length > 0) {
      empresaVinculada = f.empresas_vinculadas.map(ev => `${ev.razao_social} (CNPJ ${ev.cnpj_formatado})`).join(' | ');
    } else if (f.id_alias === 'mourato') {
      empresaVinculada = 'MOURATO E ASSOCIADOS LTDA (CNPJ 38.377.738/0001-45)';
    } else if (f.id_alias === 'nilson') {
      empresaVinculada = 'Y7 Service Ltda / Perícias Contábeis Mourato';
    } else if (f.id_alias === 'erivaldo') {
      empresaVinculada = 'COMERCIAL NESPE CONSTRUTORA';
    } else if (f.id_alias === 'sergio') {
      empresaVinculada = 'SS TECHNOLOGIES LTDA (CNPJ 43.146.007/0001-29)';
    }

    // Veiculos formatados
    let veiculosStr = '';
    if (f.veiculos && f.veiculos.length > 0) {
      veiculosStr = f.veiculos.map(v => `${v.marca_modelo} Placa ${v.placa} Renavam ${v.renavam}`).join('; ');
    } else if (f.id_alias === 'mourato') {
      veiculosStr = 'Yamaha/YBR 125K Placa DUZ0988 Renavam 00909604606 (Em Desvinculação IPVA/Súmula 585 STJ)';
    }

    // Certificado
    let certStr = '';
    if (f.certificados && f.certificados.length > 0) {
      certStr = f.certificados.map(c => `${c.tipo} ${c.emissor} (Validade: ${c.validade})`).join('; ');
    }

    // Contas bancarias
    const contas = [];
    if (f.id_alias === 'mourato') {
      contas.push(
        { id: 1, banco: 'Nubank', bancoOutro: 'Nu Pagamentos', agencia: '0001', conta: 'Conta PF', senhaAcesso: 'Segura / Biometria', statusConta: 'Aberta e Operando' },
        { id: 2, banco: 'Banco do Brasil', bancoOutro: '', agencia: 'Agência Central', conta: 'Conta Corrente', senhaAcesso: '', statusConta: 'Aberta e Operando' }
      );
    } else if (f.id_alias === 'nilson') {
      contas.push(
        { id: 1, banco: 'Itaú', bancoOutro: '', agencia: '0289', conta: 'Conta Profissional CRC', senhaAcesso: 'Nos281590@', statusConta: 'Aberta e Operando' },
        { id: 2, banco: 'Bradesco', bancoOutro: '', agencia: 'Agência Santana', conta: 'Conta Corrente', senhaAcesso: '', statusConta: 'Aberta e Operando' }
      );
    } else if (f.id_alias === 'erivaldo') {
      contas.push({ id: 1, banco: 'Santander', bancoOutro: '', agencia: '3410', conta: 'Conta PJ/PF Select', senhaAcesso: '', statusConta: 'Aberta e Operando' });
    } else if (f.id_alias === 'sergio') {
      contas.push({ id: 1, banco: 'Nubank', bancoOutro: 'Nu Pagamentos PJ', agencia: '0001', conta: 'Conta Jurídica / PF', senhaAcesso: 'Biometria', statusConta: 'Aberta e Operando' });
    } else {
      contas.push({ id: 1, banco: 'Itaú', bancoOutro: '', agencia: '0001', conta: 'Conta Corrente', senhaAcesso: '', statusConta: 'Aberta e Operando' });
    }

    clients.push({
      id: `cli-pf-${f.id_alias}`,
      tipo: 'PF',
      nomeRazao: f.nome_completo,
      documento: f.cpf_formatado,
      documentoTipo: 'CPF',
      profissao: f.profissao || 'Profissional / Sócio',
      empresaVinculada: empresaVinculada || 'Vínculo Estratégico Mourato & Associados',
      responsavel: 'Titular',
      contato: f.telefone_principal || '(11) 98765-4321',
      email: f.email_principal || '',
      endereco: f.endereco_principal || 'São Paulo - SP',
      cep: f.cep || '01000-000',
      rendaPatrimonio: {
        proLabore: f.id_alias === 'mourato' ? 'R$ 25.000,00' : f.id_alias === 'sergio' ? 'R$ 28.000,00' : f.id_alias === 'erivaldo' ? 'R$ 22.000,00' : 'R$ 15.000,00',
        bens: f.id_alias === 'nilson' ? 'Imóvel Residencial Próprio R$ 550.000,00' : 'Ativos e quotas de capital',
        veiculos: veiculosStr
      },
      contasBancarias: contas,
      serasaScore: scoreData?.serasa ? `${scoreData.serasa}` : (f.id_alias === 'sergio' ? '802' : 'Regular'),
      serasaStatus: f.id_alias === 'nilson' ? 'Apontamento Negociado (Prescritos em Purga)' : 'Sem Apontamentos',
      boaVistaScore: scoreData?.boavista ? `${scoreData.boavista}` : (f.id_alias === 'sergio' ? '717' : 'Regular'),
      boaVistaStatus: 'Sem Restrições',
      quodScore: scoreData?.quod ? `${scoreData.quod}` : 'Positivo',
      quodStatus: 'Positivo / Sem Restrição',
      bacenScr: scoreData?.rating || (f.id_alias === 'sergio' ? 'Rating A1' : 'Rating A'),
      govNivel: certStr ? 'Ouro' : 'Prata',
      govProtocolo: certStr || 'Validação Gov.br Ativa',
      limiteAprovado: f.id_alias === 'mourato' ? 'R$ 1.450.000,00' : f.id_alias === 'sergio' ? 'R$ 950.000,00' : 'R$ 350.000,00',
      observacoesSigilosas: f.observacoes || 'Cadastro pericial integrado com sucesso.',
      dataCadastro: f.created_at ? f.created_at.split(' ')[0].split('/').reverse().join('-') : '2026-09-01'
    });
  }

  // Gerar o código exportado
  const fileContent = `/**
 * Base Oficial da Teia de Aranha - Mourato & Associados
 * Gerado automaticamente por scripts/sync_from_teia.mjs em ${new Date().toISOString()}
 * Origem: ${DEFAULT_TEIA_DATA}
 */

export const TEIA_INITIAL_CLIENTS = ${JSON.stringify(clients, null, 2)};

export default TEIA_INITIAL_CLIENTS;
`;

  fs.writeFileSync(TARGET_DB_FILE, fileContent, 'utf8');
  console.log(`🎉 SUCESSO! ${clients.length} clientes consolidados gravados em:`);
  console.log(`   ${TARGET_DB_FILE}`);
  console.log(`   - Empresas (PJ): ${clients.filter(c => c.tipo === 'PJ').length}`);
  console.log(`   - Sócios/Pessoas Físicas (PF): ${clients.filter(c => c.tipo === 'PF').length}`);

} catch (err) {
  console.error('❌ Erro durante a sincronização:', err);
  process.exit(1);
}
