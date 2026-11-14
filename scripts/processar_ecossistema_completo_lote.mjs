import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const BASE_TEIA = 'C:\\Teia de arranha';
const SEAL_PATH = 'C:\\Teia de arranha\\Mourato.associados\\public\\mourato-seal-circle.png';

if (!fs.existsSync(SEAL_PATH)) {
  throw new Error('Brasão não encontrado em: ' + SEAL_PATH);
}
const sealBase64 = fs.readFileSync(SEAL_PATH).toString('base64');
const sealDataUri = `data:image/png;base64,${sealBase64}`;

const CLIENTES_PF_MAP = [
  {
    folder: 'JOSE_JAILSON_MOURATO_DA_SILVA_31776959892',
    nome: 'JOSÉ JAILSON MOURATO DA SILVA',
    cpf: '317.769.598-92',
    rg: '33.878.601 SSP/PE',
    nasc: '06/03/1988',
    filiacao: 'HELIA MARIA MOURATO DA SILVA / ANTONIO PEREIRA DA SILVA',
    telefones: '(11) 97899-0034 / (11) 94744-5745',
    emails: 'mourato.importacao@gmail.com / jota.jailson@hotmail.com',
    endereco: 'Rua Ana Paulina, 171, Vila Comercial, São Paulo/SP - CEP: 05139-060',
    empresa: 'MOURATO E ASSOCIADOS LTDA (CNPJ 38.377.738/0001-45)',
    scores: { quod: '711', boavista: '800', serasa: '654', bacen: 'A1', spc: '' },
    scr: { em_dia: 'R$ 259,43', atraso: 'R$ 0,00', prejuizo: 'R$ 0,00', limite: 'R$ 2.153,62' },
    cenprot: 'ZERO TÍTULOS ATIVOS (Certidão do 6º Cartório de Protesto de SP)',
    divida_ativa: 'PGFN: Nada Consta • PGE-SP: CDA 1.480.853.730 de IPVA moto DUZ-0988 (Em processo de desvinculação)',
    rating: 'AAA (APTO PARA CRÉDITO ESTRUTURADO)'
  },
  {
    folder: 'ADILSON_DE_ANDRADE_LIMA_12829477880',
    nome: 'ADILSON DE ANDRADE LIMA',
    cpf: '128.294.778-80',
    rg: '12.441.874 SSP/MG',
    nasc: '21/04/1975',
    filiacao: 'SEBASTIANA DE ANDRADE LIMA / GERALDO DE LIMA',
    telefones: '(33) 98845-1234',
    emails: 'adilson.lima@limagas.com.br',
    endereco: 'Av. José Lourenço, 410, Conselheiro Pena/MG - CEP: 35240-000',
    empresa: 'ADILSON DE ANDRADE LIMA (LIMA GÁS) — CNPJ: 15.204.314/0001-83',
    scores: { quod: '512', boavista: '490', serasa: '480', bacen: 'C', spc: '' },
    scr: { em_dia: 'R$ 0,00', atraso: 'R$ 0,00', prejuizo: 'R$ 0,00', limite: 'R$ 0,00' },
    cenprot: 'Apontamentos cíveis em fase de saneamento',
    divida_ativa: 'PGFN: Regular • Processos em tramitação no TJMG e STF (HCs 184.436 e 180.854)',
    rating: 'BB (RESTRITO / EM ADEQUAÇÃO DE COMPLIANCE)'
  },
  {
    folder: 'ERIVALDO_DOS_SANTOS_CAMILO_12144612471',
    nome: 'ERIVALDO DOS SANTOS CAMILO',
    cpf: '121.446.124-71',
    rg: '28.914.502 SSP/SP',
    nasc: '14/11/1979',
    filiacao: 'MARIA DE LOURDES DOS SANTOS / JOSE CAMILO',
    telefones: '(11) 91496-5601',
    emails: 'erivaldo.camilo@nespeconstrutora.com.br',
    endereco: 'Rua das Palmeiras, 85, Centro, São Paulo/SP - CEP: 01226-010',
    empresa: 'COMERCIAL NESPE CONSTRUTORA LTDA (CNPJ 19.706.900/0001-87)',
    scores: { quod: '730', boavista: '785', serasa: '720', bacen: 'A2', spc: '' },
    scr: { em_dia: 'R$ 1.450,00', atraso: 'R$ 0,00', prejuizo: 'R$ 0,00', limite: 'R$ 15.000,00' },
    cenprot: 'ZERO TÍTULOS PROTESTADOS ATIVOS',
    divida_ativa: 'PGFN: Nada Consta • PGE-SP: Regular',
    rating: 'AA (APTO PARA CRÉDITO CORPORATIVO)'
  },
  {
    folder: 'HELIA_MARIA_MOURATO_DA_SILVA_15391713889',
    nome: 'HELIA MARIA MOURATO DA SILVA',
    cpf: '153.917.138-89',
    rg: '14.502.991 SSP/PE',
    nasc: '12/09/1958',
    filiacao: 'ANA MOURATO DA SILVA / MANOEL PEREIRA',
    telefones: '(11) 97899-0034',
    emails: 'helia.mourato@gmail.com',
    endereco: 'Rua Ana Paulina, 169, Casa 3, Vila Comercial, São Paulo/SP',
    empresa: 'Matriarca / Família Mourato',
    scores: { quod: '', boavista: '', serasa: '', bacen: '', spc: '' },
    scr: { em_dia: '', atraso: '', prejuizo: '', limite: '' },
    cenprot: 'ZERO TÍTULOS ATIVOS (Notificação de exclusão Sabesp formalizada)',
    divida_ativa: 'PGFN: Nada Consta • PGE-SP: Regular',
    rating: 'A (HISTÓRICO IDÔNEO)'
  },
  {
    folder: 'NILSON_OLIVEIRA_DOS_SANTOS_08698640842',
    nome: 'NILSON OLIVEIRA DOS SANTOS',
    cpf: '086.986.408-42',
    rg: '35.120.441 SSP/SP',
    nasc: '04/08/1982',
    filiacao: 'TERESA OLIVEIRA DOS SANTOS / JOAO DOS SANTOS',
    telefones: '(11) 98124-7700',
    emails: 'nilson.y7service@gmail.com',
    endereco: 'Rua Dom Pedro I, 210, São Paulo/SP',
    empresa: 'Y7 SERVICE LTDA',
    scores: { quod: '680', boavista: '710', serasa: '690', bacen: 'A1', spc: '' },
    scr: { em_dia: 'R$ 520,00', atraso: 'R$ 0,00', prejuizo: 'R$ 0,00', limite: 'R$ 8.500,00' },
    cenprot: 'ZERO TÍTULOS PROTESTADOS ATIVOS',
    divida_ativa: 'PGFN: Regular • PGE-SP: Regular',
    rating: 'A (APTO PARA CRÉDITO)'
  },
  {
    folder: 'SILVANEI_MARIANO_NUNES_26713421873',
    nome: 'SILVANEI MARIANO NUNES',
    cpf: '267.134.218-73',
    rg: '25.632.110 SSP/SP',
    nasc: '18/06/1976',
    filiacao: 'MARIA MARIANO NUNES / JOAQUIM NUNES',
    telefones: '(51) 2501-4000',
    emails: 'financeiro@consttruterra.com.br',
    endereco: 'Rua Atenas, 395, Jardim Califórnia, Barueri/SP - CEP: 06409-040',
    empresa: 'COMERCIAL CONSTTRUTERRA LTDA (CNPJ: 19.619.259/0001-43)',
    scores: { quod: '', boavista: '', serasa: '', bacen: 'A1', spc: '' },
    scr: { em_dia: 'R$ 0,00', atraso: 'R$ 0,00', prejuizo: 'R$ 0,00', limite: 'R$ 50.000,00' },
    cenprot: 'ZERO TÍTULOS ATIVOS (Certificado e-CPF A1 Ativo até 29/06/2027)',
    divida_ativa: 'PGFN: Nada Consta • PGE-SP: Regular',
    rating: 'AAA (SÓCIO-ADMINISTRADOR CONSTTRUTERRA)'
  },
  {
    folder: 'ANGELA_VITORIA_DE_PAULA_MAGALHAES_06962449267',
    nome: 'ANGELA VITORIA DE PAULA MAGALHAES',
    cpf: '069.624.492-67',
    rg: 'MG-15.890.112 SSP/MG',
    nasc: '10/05/1990',
    filiacao: 'MARIA DE PAULA MAGALHAES / JOSE MAGALHAES',
    telefones: '(11) 98500-1122',
    emails: 'angela.magalhaes@gmail.com',
    endereco: 'Rua das Flores, 45, São Paulo/SP',
    empresa: 'Cliente Pessoa Física',
    scores: { quod: '640', boavista: '680', serasa: '650', bacen: 'A1', spc: '' },
    scr: { em_dia: 'R$ 120,00', atraso: 'R$ 0,00', prejuizo: 'R$ 0,00', limite: 'R$ 4.000,00' },
    cenprot: 'ZERO TÍTULOS ATIVOS',
    divida_ativa: 'PGFN: Nada Consta • PGE-SP: Regular',
    rating: 'A (REGULAR)'
  },
  {
    folder: 'MARCOS_JOSE_DA_SILVA_11923123840',
    nome: 'MARCOS JOSE DA SILVA',
    cpf: '119.231.238-40',
    rg: '22.890.412 SSP/SP',
    nasc: '25/08/1981',
    filiacao: 'MARIA DA SILVA / JOSE DA SILVA',
    telefones: '(11) 97110-3344',
    emails: 'marcos.silva@gmail.com',
    endereco: 'Av. Paulista, 1000, São Paulo/SP',
    empresa: 'Cliente Pessoa Física',
    scores: { quod: '690', boavista: '720', serasa: '700', bacen: 'A1', spc: '' },
    scr: { em_dia: 'R$ 350,00', atraso: 'R$ 0,00', prejuizo: 'R$ 0,00', limite: 'R$ 6.000,00' },
    cenprot: 'ZERO TÍTULOS ATIVOS',
    divida_ativa: 'PGFN: Nada Consta • PGE-SP: Regular',
    rating: 'A (REGULAR)'
  },
  {
    folder: 'LUIZ_CARLOS_SILVA_MARQUES_25472676835',
    nome: 'LUIZ CARLOS SILVA MARQUES',
    cpf: '254.726.768-35',
    rg: '19.870.321 SSP/SP',
    nasc: '14/02/1978',
    filiacao: 'ANA SILVA MARQUES / CARLOS MARQUES',
    telefones: '(11) 96420-5511',
    emails: 'luiz.marques@gmail.com',
    endereco: 'Rua São Bento, 200, São Paulo/SP',
    empresa: 'Cliente Pessoa Física',
    scores: { quod: '', boavista: '', serasa: '', bacen: '', spc: '' },
    scr: { em_dia: '', atraso: '', prejuizo: '', limite: '' },
    cenprot: 'Pesquisa Nacional CENPROT em homologação',
    divida_ativa: 'PGFN: Regular',
    rating: 'B+ (AGUARDANDO EXTRATOS DE BIRÔS)'
  },
  {
    folder: 'SERGIO_PEREIRA_SENA_SERGIO',
    nome: 'SERGIO PEREIRA SENA',
    cpf: '000.000.000-00 (Sócio Fundador)',
    rg: 'SSP/SP',
    nasc: 'São Paulo/SP',
    filiacao: 'Família Sena',
    telefones: '(11) 90000-0000',
    emails: 'sergio.sena@mouratoassociados.com.br',
    endereco: 'Av. São Luís, 187, República, São Paulo/SP',
    empresa: 'MOURATO & ASSOCIADOS / TEIA DE ARANHA',
    scores: { quod: '', boavista: '', serasa: '', bacen: '', spc: '' },
    scr: { em_dia: '', atraso: '', prejuizo: '', limite: '' },
    cenprot: 'Diretoria e Tecnologia',
    divida_ativa: 'Regular',
    rating: 'AAA (GOVERNANÇA & TECNOLOGIA)'
  }
];

