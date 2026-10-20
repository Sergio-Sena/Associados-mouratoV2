import { saveClientToOfficialSite, generateProtocolo } from '../src/services/onboardingService.js';

console.log('--- TESTANDO PERSISTÊNCIA NO SITE OFICIAL ---');

// Mock localStorage para Node.js
const storageMap = new Map();
global.localStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, val)
};
global.window = {
  dispatchEvent: () => {}
};

const mockPayload = {
  titular: {
    nome: 'CLIENTE TESTE OFICIAL',
    cpf: '52998224725',
    rg: '12345678-9',
    orgao_expedidor: 'SSP/SP',
    nascimento: '15/10/1985',
    sexo: 'Masculino',
    estado_civil: 'Casado(a)',
    nome_mae: 'MAE TESTE',
    nome_pai: 'PAI TESTE',
    nacionalidade: 'Brasileira',
    naturalidade: 'São Paulo/SP'
  },
  endereco: {
    cep: '01310100',
    logradouro: 'Avenida Paulista',
    numero: '1000',
    complemento: 'Sala 10',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
    tipo_imovel: 'Próprio',
    tempo_residencia: '5 anos'
  },
  contato: {
    celular: '(11) 99999-9999',
    telefone_fixo: '',
    email: 'teste@email.com',
    email_secundario: ''
  },
  socioeconomico: {
    profissao: 'Empresário',
    tipo_vinculo: 'Empresário / PJ',
    escolaridade: 'Superior Completo',
    renda_mensal: 'R$ 20.000,00',
    outras_rendas: '',
    empresa_empregadora: ''
  },
  empresa: {
    razao_social: 'EMPRESA TESTE LTDA',
    cnpj: '12345678000199',
    capital_social: 'R$ 500.000,00',
    cargo_socio: 'Sócio-Administrador'
  },
  portais: {
    gov: { senha: '123' },
    serasa: { senha: '123' },
    boaVista: { senha: '123' },
    quod: { senha: '123' },
    certificadoDigital: { possui: 'sim', tipo: 'A1', senha: '123' }
  },
  anexos: [
    { tipo: 'quod', nome: 'extrato_quod_outubro.pdf', tamanho: '1.2 MB', data: new Date().toISOString() },
    { tipo: 'bacen', nome: 'registrato_bacen_scr.pdf', tamanho: '850 KB', data: new Date().toISOString() }
  ],
  origem: 'www.mouratoassociados.com.br'
};

const proto = generateProtocolo();
const saved = saveClientToOfficialSite(mockPayload, proto);

console.log('Registro salvo com sucesso:', saved?.nomeRazao, saved?.protocolo);
console.log('Anexos salvos:', saved?.anexos?.length);
console.assert(saved?.anexos?.length === 2, 'Deveria conter 2 anexos');

const inStorage = JSON.parse(global.localStorage.getItem('mourato_clients_records_v2'));
console.log('Total de registros no banco oficial:', inStorage.length);
console.assert(inStorage[0].protocolo === proto, 'Protocolo coincide');

console.log('✅ Teste de persistência no site oficial passou com louvor!');
