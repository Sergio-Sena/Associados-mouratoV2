import { saveClientToOfficialSite, STORAGE_CLIENTS_KEY } from '../src/services/onboardingService.js';

// Mock localStorage no Node para testar o merge
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; }
};

console.log('--- TESTE DE UNIFICAÇÃO (MERGE) DE CLIENTES ---');

// 1. Simula os cards preliminares criados ao aprovar o lead
const initialClients = [
  {
    id: 'cli-pj-1793572800000',
    leadOriginId: 'lead-1793572837909',
    codigoCliente: 'CLI-019',
    tipo: 'PJ',
    nomeRazao: 'ANGELA VITORIA',
    documento: '',
    documentoTipo: 'CNPJ',
    statusConta: 'Novo Cadastro (Ficha Enviada)',
    statusValidacao: 'Validado como PJ',
    email: 'depaulaangela03@gmail.com',
    contato: '97984271060'
  },
  {
    id: 'cli-pf-1793572800001',
    leadOriginId: 'lead-1793572837909',
    codigoCliente: 'CLI-020',
    tipo: 'PF',
    nomeRazao: 'ÂNGELA VITÓRIA',
    documento: '',
    documentoTipo: 'CPF',
    statusConta: 'Novo Cadastro (Ficha Enviada)',
    statusValidacao: 'Validado como PF',
    email: 'depaulaangela03@gmail.com',
    contato: '97984271060'
  }
];

localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(initialClients));

// 2. Submissão real da Ficha Cadastral transmitida
const incomingPayload = {
  id: 'lead-1793572837909',
  leadId: 'lead-1793572837909',
  protocolo: 'MA-1793572837909',
  titular: {
    nome: 'ÂNGELA VITÓRIA DE PAULA MAGALHÃES',
    cpf: '06962449267',
    rg: '12345678',
    orgao_expedidor: 'SSP/SP',
    nascimento: '15/05/1990',
    sexo: 'Feminino',
    estado_civil: 'Solteira',
    nacionalidade: 'Brasileira'
  },
  empresa: {
    razao_social: 'ANGELA VITORIA',
    cnpj: '',
    cargo_socio: 'Sócio-Administrador'
  },
  contato: {
    celular: '97984271060',
    email: 'depaulaangela03@gmail.com'
  },
  endereco: {
    logradouro: 'Rua Principal',
    numero: '100',
    bairro: 'Centro',
    cidade: 'Manaus',
    uf: 'AM',
    cep: '69000-000',
    tipo_imovel: 'Alugado'
  },
  socioeconomico: {
    profissao: 'Sócio-Administrador',
    renda_mensal: 'R$ 15.000,00'
  }
};

const result = saveClientToOfficialSite(incomingPayload, 'MA-1793572837909');
console.log('Resultado retornado pelo salvamento:', result?.nomeRazao);

const savedDb = JSON.parse(localStorage.getItem(STORAGE_CLIENTS_KEY) || '[]');
console.log(`Total de clientes após merge: ${savedDb.length} (esperado: 2, sem duplicatas)`);

savedDb.forEach(c => {
  console.log(`\n* [${c.codigoCliente}] ${c.nomeRazao} (${c.tipo})`);
  console.log(`  Documento: ${c.documento || 'Não informado'}`);
  console.log(`  Status: ${c.statusConta}`);
  console.log(`  Endereço: ${c.endereco}`);
  console.log(`  Protocolo: ${c.protocolo}`);
});

const pfCard = savedDb.find(c => c.tipo === 'PF');
if (pfCard && pfCard.codigoCliente === 'CLI-020' && pfCard.documento.includes('069.624.492-67') && pfCard.statusConta.includes('Ficha Preenchida')) {
  console.log('\n✅ TESTE APROVADO: O card CLI-020 foi preservado e enriquecido com CPF e dados reais!');
} else {
  console.error('\n❌ TESTE FALHOU');
  process.exit(1);
}