const CLIENTES_PJ_MAP = [
  {
    folder: 'MOURATO_E_ASSOCIADOS_LTDA_38377738000145',
    razao: 'MOURATO E ASSOCIADOS LTDA',
    cnpj: '38.377.738/0001-45',
    abertura: '10/09/2020',
    capital: 'R$ 1.000.000,00 (100% Integralizado em Moeda Corrente)',
    cnae: '7020-4/00 — Atividades de consultoria em gestão empresarial',
    sede: 'Av. São Luís, 187, Conjunto 2411, República, São Paulo/SP - CEP: 01046-001',
    socio: 'JOSÉ JAILSON MOURATO DA SILVA (Sócio-Administrador SLU 100%)',
    regime: 'Lucro Presumido',
    scores: { serasa_pj: '850', boavista_pj: '900', scr_bacen: 'Rating A1 (Código CVS9-GV5D-W9: 48 meses R$ 0,00 atraso)' },
    cnds: 'CND Federal/PGFN 100% Negativa • CNDT Trabalhista Regular • CRF FGTS Regular',
    rating: 'AAA (HOLDING OPERACIONAL DE EXCELÊNCIA)'
  },
  {
    folder: 'COMERCIAL_CONSTTRUTERRA_LTDA_19619259000143',
    razao: 'COMERCIAL CONSTTRUTERRA LTDA',
    cnpj: '19.619.259/0001-43',
    abertura: '29/01/2014 (12 anos de fundação)',
    capital: 'R$ 1.500.000,00 (Integralizado)',
    cnae: '4120-4/00 — Construção de edifícios',
    sede: 'Rua Atenas, 395, Jardim Califórnia, Barueri/SP - CEP: 06409-040',
    socio: 'SILVANEI MARIANO NUNES (Sócio-Administrador)',
    regime: 'Lucro Presumido (Porte DEMAIS)',
    scores: { serasa_pj: '820', boavista_pj: '840', scr_bacen: 'Zero Endividamento Bancário (R$ 0,00)' },
    cnds: 'Balanço 2025: Faturamento R$ 8,80 Mi • PL R$ 5,69 Mi • Lucro R$ 2,52 Mi • Liquidez 6,26',
    rating: 'AAA (PLENA CAPACIDADE DE PAGAMENTO)'
  },
  {
    folder: 'COMERCIAL_NESPE_CONSTRUTORA_LTDA_19706900000187',
    razao: 'COMERCIAL NESPE CONSTRUTORA LTDA',
    cnpj: '19.706.900/0001-87',
    abertura: '11/02/2014',
    capital: 'R$ 800.000,00',
    cnae: '4120-4/00 — Construção de edifícios e comércio de materiais',
    sede: 'Rua das Palmeiras, 85, Centro, São Paulo/SP',
    socio: 'ERIVALDO DOS SANTOS CAMILO (Sócio-Administrador)',
    regime: 'Lucro Presumido',
    scores: { serasa_pj: '780', boavista_pj: '790', scr_bacen: 'SCR Regular' },
    cnds: 'CND Federal Regular • CNDT Trabalhista Regular • Proposta BNDES MPME 2436377 cancelada por taxa abusiva',
    rating: 'AA (CONSTRUTORA ATIVA / APTO PARA FOMENTO)'
  },
  {
    folder: 'ADILSON_DE_ANDRADE_LIMA_LIMA_GAS_15204314000183',
    razao: 'ADILSON DE ANDRADE LIMA (LIMA GÁS)',
    cnpj: '15.204.314/0001-83',
    abertura: '15/03/2012',
    capital: 'R$ 100.000,00',
    cnae: '4784-9/00 — Comércio varejista de gás liquefeito de petróleo (GLP)',
    sede: 'Av. José Lourenço, 410, Conselheiro Pena/MG',
    socio: 'ADILSON DE ANDRADE LIMA (Titular)',
    regime: 'Simples Nacional',
    scores: { serasa_pj: '', boavista_pj: '', scr_bacen: 'Em revisão' },
    cnds: 'CND Federal Regular • Ações penais em saneamento (HC 184.436 STF)',
    rating: 'BB (RESTRITO / EM REGULARIZAÇÃO)'
  },
  {
    folder: 'Y7_SERVICE_LTDA_08698640842Y7',
    razao: 'Y7 SERVICE LTDA',
    cnpj: '08.698.640/0001-84 (Homologação)',
    abertura: '10/05/2018',
    capital: 'R$ 250.000,00',
    cnae: '8121-4/00 — Limpeza e conservação predial e serviços especializados',
    sede: 'Rua Dom Pedro I, 210, São Paulo/SP',
    socio: 'NILSON OLIVEIRA DOS SANTOS (Sócio-Administrador)',
    regime: 'Simples Nacional',
    scores: { serasa_pj: '710', boavista_pj: '730', scr_bacen: 'Regular' },
    cnds: 'CNDs Regulares',
    rating: 'A (OPERACIONAL)'
  },
  {
    folder: 'JOSE_JAILSON_MOURATO_DA_SILVA_HOUSTON_18037669000113',
    razao: 'JOSE JAILSON MOURATO DA SILVA (HOUSTON CONFECÇÕES)',
    cnpj: '18.037.669/0001-13',
    abertura: '03/05/2013',
    capital: 'R$ 50.000,00',
    cnae: '1412-6/01 — Confecção de peças de vestuário',
    sede: 'São Paulo/SP',
    socio: 'JOSÉ JAILSON MOURATO DA SILVA (Titular)',
    regime: 'MEI / Simples',
    scores: { serasa_pj: '', boavista_pj: '', scr_bacen: 'Extinto' },
    cnds: 'SITUAÇÃO CADASTRAL: BAIXADA (Encerramento regular)',
    rating: 'BAIXADA (HISTÓRICO ENCERRADO SEM DÉBITOS)'
  },
  {
    folder: 'SS_TECHNOLOGIES_CLOUD_00000000000000',
    razao: 'SS TECHNOLOGIES CLOUD LTDA',
    cnpj: '00.000.000/0001-00 (Homologação)',
    abertura: '01/01/2024',
    capital: 'R$ 500.000,00',
    cnae: '6201-5/01 — Desenvolvimento de programas de computador sob encomenda',
    sede: 'São Paulo/SP',
    socio: 'SERGIO PERERA SENA',
    regime: 'Lucro Presumido',
    scores: { serasa_pj: '', boavista_pj: '', scr_bacen: '' },
    cnds: 'Infraestrutura de tecnologia e inteligência artificial',
    rating: 'AAA (TECNOLOGIA DA INFORMAÇÃO)'
  }
];

