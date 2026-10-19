/**
 * Mourato & Associados - Serviço de Onboarding e Validações Periciais
 * Integração com Sistema Teia de Aranha (POST /api/clients/onboarding)
 */

const getEnvTeiaUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TEIA_API_URL) {
      return import.meta.env.VITE_TEIA_API_URL;
    }
  } catch {
    // fallback
  }
  return 'http://localhost:3000';
};

export const TEIA_BASE_URL = getEnvTeiaUrl();
export const TEIA_ONBOARDING_ENDPOINT = `${TEIA_BASE_URL}/api/clients/onboarding`;
export const TEIA_IFRAME_URL = `${TEIA_BASE_URL}/ficha-cadastral`;

/**
 * Validação de CPF pelo algoritmo oficial da Receita Federal (Módulo 11)
 * Bloqueia sequências de números repetidos (111.111.111-11, etc.)
 */
export function validateCPF(rawCpf) {
  if (!rawCpf) return false;
  const cpf = String(rawCpf).replace(/\D/g, '');
  if (cpf.length !== 11) return false;

  // Bloqueio de repetidos
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // 1º Dígito Verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  let d1 = (rev >= 10) ? 0 : rev;
  if (d1 !== parseInt(cpf.charAt(9), 10)) return false;

  // 2º Dígito Verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  let d2 = (rev >= 10) ? 0 : rev;
  if (d2 !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação de E-mail RFC standard
 */
export function validateEmail(email) {
  if (!email) return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(String(email).trim());
}

/**
 * Validação de Data de Nascimento e trava de maioridade (18+ anos)
 * Espera formato DD/MM/AAAA ou YYYY-MM-DD
 */
export function validateBirthdate(dateStr) {
  if (!dateStr) return { valid: false, error: 'Data de nascimento é obrigatória.' };

  let day, month, year;
  const trimmed = dateStr.trim();

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length !== 3) return { valid: false, error: 'Formato inválido. Use DD/MM/AAAA.' };
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length !== 3) return { valid: false, error: 'Formato inválido.' };
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    return { valid: false, error: 'Use o formato DD/MM/AAAA.' };
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return { valid: false, error: 'Data de nascimento inválida.' };
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) {
    return { valid: false, error: 'Data fora do calendário válido.' };
  }

  const birthDate = new Date(year, month - 1, day);
  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== (month - 1) || birthDate.getDate() !== day) {
    return { valid: false, error: 'Dia inválido para o mês informado.' };
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 18) {
    return { valid: false, error: `Titular menor de idade (${age} anos). Exige-se maioridade (mínimo 18 anos).`, age };
  }

  if (age > 120) {
    return { valid: false, error: 'Data de nascimento inconsistente (mais de 120 anos).' };
  }

  return { valid: true, age };
}

/**
 * Validação de Celular com DDD (2 dígitos) + 9 dígitos (começando com 9)
 */
export function validatePhone(phoneStr) {
  if (!phoneStr) return false;
  const digits = String(phoneStr).replace(/\D/g, '');
  if (digits.length !== 11) return false;

  const ddd = parseInt(digits.substring(0, 2), 10);
  // DDDs válidos no Brasil (11 a 99)
  if (ddd < 11 || ddd > 99) return false;

  // 9º dígito obrigatório
  if (digits.charAt(2) !== '9') return false;

  return true;
}

/**
 * Consulta CEP em tempo real via ViaCEP
 */
export async function fetchAddressByCep(cepRaw) {
  const clean = String(cepRaw || '').replace(/\D/g, '');
  if (clean.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos.');
  }

  const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!response.ok) {
    throw new Error('Falha ao consultar serviço de CEP.');
  }

  const data = await response.json();
  if (data.erro) {
    throw new Error('CEP não localizado na base dos Correios.');
  }

  return {
    cep: `${clean.slice(0, 5)}-${clean.slice(5)}`,
    logradouro: data.logradouro || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    uf: data.uf || ''
  };
}

/**
 * Gerador de Protocolo Oficial no padrão: MA-AAAAMMDD-XXXX
 */
export function generateProtocolo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MA-${year}${month}${day}-${rand}`;
}

/**
 * Máscaras para campos de entrada
 */
export function maskCPF(value) {
  const v = value.replace(/\D/g, '').slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value) {
  const v = value.replace(/\D/g, '').slice(0, 14);
  return v
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskCEP(value) {
  const v = value.replace(/\D/g, '').slice(0, 8);
  return v.replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskPhone(value) {
  const v = value.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 10) {
    return v
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return v
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskDate(value) {
  const v = value.replace(/\D/g, '').slice(0, 8);
  return v
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2');
}

export function maskCurrency(value) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Transmissão oficial para a API da Esteira Teia de Aranha
 */
export async function submitOnboardingNative(payload) {
  const res = await fetch(TEIA_ONBOARDING_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const contentType = res.headers.get('content-type') || '';
  let data = {};
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { rawText: await res.text() };
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Erro de conexão com o servidor pericial (${res.status})`);
  }

  return data;
}

export const STORAGE_CLIENTS_KEY = 'mourato_clients_records_v2';

/**
 * Lê arquivo e converte para Data URL (Base64)
 */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Salva o cliente e anexos diretamente no banco do site oficial (localStorage)
 * para exibição em tempo real no painel de administração (ClientManagementModal)
 */
export function saveClientToOfficialSite(payload, protocolo) {
  try {
    const rawSaved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_CLIENTS_KEY) : null;
    let existing = [];
    if (rawSaved) {
      existing = JSON.parse(rawSaved);
      if (!Array.isArray(existing)) existing = [];
    }

    const isPj = Boolean(payload.empresa && payload.empresa.razao_social && payload.empresa.cnpj);
    const docClean = isPj ? (payload.empresa.cnpj || '') : (payload.titular?.cpf || '');
    const docFormatted = isPj 
      ? maskCNPJ(payload.empresa.cnpj) 
      : maskCPF(payload.titular?.cpf || '');

    const newRecord = {
      id: `cli-lead-${Date.now()}`,
      tipo: isPj ? 'PJ' : 'PF',
      nomeRazao: isPj ? payload.empresa.razao_social : (payload.titular?.nome || 'Cliente'),
      documento: docFormatted,
      documentoTipo: isPj ? 'CNPJ' : 'CPF',
      natureza: isPj ? 'Sociedade Empresária (Onboarding Digital)' : 'Pessoa Física (Auditoria de Rating & SCR)',
      situacao: 'EM AUDITORIA PERICIAL',
      dataAbertura: new Date().toLocaleDateString('pt-BR'),
      dataCadastro: new Date().toISOString(),
      socioVinculado: payload.titular?.nome || '',
      responsavel: `${payload.titular?.nome || ''} (CPF ${maskCPF(payload.titular?.cpf || '')})`,
      contato: payload.contato?.celular || '',
      telefoneFixo: payload.contato?.telefone_fixo || '',
      email: payload.contato?.email || '',
      emailSecundario: payload.contato?.email_secundario || '',
      endereco: `${payload.endereco?.logradouro || ''}, ${payload.endereco?.numero || ''} ${payload.endereco?.complemento || ''} - ${payload.endereco?.bairro || ''}, ${payload.endereco?.cidade || ''}/${payload.endereco?.uf || ''}`,
      cep: maskCEP(payload.endereco?.cep || ''),
      tipoImovel: payload.endereco?.tipo_imovel || '',
      tempoResidencia: payload.endereco?.tempo_residencia || '',
      protocolo: protocolo || payload.protocolo,
      socioeconomico: {
        profissao: payload.socioeconomico?.profissao || '',
        tipoVinculo: payload.socioeconomico?.tipo_vinculo || '',
        escolaridade: payload.socioeconomico?.escolaridade || '',
        rendaMensal: payload.socioeconomico?.renda_mensal || '',
        outrasRendas: payload.socioeconomico?.outras_rendas || '',
        empresaEmpregadora: payload.socioeconomico?.empresa_empregadora || ''
      },
      empresa: isPj ? {
        razaoSocial: payload.empresa.razao_social,
        cnpj: maskCNPJ(payload.empresa.cnpj),
        capitalSocial: payload.empresa.capital_social,
        cargoSocio: payload.empresa.cargo_socio
      } : null,
      portais: payload.portais || {},
      anexos: payload.anexos || [], // PDFs do Quod, Bacen, etc.
      origem: payload.origem || 'www.mouratoassociados.com.br',
      autorizacaoLGPD: true
    };

    // Remove eventual duplicata anterior pelo mesmo documento limpo
    const filtered = existing.filter(c => (c.documento || '').replace(/\D/g, '') !== docClean.replace(/\D/g, ''));
    const updated = [newRecord, ...filtered];

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updated));
      localStorage.setItem('mourato_active_bureau_client_id', newRecord.id);

      // Inicializa estrutura no Birô de Crédito para pesquisa e alimentação imediata do colaborador
      try {
        const rawScores = localStorage.getItem('mourato_bureau_scores_real_v1');
        const scoresMap = rawScores ? JSON.parse(rawScores) : {};
        if (!scoresMap[newRecord.id]) {
          scoresMap[newRecord.id] = {
            serasa: 0,
            serasaDividas: '0 (Nada Consta)',
            serasaConsultas: '0 consultas',
            boavista: 0,
            boavistaFaturas: '0 (CENPROT)',
            boavistaProtestos: '0 apontamentos',
            quod: 0,
            quodPositivo: 'Cadastro Positivo Ativo',
            quodHistorico: 'Zero Atrasos',
            bacen: 'Rating A1',
            bacenVencidos: 'R$ 0,00',
            bacenPrejuizos: 'R$ 0,00 (Zero Prejuízo)'
          };
          localStorage.setItem('mourato_bureau_scores_real_v1', JSON.stringify(scoresMap));
        }
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mourato_client_saved', { detail: newRecord }));
    }

    return newRecord;
  } catch (err) {
    console.error('Erro ao salvar cliente no banco do site oficial:', err);
    return null;
  }
}