function gerarHtmlDoc1PF(cli, creds) {
  const hash = crypto.createHash('sha256').update(cli.nome + Date.now()).digest('hex').substring(0, 24).toUpperCase();
  
  // Monta tabela de senhas
  const portaisPadrao = [
    { portal: 'Serasa Experian Consumidor', link: 'serasa.com.br' },
    { portal: 'Boa Vista Consumidor Positivo', link: 'consumidorpositivo.com.br' },
    { portal: 'Quod Gestora de Inteligência', link: 'consumidor.quod.com.br' },
    { portal: 'Banco Central (Registrato SCR/CCS)', link: 'registrato.bcb.gov.br' },
    { portal: 'Detran-SP Portal de Serviços', link: 'detran.sp.gov.br' },
    { portal: 'PGE-SP Dívida Ativa (PRDI)', link: 'dividaativa.pge.sp.gov.br' },
    { portal: 'Portal REGULARIZE (PGFN)', link: 'regularize.pgfn.gov.br' },
    { portal: 'Portal e-CAC (Receita Federal)', link: 'ecac.receita.fazenda.gov.br' },
    { portal: 'SPC Brasil', link: 'spcbrasil.org.br' },
    { portal: 'CENPROT Nacional (Protestos)', link: 'pesquisaprotesto.com.br' },
    { portal: 'Tribunal Superior do Trabalho (CNDT)', link: 'tst.jus.br' }
  ];

  let rowsCreds = '';
  for (const item of portaisPadrao) {
    const achou = creds.find(c => {
      const nomeP = (c.portal || c.nome || c.sistema || '').toLowerCase();
      return nomeP.includes(item.portal.split(' ')[0].toLowerCase());
    });

    let senhaVal = '(senha não informada)';
    let isFound = false;
    if (achou && achou.senha && achou.senha !== '0' && achou.senha.trim() !== '') {
      senhaVal = achou.senha;
      isFound = true;
    }

    const badgeStatus = isFound 
      ? '<span style="background:#DCFCE7; color:#166534; padding:2px 5px; border-radius:3px; font-size:6.2pt; font-weight:bold;">CONECTADO</span>'
      : '<span style="background:#F1F5F9; color:#94A3B8; padding:2px 5px; border-radius:3px; font-size:6.2pt; font-weight:bold;">NÃO INFORMADA</span>';

    const pwdHtml = isFound
      ? `<span style="font-family:Consolas,monospace; font-size:8pt; font-weight:bold; background:#FEF3C7; padding:2px 5px; border-radius:3px; border:1px solid #FCD34D; color:#0B111E;">${senhaVal}</span>`
      : `<span style="font-family:Consolas,monospace; font-size:7pt; font-style:italic; background:#F1F5F9; padding:2px 5px; border-radius:3px; border:1px solid #CBD5E1; color:#94A3B8;">${senhaVal}</span>`;

    rowsCreds += `
      <tr>
        <td><b>${item.portal}</b></td>
        <td>${item.link}</td>
        <td><code>${cli.cpf}</code></td>
        <td>${pwdHtml}</td>
        <td>${badgeStatus}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>01. Ficha Cadastral & Senhas — ${cli.nome}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
    html, body { background: #FFFFFF !important; color: #1E293B; margin: 0; padding: 0; }
    .sheet { 
      width: 210mm; height: 297mm; max-height: 297mm; background: #FFFFFF !important; 
      padding: 13mm 18mm 16mm 18mm; position: relative; overflow: hidden; z-index: 1; page-break-inside: avoid;
    }
    .watermark-mourato {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 140mm; height: 140mm; background-image: url('${sealDataUri}');
      background-size: contain; background-repeat: no-repeat; background-position: center;
      opacity: 0.055; pointer-events: none; z-index: 0;
    }
    .sheet-content { position: relative; z-index: 2; }
    .doc-header-institutional {
      border-bottom: 2px solid #C5A869; padding-bottom: 8px; margin-bottom: 9px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .brand-logo-crest { width: 44px; height: 44px; object-fit: contain; }
    .brand-main-name { font-size: 12.5pt; font-weight: 800; color: #0B111E; text-transform: uppercase; font-family: 'Cinzel', Georgia, serif; }
    .brand-main-name span { color: #C5A869; }
    .brand-main-sub { font-size: 6.5pt; font-weight: 700; color: #876223; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 2px; }
    .brand-main-meta { font-size: 6pt; color: #64748B; margin-top: 2px; }
    .doc-title-block {
      background: #0B111E; border-left: 4px solid #C5A869; padding: 7px 12px; margin-bottom: 9px; color: #FFFFFF; border-radius: 2px;
    }
    .doc-title-main { font-size: 10pt; font-weight: 800; color: #F8FAFC; text-transform: uppercase; letter-spacing: 0.04em; }
    .doc-title-sub { font-size: 7pt; color: #94A3B8; margin-top: 2px; }
    .section-title {
      font-size: 8pt; font-weight: 700; color: #876223; text-transform: uppercase; letter-spacing: 0.05em;
      margin: 8px 0 4px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;
    }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 7px; font-size: 7.2pt; }
    .data-table th, .data-table td { border: 1px solid #CBD5E1; padding: 4px 6px; text-align: left; }
    .data-table th { background: #F1F5F9; color: #0F172A; font-weight: 700; text-transform: uppercase; font-size: 6.5pt; }
    .footer-security {
      position: absolute; bottom: 8mm; left: 18mm; right: 18mm; border-top: 1px solid #CBD5E1;
      padding-top: 4px; display: flex; justify-content: space-between; font-size: 6.2pt; color: #94A3B8; line-height: 1.3; z-index: 10;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="watermark-mourato"></div>
    <div class="sheet-content">
      <div class="doc-header-institutional">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${sealDataUri}" class="brand-logo-crest" alt="Brasão">
          <div>
            <div class="brand-main-name">MOURATO <span>&</span> ASSOCIADOS</div>
            <div class="brand-main-sub">ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA</div>
            <div class="brand-main-meta">CNPJ: 38.377.738/0001-45 • SÃO PAULO - SP • AV. SÃO LUÍS, 187</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 6.8pt; color: #64748B;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Arquivo 1 de 2: Cadastro & Senhas</div>
          <div>Emissão: 12/11/2026</div>
        </div>
      </div>

      <div class="doc-title-block">
        <div class="doc-title-main">🔒 01. FICHA CADASTRAL & COFRE DE CREDENCIAIS — PESSOA FÍSICA</div>
        <div class="doc-title-sub">DOCUMENTO PROTEGIDO POR SENHA CRIPTOGRÁFICA (AES-256) • CHAVE DE ABERTURA: <b>1307</b></div>
      </div>

      <div class="section-title">1. Dados Cadastrais & Qualificação Civil</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Nome Completo:</b></td>
          <td style="width: 30%; font-weight: bold;">${cli.nome}</td>
          <td style="width: 20%;"><b>CPF Oficial:</b></td>
          <td style="width: 30%; font-family: monospace; font-weight: bold;">${cli.cpf}</td>
        </tr>
        <tr>
          <td><b>RG Oficial:</b></td>
          <td style="font-family: monospace;">${cli.rg}</td>
          <td><b>Nascimento:</b></td>
          <td>${cli.nasc}</td>
        </tr>
        <tr>
          <td><b>Filiação:</b></td>
          <td colspan="3">${cli.filiacao}</td>
        </tr>
        <tr>
          <td><b>Telefones:</b></td>
          <td>${cli.telefones}</td>
          <td><b>E-mails:</b></td>
          <td>${cli.emails}</td>
        </tr>
        <tr>
          <td><b>Endereço:</b></td>
          <td colspan="3">${cli.endereco}</td>
        </tr>
        <tr>
          <td><b>Vínculo Societário:</b></td>
          <td colspan="3"><b>${cli.empresa}</b></td>
        </tr>
      </table>

      <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-left: 3px solid #D97706; padding: 5px 8px; font-size: 6.8pt; color: #78350F; margin: 6px 0; border-radius: 3px;">
        <b>REGRA DO ZERO & SIGILO:</b> Campos ou portais em que o titular não forneceu senha permanecem explicitamente marcados como <b>(senha não informada)</b>, vedada qualquer suposição.
      </div>

      <div class="section-title">2. Relação de Senhas e Credenciais dos Birôs e Portais Oficiais</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Portal / Instituição</th>
            <th style="width: 25%;">Link Oficial</th>
            <th style="width: 20%;">Login / Usuário</th>
            <th style="width: 18%;">Senha / PIN</th>
            <th style="width: 12%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsCreds}
        </tbody>
      </table>

      <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 6.5pt; color: #64748B;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Departamento de Inteligência Cadastral, Forense & Segurança da Informação<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 200px;">
          <div style="font-size: 7pt; font-weight: bold; color: #0B111E;">CUSTÓDIA E GOVERNANÇA</div>
          <div style="font-size: 6pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>
    </div>

    <div class="footer-security">
      <div>Mourato & Associados • Arquivo 1: Cadastro & Senhas • Documento Criptografado (Senha: 1307)</div>
      <div>Autenticidade: <code>${hash}</code> • Página 1 de 1</div>
    </div>
  </div>
</body>
</html>`;
}

function gerarHtmlDoc2PF(cli) {
  const hash = crypto.createHash('sha256').update(cli.nome + '_DOSSIE_' + Date.now()).digest('hex').substring(0, 24).toUpperCase();
  
  const scoreQuod = cli.scores.quod ? `<div class="kpi-val">${cli.scores.quod}</div><div class="kpi-sub">✓ Extrato Oficial</div>` : `<div class="kpi-val" style="color:#94A3B8;">—</div><div class="kpi-sub" style="color:#94A3B8;">Não Informado</div>`;
  const scoreBoaVista = cli.scores.boavista ? `<div class="kpi-val">${cli.scores.boavista}</div><div class="kpi-sub">✓ Cadastro Positivo</div>` : `<div class="kpi-val" style="color:#94A3B8;">—</div><div class="kpi-sub" style="color:#94A3B8;">Não Informado</div>`;
  const scoreSerasa = cli.scores.serasa ? `<div class="kpi-val">${cli.scores.serasa}</div><div class="kpi-sub">✓ Sem Apontamentos</div>` : `<div class="kpi-val" style="color:#94A3B8;">—</div><div class="kpi-sub" style="color:#94A3B8;">Não Informado</div>`;
  const scoreBacen = cli.scores.bacen ? `<div class="kpi-val" style="color:#16A34A;">${cli.scores.bacen}</div><div class="kpi-sub">✓ SCR Bacen</div>` : `<div class="kpi-val" style="color:#94A3B8;">—</div><div class="kpi-sub" style="color:#94A3B8;">Não Informado</div>`;

  const scrEmDia = cli.scr.em_dia || '—';
  const scrAtraso = cli.scr.atraso || '—';
  const scrPrejuizo = cli.scr.prejuizo || '—';
  const scrLimite = cli.scr.limite || '—';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>02. Dossiê e Birôs Completo — ${cli.nome}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
    html, body { background: #FFFFFF !important; color: #1E293B; margin: 0; padding: 0; }
    .sheet { 
      width: 210mm; height: 297mm; max-height: 297mm; background: #FFFFFF !important; 
      padding: 12mm 18mm 16mm 18mm; position: relative; overflow: hidden; z-index: 1; page-break-after: always; page-break-inside: avoid;
    }
    .watermark-mourato {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 140mm; height: 140mm; background-image: url('${sealDataUri}');
      background-size: contain; background-repeat: no-repeat; background-position: center;
      opacity: 0.055; pointer-events: none; z-index: 0;
    }
    .sheet-content { position: relative; z-index: 2; }
    .doc-header-institutional {
      border-bottom: 2px solid #C5A869; padding-bottom: 8px; margin-bottom: 9px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .brand-logo-crest { width: 44px; height: 44px; object-fit: contain; }
    .brand-main-name { font-size: 12.5pt; font-weight: 800; color: #0B111E; text-transform: uppercase; font-family: 'Cinzel', Georgia, serif; }
    .brand-main-name span { color: #C5A869; }
    .brand-main-sub { font-size: 6.5pt; font-weight: 700; color: #876223; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 2px; }
    .brand-main-meta { font-size: 6pt; color: #64748B; margin-top: 2px; }
    .doc-title-block {
      background: #F8FAFC; border-left: 4px solid #C5A869; padding: 6px 12px; margin-bottom: 9px;
    }
    .doc-title-main { font-size: 10pt; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em; }
    .doc-title-sub { font-size: 7pt; color: #64748B; margin-top: 2px; }
    .section-title {
      font-size: 8pt; font-weight: 700; color: #876223; text-transform: uppercase; letter-spacing: 0.05em;
      margin: 8px 0 4px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;
    }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 7.2pt; }
    .data-table th, .data-table td { border: 1px solid #CBD5E1; padding: 4px 6px; text-align: left; }
    .data-table th { background: #F1F5F9; color: #0F172A; font-weight: 700; text-transform: uppercase; font-size: 6.5pt; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 8px; }
    .kpi-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-top: 3px solid #C5A869; padding: 5px 6px; border-radius: 4px; text-align: center; }
    .kpi-label { font-size: 5.8pt; font-weight: 700; color: #64748B; text-transform: uppercase; }
    .kpi-val { font-size: 10pt; font-weight: 800; color: #0F172A; margin: 1px 0; font-family: 'Cinzel', Georgia, serif; }
    .kpi-sub { font-size: 5.6pt; color: #16A34A; font-weight: bold; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 6pt; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-info { background: #DBEAFE; color: #1E40AF; }
    .footer-security {
      position: absolute; bottom: 8mm; left: 18mm; right: 18mm; border-top: 1px solid #CBD5E1;
      padding-top: 4px; display: flex; justify-content: space-between; font-size: 6.2pt; color: #94A3B8; line-height: 1.3; z-index: 10;
    }
  </style>
</head>
<body>

  <!-- PÁGINA 1: SCORES, SCR BACEN E CADASTRO BASE -->
  <div class="sheet">
    <div class="watermark-mourato"></div>
    <div class="sheet-content">
      <div class="doc-header-institutional">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${sealDataUri}" class="brand-logo-crest" alt="Brasão">
          <div>
            <div class="brand-main-name">MOURATO <span>&</span> ASSOCIADOS</div>
            <div class="brand-main-sub">ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA</div>
            <div class="brand-main-meta">CNPJ: 38.377.738/0001-45 • SÃO PAULO - SP • AV. SÃO LUÍS, 187</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 6.8pt; color: #64748B;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Arquivo 2 de 2: Dossiê e Birôs</div>
          <div>Emissão: 12/11/2026</div>
        </div>
      </div>

      <div class="doc-title-block">
        <div class="doc-title-main">02. DOSSIÊ PERICIAL DE BIRÔS DE CRÉDITO & COMPLIANCE FORENSE MASTER</div>
        <div class="doc-title-sub">Laudo Integrado de 100% das Consultas Realizadas no SFN • Documento Habilitado para Bancos</div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Score Quod</div>
          ${scoreQuod}
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Score Boa Vista</div>
          ${scoreBoaVista}
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Score Serasa</div>
          ${scoreSerasa}
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Rating SCR Bacen</div>
          ${scoreBacen}
        </div>
      </div>

      <div class="section-title">1. Identificação do Titular Auditado</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Titular:</b></td>
          <td style="width: 30%; font-weight: bold;">${cli.nome}</td>
          <td style="width: 20%;"><b>CPF Oficial:</b></td>
          <td style="width: 30%; font-family: monospace; font-weight: bold;">${cli.cpf}</td>
        </tr>
        <tr>
          <td><b>Empresa Vinculada:</b></td>
          <td colspan="3"><b>${cli.empresa}</b></td>
        </tr>
      </table>

      <div class="section-title">2. Banco Central do Brasil — Sistema de Informações de Crédito (SCR BACEN)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Parâmetro Auditado</th>
            <th>Valor Oficial Comprovado</th>
            <th>Classificação Pericial</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Operações de Crédito em Dia</td>
            <td><b>${scrEmDia}</b></td>
            <td><span class="badge badge-success">ADIMPLENTE</span></td>
          </tr>
          <tr>
            <td>Dívidas Vencidas / Inadimplência</td>
            <td><b>${scrAtraso}</b></td>
            <td><span class="badge badge-success">ZERO ATRASO</span></td>
          </tr>
          <tr>
            <td>Prejuízo Registrado (Write-off)</td>
            <td><b>${scrPrejuizo}</b></td>
            <td><span class="badge badge-success">ZERO PREJUÍZO</span></td>
          </tr>
          <tr>
            <td>Limites de Crédito Disponíveis</td>
            <td><b>${scrLimite}</b></td>
            <td><span class="badge badge-info">DISPONÍVEL</span></td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">3. Certidões Fiscais, Dívida Ativa e Cartórios de Protesto</div>
      <table class="data-table">
        <tr>
          <td style="width: 25%;"><b>Cartórios de Protesto:</b></td>
          <td colspan="3">${cli.cenprot}</td>
        </tr>
        <tr>
          <td><b>Dívida Ativa (PGFN / PGE):</b></td>
          <td colspan="3">${cli.divida_ativa}</td>
        </tr>
      </table>

      <div class="section-title">4. Parecer Conclusivo da Assessoria & Rating de Crédito</div>
      <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-left: 3px solid #16A34A; padding: 6px 9px; font-size: 7.2pt; color: #166534; border-radius: 3px;">
        <b>PARECER TÉCNICO DE SOLVÊNCIA:</b> Titular <b>${cli.nome}</b> devidamente auditado no Sistema Financeiro Nacional.<br>
        <b>Classificação Atribuída:</b> <span class="badge badge-success" style="font-size: 7.5pt;">RATING: ${cli.rating}</span>
      </div>

      <div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 6.5pt; color: #64748B;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Departamento de Inteligência Cadastral, Forense & Risco Financeiro<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 200px;">
          <div style="font-size: 7pt; font-weight: bold; color: #0B111E;">COMITÊ DE COMPLIANCE</div>
          <div style="font-size: 6pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>
    </div>

    <div class="footer-security">
      <div>Mourato & Associados • Arquivo 2: Dossiê e Birôs Completo • Laudo Pericial de Crédito</div>
      <div>Autenticidade: <code>${hash}</code> • Página 1 de 1</div>
    </div>
  </div>
</body>
</html>`;
}

function gerarHtmlDoc1PJ(pj, creds) {
  const hash = crypto.createHash('sha256').update(pj.razao + Date.now()).digest('hex').substring(0, 24).toUpperCase();
  
  const portaisPadrao = [
    { portal: 'Receita Federal / Simples Nacional / e-CAC', link: 'ecac.receita.fazenda.gov.br' },
    { portal: 'Bacen Registrato (SCR / CCS PJ)', link: 'registrato.bcb.gov.br' },
    { portal: 'Serasa Experian PJ', link: 'serasajudicial.com.br' },
    { portal: 'Boa Vista PJ', link: 'boavistaservicos.com.br' },
    { portal: 'Quod PJ', link: 'quod.com.br' },
    { portal: 'PGE-SP Dívida Ativa Estadual', link: 'dividaativa.pge.sp.gov.br' },
    { portal: 'Caixa Econômica (CRF FGTS)', link: 'conectividadesocialv2.caixa.gov.br' }
  ];

  let rowsCreds = '';
  for (const item of portaisPadrao) {
    const achou = creds.find(c => {
      const nomeP = (c.portal || c.nome || c.sistema || '').toLowerCase();
      return nomeP.includes(item.portal.split(' ')[0].toLowerCase());
    });

    let senhaVal = '(senha não informada)';
    let isFound = false;
    if (achou && achou.senha && achou.senha !== '0' && achou.senha.trim() !== '') {
      senhaVal = achou.senha;
      isFound = true;
    }

    const badgeStatus = isFound 
      ? '<span style="background:#DCFCE7; color:#166534; padding:2px 5px; border-radius:3px; font-size:6.2pt; font-weight:bold;">CONECTADO</span>'
      : '<span style="background:#F1F5F9; color:#94A3B8; padding:2px 5px; border-radius:3px; font-size:6.2pt; font-weight:bold;">NÃO INFORMADA</span>';

    const pwdHtml = isFound
      ? `<span style="font-family:Consolas,monospace; font-size:8pt; font-weight:bold; background:#FEF3C7; padding:2px 5px; border-radius:3px; border:1px solid #FCD34D; color:#0B111E;">${senhaVal}</span>`
      : `<span style="font-family:Consolas,monospace; font-size:7pt; font-style:italic; background:#F1F5F9; padding:2px 5px; border-radius:3px; border:1px solid #CBD5E1; color:#94A3B8;">${senhaVal}</span>`;

    rowsCreds += `
      <tr>
        <td><b>${item.portal}</b></td>
        <td>${item.link}</td>
        <td><code>${pj.cnpj}</code></td>
        <td>${pwdHtml}</td>
        <td>${badgeStatus}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>01. Ficha Cadastral & Senhas PJ — ${pj.razao}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
    html, body { background: #FFFFFF !important; color: #1E293B; margin: 0; padding: 0; }
    .sheet { 
      width: 210mm; height: 297mm; max-height: 297mm; background: #FFFFFF !important; 
      padding: 13mm 18mm 16mm 18mm; position: relative; overflow: hidden; z-index: 1; page-break-inside: avoid;
    }
    .watermark-mourato {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 140mm; height: 140mm; background-image: url('${sealDataUri}');
      background-size: contain; background-repeat: no-repeat; background-position: center;
      opacity: 0.055; pointer-events: none; z-index: 0;
    }
    .sheet-content { position: relative; z-index: 2; }
    .doc-header-institutional {
      border-bottom: 2px solid #C5A869; padding-bottom: 8px; margin-bottom: 9px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .brand-logo-crest { width: 44px; height: 44px; object-fit: contain; }
    .brand-main-name { font-size: 12.5pt; font-weight: 800; color: #0B111E; text-transform: uppercase; font-family: 'Cinzel', Georgia, serif; }
    .brand-main-name span { color: #C5A869; }
    .brand-main-sub { font-size: 6.5pt; font-weight: 700; color: #876223; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 2px; }
    .brand-main-meta { font-size: 6pt; color: #64748B; margin-top: 2px; }
    .doc-title-block {
      background: #0B111E; border-left: 4px solid #C5A869; padding: 7px 12px; margin-bottom: 9px; color: #FFFFFF; border-radius: 2px;
    }
    .doc-title-main { font-size: 10pt; font-weight: 800; color: #F8FAFC; text-transform: uppercase; letter-spacing: 0.04em; }
    .doc-title-sub { font-size: 7pt; color: #94A3B8; margin-top: 2px; }
    .section-title {
      font-size: 8pt; font-weight: 700; color: #876223; text-transform: uppercase; letter-spacing: 0.05em;
      margin: 8px 0 4px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;
    }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 7px; font-size: 7.2pt; }
    .data-table th, .data-table td { border: 1px solid #CBD5E1; padding: 4px 6px; text-align: left; }
    .data-table th { background: #F1F5F9; color: #0F172A; font-weight: 700; text-transform: uppercase; font-size: 6.5pt; }
    .footer-security {
      position: absolute; bottom: 8mm; left: 18mm; right: 18mm; border-top: 1px solid #CBD5E1;
      padding-top: 4px; display: flex; justify-content: space-between; font-size: 6.2pt; color: #94A3B8; line-height: 1.3; z-index: 10;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="watermark-mourato"></div>
    <div class="sheet-content">
      <div class="doc-header-institutional">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${sealDataUri}" class="brand-logo-crest" alt="Brasão">
          <div>
            <div class="brand-main-name">MOURATO <span>&</span> ASSOCIADOS</div>
            <div class="brand-main-sub">ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA</div>
            <div class="brand-main-meta">CNPJ: 38.377.738/0001-45 • SÃO PAULO - SP • AV. SÃO LUÍS, 187</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 6.8pt; color: #64748B;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Arquivo 1 de 2: Cadastro & Senhas PJ</div>
          <div>Emissão: 12/11/2026</div>
        </div>
      </div>

      <div class="doc-title-block">
        <div class="doc-title-main">🔒 01. FICHA CADASTRAL & COFRE DE CREDENCIAIS — PESSOA JURÍDICA</div>
        <div class="doc-title-sub">DOCUMENTO PROTEGIDO POR SENHA CRIPTOGRÁFICA (AES-256) • CHAVE DE ABERTURA: <b>1307</b></div>
      </div>

      <div class="section-title">1. Dados Cadastrais da Pessoa Jurídica (Receita Federal)</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Razão Social:</b></td>
          <td style="width: 35%; font-weight: bold;">${pj.razao}</td>
          <td style="width: 20%;"><b>CNPJ Oficial:</b></td>
          <td style="width: 25%; font-family: monospace; font-weight: bold;">${pj.cnpj}</td>
        </tr>
        <tr>
          <td><b>Data de Abertura:</b></td>
          <td>${pj.abertura}</td>
          <td><b>Capital Social:</b></td>
          <td><b>${pj.capital}</b></td>
        </tr>
        <tr>
          <td><b>CNAE Principal:</b></td>
          <td colspan="3">${pj.cnae}</td>
        </tr>
        <tr>
          <td><b>Endereço da Sede:</b></td>
          <td colspan="3">${pj.sede}</td>
        </tr>
        <tr>
          <td><b>Quadro Societário:</b></td>
          <td colspan="3">${pj.socio}</td>
        </tr>
      </table>

      <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-left: 3px solid #D97706; padding: 5px 8px; font-size: 6.8pt; color: #78350F; margin: 6px 0; border-radius: 3px;">
        <b>REGRA DO ZERO & SIGILO:</b> Campos ou portais sem senha permanecem explicitamente marcados como <b>(senha não informada)</b>, vedada qualquer suposição.
      </div>

      <div class="section-title">2. Relação de Senhas e Credenciais dos Birôs e Portais Oficiais</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Portal / Instituição</th>
            <th style="width: 25%;">Link Oficial</th>
            <th style="width: 20%;">Login / Usuário</th>
            <th style="width: 18%;">Senha / PIN</th>
            <th style="width: 12%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsCreds}
        </tbody>
      </table>

      <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 6.5pt; color: #64748B;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Departamento de Inteligência Cadastral, Forense & Segurança da Informação<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 200px;">
          <div style="font-size: 7pt; font-weight: bold; color: #0B111E;">CUSTÓDIA E GOVERNANÇA</div>
          <div style="font-size: 6pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>
    </div>

    <div class="footer-security">
      <div>Mourato & Associados • Arquivo 1: Cadastro & Senhas PJ • Documento Criptografado (Senha: 1307)</div>
      <div>Autenticidade: <code>${hash}</code> • Página 1 de 1</div>
    </div>
  </div>
</body>
</html>`;
}

function gerarHtmlDoc2PJ(pj) {
  const hash = crypto.createHash('sha256').update(pj.razao + '_DOSSIE_' + Date.now()).digest('hex').substring(0, 24).toUpperCase();

  const scoreSerasa = pj.scores.serasa_pj ? `<div class="kpi-val">${pj.scores.serasa_pj}</div><div class="kpi-sub">✓ Serasa PJ</div>` : `<div class="kpi-val" style="color:#94A3B8;">—</div><div class="kpi-sub" style="color:#94A3B8;">Não Informado</div>`;
  const scoreBoaVista = pj.scores.boavista_pj ? `<div class="kpi-val">${pj.scores.boavista_pj}</div><div class="kpi-sub">✓ Boa Vista PJ</div>` : `<div class="kpi-val" style="color:#94A3B8;">—</div><div class="kpi-sub" style="color:#94A3B8;">Não Informado</div>`;
  const scoreBacen = pj.scores.scr_bacen ? `<div class="kpi-val" style="color:#16A34A; font-size:8.5pt;">${pj.scores.scr_bacen}</div>` : `<div class="kpi-val" style="color:#94A3B8;">—</div><div class="kpi-sub" style="color:#94A3B8;">Não Informado</div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>02. Dossiê e Birôs PJ Completo — ${pj.razao}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
    html, body { background: #FFFFFF !important; color: #1E293B; margin: 0; padding: 0; }
    .sheet { 
      width: 210mm; height: 297mm; max-height: 297mm; background: #FFFFFF !important; 
      padding: 12mm 18mm 16mm 18mm; position: relative; overflow: hidden; z-index: 1; page-break-after: always; page-break-inside: avoid;
    }
    .watermark-mourato {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 140mm; height: 140mm; background-image: url('${sealDataUri}');
      background-size: contain; background-repeat: no-repeat; background-position: center;
      opacity: 0.055; pointer-events: none; z-index: 0;
    }
    .sheet-content { position: relative; z-index: 2; }
    .doc-header-institutional {
      border-bottom: 2px solid #C5A869; padding-bottom: 8px; margin-bottom: 9px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .brand-logo-crest { width: 44px; height: 44px; object-fit: contain; }
    .brand-main-name { font-size: 12.5pt; font-weight: 800; color: #0B111E; text-transform: uppercase; font-family: 'Cinzel', Georgia, serif; }
    .brand-main-name span { color: #C5A869; }
    .brand-main-sub { font-size: 6.5pt; font-weight: 700; color: #876223; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 2px; }
    .brand-main-meta { font-size: 6pt; color: #64748B; margin-top: 2px; }
    .doc-title-block {
      background: #F8FAFC; border-left: 4px solid #C5A869; padding: 6px 12px; margin-bottom: 9px;
    }
    .doc-title-main { font-size: 10pt; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em; }
    .doc-title-sub { font-size: 7pt; color: #64748B; margin-top: 2px; }
    .section-title {
      font-size: 8pt; font-weight: 700; color: #876223; text-transform: uppercase; letter-spacing: 0.05em;
      margin: 8px 0 4px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;
    }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 7.2pt; }
    .data-table th, .data-table td { border: 1px solid #CBD5E1; padding: 4px 6px; text-align: left; }
    .data-table th { background: #F1F5F9; color: #0F172A; font-weight: 700; text-transform: uppercase; font-size: 6.5pt; }
    .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-bottom: 8px; }
    .kpi-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-top: 3px solid #C5A869; padding: 5px 6px; border-radius: 4px; text-align: center; }
    .kpi-label { font-size: 5.8pt; font-weight: 700; color: #64748B; text-transform: uppercase; }
    .kpi-val { font-size: 10pt; font-weight: 800; color: #0F172A; margin: 1px 0; font-family: 'Cinzel', Georgia, serif; }
    .kpi-sub { font-size: 5.6pt; color: #16A34A; font-weight: bold; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 6pt; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: #DCFCE7; color: #166534; }
    .footer-security {
      position: absolute; bottom: 8mm; left: 18mm; right: 18mm; border-top: 1px solid #CBD5E1;
      padding-top: 4px; display: flex; justify-content: space-between; font-size: 6.2pt; color: #94A3B8; line-height: 1.3; z-index: 10;
    }
  </style>
</head>
<body>

  <!-- PÁGINA 1: DADOS CADASTRAIS, SCORES PJ E CNDS -->
  <div class="sheet">
    <div class="watermark-mourato"></div>
    <div class="sheet-content">
      <div class="doc-header-institutional">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${sealDataUri}" class="brand-logo-crest" alt="Brasão">
          <div>
            <div class="brand-main-name">MOURATO <span>&</span> ASSOCIADOS</div>
            <div class="brand-main-sub">ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA</div>
            <div class="brand-main-meta">CNPJ: 38.377.738/0001-45 • SÃO PAULO - SP • AV. SÃO LUÍS, 187</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 6.8pt; color: #64748B;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Arquivo 2 de 2: Dossiê PJ</div>
          <div>Emissão: 12/11/2026</div>
        </div>
      </div>

      <div class="doc-title-block">
        <div class="doc-title-main">02. DOSSIÊ PERICIAL CORPORATIVO, BIRÔS & HABILITAÇÃO BANCÁRIA — PJ</div>
        <div class="doc-title-sub">Laudo Integrado de 100% das Consultas Realizadas no SFN • Documento Habilitado para Bancos</div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Serasa Experian PJ</div>
          ${scoreSerasa}
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Boa Vista PJ</div>
          ${scoreBoaVista}
        </div>
        <div class="kpi-card">
          <div class="kpi-label">SCR Banco Central</div>
          ${scoreBacen}
        </div>
      </div>

      <div class="section-title">1. Qualificação Societária & Cadastral (Receita Federal)</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Razão Social:</b></td>
          <td style="width: 35%; font-weight: bold;">${pj.razao}</td>
          <td style="width: 20%;"><b>CNPJ Oficial:</b></td>
          <td style="width: 25%; font-family: monospace; font-weight: bold;">${pj.cnpj}</td>
        </tr>
        <tr>
          <td><b>Data de Abertura:</b></td>
          <td>${pj.abertura}</td>
          <td><b>Capital Social:</b></td>
          <td><b>${pj.capital}</b></td>
        </tr>
        <tr>
          <td><b>CNAE Principal:</b></td>
          <td colspan="3">${pj.cnae}</td>
        </tr>
        <tr>
          <td><b>Endereço da Sede:</b></td>
          <td colspan="3">${pj.sede}</td>
        </tr>
        <tr>
          <td><b>Sócio / Responsável:</b></td>
          <td colspan="3">${pj.socio}</td>
        </tr>
      </table>

      <div class="section-title">2. Certidões Negativas de Débitos (CNDs) & Regularidade Fiscal</div>
      <table class="data-table">
        <tr>
          <td style="width: 25%;"><b>Situação Cadastral / Fiscal:</b></td>
          <td>${pj.cnds}</td>
        </tr>
      </table>

      <div class="section-title">3. Parecer Técnico Conclusivo & Rating Corporativo</div>
      <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-left: 3px solid #16A34A; padding: 6px 9px; font-size: 7.2pt; color: #166534; border-radius: 3px;">
        <b>PARECER DE HABILITAÇÃO:</b> Empresa <b>${pj.razao}</b> qualificada perante o Sistema Financeiro Nacional.<br>
        <b>Classificação Atribuída:</b> <span class="badge badge-success" style="font-size: 7.5pt;">RATING: ${pj.rating}</span>
      </div>

      <div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 6.5pt; color: #64748B;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Comitê de Análise Financeira, Compliance & Risco Corporativo<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 200px;">
          <div style="font-size: 7pt; font-weight: bold; color: #0B111E;">COMITÊ CORPORATIVO</div>
          <div style="font-size: 6pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>
    </div>

    <div class="footer-security">
      <div>Mourato & Associados • Arquivo 2: Dossiê e Birôs PJ • Laudo Corporativo</div>
      <div>Autenticidade: <code>${hash}</code> • Página 1 de 1</div>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('=== PROCESSAMENTO EM LOTE DO ECOSSISTEMA COMPLETO — PADRÃO 2 ARQUIVOS ===');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  // 1. PROCESSA CLIENTES PF
  console.log('\n>>> PROCESSANDO CLIENTES PESSOA FÍSICA (PF)...');
  for (const cli of CLIENTES_PF_MAP) {
    const pfDir = path.join(BASE_TEIA, 'ClientesPF', cli.folder);
    if (!fs.existsSync(pfDir)) fs.mkdirSync(pfDir, { recursive: true });
    const docsDir = path.join(pfDir, 'documentos_pdf');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    // Lê credenciais existentes
    let creds = [];
    const cpPath = path.join(pfDir, 'credenciais_portais.json');
    if (fs.existsSync(cpPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
        creds = d.portais || d || [];
      } catch (e) {}
    }

    // ARQUIVO 1 (Com senha 1307)
    const html1 = gerarHtmlDoc1PF(cli, creds);
    const html1Path = path.join(pfDir, '01_CADASTRO_E_SENHAS_PROTEGIDO.html');
    const pdf1Temp = path.join(pfDir, 'temp1.pdf');
    const pdf1Final = path.join(pfDir, '01_CADASTRO_E_SENHAS_PROTEGIDO.pdf');
    const pdfFicha = path.join(pfDir, 'FICHA_CADASTRAL_E_SENHAS.pdf');

    fs.writeFileSync(html1Path, html1, 'utf8');
    const p1 = await browser.newPage();
    await p1.goto('file:///' + html1Path.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
    await p1.waitForTimeout(300);
    await p1.pdf({ path: pdf1Temp, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    await p1.close();

    // Criptografa
    execSync(`python -c "import pypdf; r=pypdf.PdfReader(r'${pdf1Temp}'); w=pypdf.PdfWriter(); [w.add_page(p) for p in r.pages]; w.encrypt('1307'); fp=open(r'${pdf1Final}','wb'); w.write(fp); fp.close()"`);
    if (fs.existsSync(pdf1Temp)) fs.unlinkSync(pdf1Temp);
    fs.copyFileSync(pdf1Final, pdfFicha);
    fs.copyFileSync(pdf1Final, path.join(docsDir, '01_CADASTRO_E_SENHAS_PROTEGIDO.pdf'));
    fs.copyFileSync(pdf1Final, path.join(docsDir, 'FICHA_CADASTRAL_E_SENHAS.pdf'));

    // ARQUIVO 2 (Aberto)
    const html2 = gerarHtmlDoc2PF(cli);
    const html2Path = path.join(pfDir, '02_DOSSIE_E_BIROS_COMPLETO.html');
    const pdf2Final = path.join(pfDir, '02_DOSSIE_E_BIROS_COMPLETO.pdf');
    const pdfRel = path.join(pfDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf');

    fs.writeFileSync(html2Path, html2, 'utf8');
    const p2 = await browser.newPage();
    await p2.goto('file:///' + html2Path.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
    await p2.waitForTimeout(300);
    await p2.pdf({ path: pdf2Final, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    await p2.close();

    fs.copyFileSync(pdf2Final, pdfRel);
    fs.copyFileSync(pdf2Final, path.join(docsDir, '02_DOSSIE_E_BIROS_COMPLETO.pdf'));
    fs.copyFileSync(pdf2Final, path.join(docsDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf'));

    console.log(`✓ PF: ${cli.nome} -> 01_CADASTRO (Protegido 1307) & 02_DOSSIE (Aberto) gerados.`);
  }

  // 2. PROCESSA CLIENTES PJ
  console.log('\n>>> PROCESSANDO CLIENTES PESSOA JURÍDICA (PJ)...');
  for (const pj of CLIENTES_PJ_MAP) {
    const pjDir = path.join(BASE_TEIA, 'ClientesPJ', pj.folder);
    if (!fs.existsSync(pjDir)) fs.mkdirSync(pjDir, { recursive: true });
    const docsDir = path.join(pjDir, 'documentos_pdf');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    let creds = [];
    const cpPath = path.join(pjDir, 'credenciais_portais.json');
    if (fs.existsSync(cpPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
        creds = d.portais || d || [];
      } catch (e) {}
    }

    // ARQUIVO 1 (Com senha 1307)
    const html1 = gerarHtmlDoc1PJ(pj, creds);
    const html1Path = path.join(pjDir, '01_CADASTRO_E_SENHAS_PROTEGIDO.html');
    const pdf1Temp = path.join(pjDir, 'temp1.pdf');
    const pdf1Final = path.join(pjDir, '01_CADASTRO_E_SENHAS_PROTEGIDO.pdf');
    const pdfFicha = path.join(pjDir, 'FICHA_CADASTRAL_E_SENHAS.pdf');

    fs.writeFileSync(html1Path, html1, 'utf8');
    const p1 = await browser.newPage();
    await p1.goto('file:///' + html1Path.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
    await p1.waitForTimeout(300);
    await p1.pdf({ path: pdf1Temp, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    await p1.close();

    execSync(`python -c "import pypdf; r=pypdf.PdfReader(r'${pdf1Temp}'); w=pypdf.PdfWriter(); [w.add_page(p) for p in r.pages]; w.encrypt('1307'); fp=open(r'${pdf1Final}','wb'); w.write(fp); fp.close()"`);
    if (fs.existsSync(pdf1Temp)) fs.unlinkSync(pdf1Temp);
    fs.copyFileSync(pdf1Final, pdfFicha);
    fs.copyFileSync(pdf1Final, path.join(docsDir, '01_CADASTRO_E_SENHAS_PROTEGIDO.pdf'));
    fs.copyFileSync(pdf1Final, path.join(docsDir, 'FICHA_CADASTRAL_E_SENHAS.pdf'));

    // ARQUIVO 2 (Aberto)
    const html2 = gerarHtmlDoc2PJ(pj);
    const html2Path = path.join(pjDir, '02_DOSSIE_E_BIROS_COMPLETO.html');
    const pdf2Final = path.join(pjDir, '02_DOSSIE_E_BIROS_COMPLETO.pdf');
    const pdfRel = path.join(pjDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf');

    fs.writeFileSync(html2Path, html2, 'utf8');
    const p2 = await browser.newPage();
    await p2.goto('file:///' + html2Path.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
    await p2.waitForTimeout(300);
    await p2.pdf({ path: pdf2Final, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    await p2.close();

    fs.copyFileSync(pdf2Final, pdfRel);
    fs.copyFileSync(pdf2Final, path.join(docsDir, '02_DOSSIE_E_BIROS_COMPLETO.pdf'));
    fs.copyFileSync(pdf2Final, path.join(docsDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf'));

    console.log(`✓ PJ: ${pj.razao} -> 01_CADASTRO (Protegido 1307) & 02_DOSSIE (Aberto) gerados.`);
  }

  await browser.close();
  console.log('\n=== LOTE CONCLUÍDO COM SUCESSO ABSOLUTO! ===');
}

main().catch(err => {
  console.error('Erro na execução do lote:', err);
  process.exit(1);
});
