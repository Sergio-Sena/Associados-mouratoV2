import fs from 'fs';
import path from 'path';

const DB_PATH = 'C:\\Projetos\\Empreas\\data\\fichas_cadastrais_db.json';
const BASE_TEIA = 'C:\\Teia de arranha';
const SOURCE_DIR = 'C:\\Teia de arranha\\Robo\\legado_sistema\\dados_pj_clientesPJ\\ADILSON DE ANDRADE LIMA';

const ADILSON_DATA = {
  cpf_raw: "12829477880",
  cpf_formatado: "128.294.778-80",
  id_alias: "adilson_lima",
  nome_completo: "ADILSON DE ANDRADE LIMA",
  rg: "Informar na emissão CNH",
  orgao_expedidor: "DETRAN",
  nascimento: "",
  profissao: "Empresário Individual (Comércio de Gás GLP)",
  estado_civil: "",
  nacionalidade: "Brasileiro",
  nome_mae: "",
  nome_pai: "",
  email_principal: "dadaltofabricio2@gmail.com",
  email_secundario: "",
  telefone_principal: "(33) 3261-3399",
  telefones_adicionais: ["(33) 3261-2355"],
  endereco_principal: "Rua São Paulo, 3020, Edifício Monte Aga, Ap 102 - Itapuã - Vila Velha - ES",
  endereco_secundario: "Av. Getúlio Vargas, 2856 - Centro - Conselheiro Pena - MG",
  cep: "29101-512",
  tipo_perfil: "PJ / PF",
  rating_geral: "Score 800 (Excelente) / Nada Consta nos Birôs",
  observacoes: "Empresa Lima Gás fundada em 15/03/2012 (14 anos de mercado). Zero protestos, zero pendências financeiras, zero devoluções de cheque BACEN. Relatório executivo de 29/10/2026.",
  created_at: new Date().toLocaleString('pt-BR'),
  updated_at: new Date().toLocaleString('pt-BR'),
  escolaridade: null,
  renda_declarada: null,
  empresas_vinculadas: [
    {
      cnpj_raw: "15204314000183",
      cnpj_formatado: "15.204.314/0001-83",
      cliente_cpf: "12829477880",
      razao_social: "ADILSON DE ANDRADE LIMA",
      nome_fantasia: "LIMA GAS",
      nire: "",
      situacao: "ATIVA",
      data_abertura: "15/03/2012",
      qualificacao: "Empresário Individual (ME)",
      capital_social: "R$ 50.000,00",
      cnae: "4784-9/00 - Comércio Varejista de Gás Liquefeito de Petróleo (GLP)",
      natureza_juridica: "213-5 - Empresário Individual",
      regime_tributario: "Optante pelo Simples Nacional",
      endereco: "Av. Getúlio Vargas, 2856 - Centro - Conselheiro Pena/MG - CEP: 35240-000",
      telefones: "(33) 3261-3399 / (33) 3261-2355",
      cargo_socio: "Titular / Empresário (100% do Capital)",
      score_serasa_pj: 800,
      score_credito_total: 570,
      cnd_status: "REGULAR",
      endividamento_scr: "R$ 0,00 (Nenhuma operação irregular)"
    }
  ],
  scores: [
    {
      id: 501,
      cliente_cpf: "12829477880",
      bureau: "CRÉDITO LIGHT PJ",
      score: "800",
      faixa: "Faixa A (Excelente - 80.0%)",
      data_atualizacao: "29/10/2026",
      detalhes: "Probabilidade de inadimplência de apenas 12,79%. Chance de pagamento de 87,21% em 6 meses. Zero pendências."
    },
    {
      id: 502,
      cliente_cpf: "12829477880",
      bureau: "CRÉDITO TOTAL + SCR BACEN",
      score: "570",
      faixa: "Média (57.0%)",
      data_atualizacao: "29/10/2026",
      detalhes: "Relatório com SCR BACEN anexado. Zero protestos e cheques sem fundos."
    },
    {
      id: 503,
      cliente_cpf: "12829477880",
      bureau: "CARTÓRIOS DE PROTESTO",
      score: "1000",
      faixa: "NADA CONSTA",
      data_atualizacao: "29/10/2026",
      detalhes: "Zero títulos protestados em âmbito nacional."
    },
    {
      id: 504,
      cliente_cpf: "12829477880",
      bureau: "BACEN CCF (CHEQUES)",
      score: "1000",
      faixa: "NADA CONSTA",
      data_atualizacao: "29/10/2026",
      detalhes: "Zero cheques sem fundos registrados no Banco Central."
    }
  ],
  credenciais: [
    {
      id: 601,
      cliente_cpf: "12829477880",
      portal: "Receita Federal / Simples Nacional",
      usuario: "15.204.314/0001-83",
      senha: "",
      pin: "",
      metodo_preferencial: "CERTIFICADO_A1_OU_CODIGO",
      url_acesso: "https://www8.receita.fazenda.gov.br/simplesnacional",
      status: "AGUARDANDO_SENHA",
      observacoes: "Pendente fornecimento de código de acesso ou Certificado A1"
    },
    {
      id: 602,
      cliente_cpf: "12829477880",
      portal: "Bacen Registrato (SCR / CCS)",
      usuario: "128.294.778-80",
      senha: "",
      pin: "",
      metodo_preferencial: "GOV_BR_OURO_PRATA",
      url_acesso: "https://registrato.bcb.gov.br",
      status: "AGUARDANDO_LOGIN_GOVBR",
      observacoes: "Necessário login Gov.br nível Prata ou Ouro"
    },
    {
      id: 603,
      cliente_cpf: "12829477880",
      portal: "Serasa Experian PJ / Limpa Nome",
      usuario: "15.204.314/0001-83",
      senha: "",
      pin: "",
      metodo_preferencial: "LOGIN_SENHA",
      url_acesso: "https://www.serasajudicial.com.br / https://www.serasa.com.br",
      status: "PRONTO_PARA_VERIFICACAO",
      observacoes: "Score base 800 já extraído da base pericial em 29/10/2026"
    },
    {
      id: 604,
      cliente_cpf: "12829477880",
      portal: "Quod PJ / PF",
      usuario: "12829477880",
      senha: "",
      pin: "",
      metodo_preferencial: "LOGIN_SENHA",
      url_acesso: "https://consumidor.quod.com.br",
      status: "PRONTO_PARA_VERIFICACAO",
      observacoes: "Pronto para checagem com login do cliente"
    }
  ]
};

// Gerador HTML da Ficha Cadastral e Senhas
function generateFichaHtml(tipo, data, credenciais, scores, vinculos, documentos) {
  const isPj = tipo === 'PJ';
  const titulo = isPj ? (data.razao_social + ' (' + (data.nome_fantasia || 'LIMA GÁS') + ')') : data.nome_completo;
  const documento = isPj ? (data.cnpj_formatado || data.cnpj_raw) : data.cpf_formatado;

  const credsRows = credenciais.map(c => `
    <tr>
      <td><b>${c.portal}</b></td>
      <td><code>${c.usuario || '-'}</code></td>
      <td style="color: #b91c1c; font-weight: bold; font-family: monospace;">${c.senha || (c.status === 'AGUARDANDO_SENHA' ? '<span style="color:#ca8a04;">[PENDENTE FORNECER SENHA]</span>' : 'GOV.BR / A1')}</td>
      <td><span class="badge" style="background:#FEF08A; color:#854D0E;">${c.status}</span></td>
      <td>${c.url_acesso ? `<a href="${c.url_acesso}" target="_blank" class="link-btn">Acessar Portal ↗</a>` : '-'}</td>
    </tr>
  `).join('');

  const scoresCards = scores.map(s => `
    <div class="kpi-card">
      <div class="kpi-label">${s.bureau}</div>
      <div class="kpi-val">${s.score}</div>
      <div class="kpi-sub">${s.faixa}</div>
    </div>
  `).join('');

  const docsList = documentos.map(d => `<li>📄 <b>${d.name}</b> <span style="color:#64748b; font-size:7.5pt;">(${(d.size/1024).toFixed(1)} KB)</span></li>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha Cadastral e Senhas — ${titulo}</title>
  <style>
    :root { var(--gold): #C5A869; var(--navy): #0B111E; var(--border): #E2E8F0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    body { background: #0F172A; color: #1E293B; padding: 2rem 1rem; display: flex; justify-content: center; }
    .sheet { width: 210mm; min-height: 297mm; background: #FFFFFF; padding: 18mm 20mm; box-shadow: 0 10px 40px rgba(0,0,0,0.5); position: relative; }
    .no-print { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: #1E293B; padding: 0.75rem 1.25rem; border-radius: 6px; color: #fff; width: 210mm; }
    .btn-print { background: linear-gradient(135deg, #D4AF37, #996515); color: #000; font-weight: bold; border: none; padding: 0.5rem 1.2rem; border-radius: 4px; cursor: pointer; }
    .header { border-bottom: 2px solid #C5A869; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .brand-title { font-size: 14pt; font-weight: 800; color: #0B111E; text-transform: uppercase; letter-spacing: 0.05em; }
    .brand-title span { color: #C5A869; }
    .brand-sub { font-size: 7pt; font-weight: 700; color: #876223; letter-spacing: 0.12em; text-transform: uppercase; }
    .doc-meta { font-size: 8pt; color: #64748B; text-align: right; }
    .banner { background: #0B111E; color: #FFFFFF; padding: 10px 14px; border-radius: 4px; border-left: 4px solid #C5A869; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .banner h1 { font-size: 11pt; font-weight: bold; }
    .badge-tipo { background: rgba(197, 168, 105, 0.25); color: #F5DF98; font-size: 7.5pt; font-weight: bold; padding: 3px 8px; border-radius: 4px; border: 1px solid #C5A869; }
    .section-title { font-size: 9pt; font-weight: 800; color: #0B111E; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px; margin: 14px 0 8px 0; text-transform: uppercase; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 12px; }
    .data-table th { background: #F1F5F9; color: #0B111E; text-align: left; padding: 5px 8px; border: 1px solid #E2E8F0; font-size: 7pt; text-transform: uppercase; }
    .data-table td { padding: 5px 8px; border: 1px solid #E2E8F0; }
    .data-table tr:nth-child(even) td { background: #F8FAFC; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-top: 2px solid #C5A869; padding: 6px 8px; text-align: center; border-radius: 4px; }
    .kpi-label { font-size: 6.5pt; text-transform: uppercase; color: #64748B; font-weight: bold; }
    .kpi-val { font-size: 11pt; font-weight: 800; color: #0B111E; margin: 2px 0; font-family: monospace; }
    .kpi-sub { font-size: 6.2pt; color: #16A34A; font-weight: bold; }
    .badge { font-size: 6.5pt; font-weight: bold; padding: 2px 5px; border-radius: 3px; }
    .link-btn { font-size: 7pt; font-weight: bold; color: #1D4ED8; text-decoration: none; }
    .link-btn:hover { text-decoration: underline; }
    .docs-ul { font-size: 7.8pt; line-height: 1.6; list-style: none; padding-left: 0; }
    .alert-box { background: #FEF9C3; border: 1px solid #FDE047; border-left: 4px solid #EAB308; padding: 8px 12px; border-radius: 4px; font-size: 8pt; color: #713F12; margin-bottom: 12px; }
    @media print {
      body { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .sheet { box-shadow: none; padding: 10mm 15mm; width: 100%; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div>
    <div class="no-print">
      <span><b>Teia de Aranha</b> — Dossiê Cadastral e Birôs de Crédito</span>
      <button class="btn-print" onclick="window.print()">🖨️ IMPRIMIR / PDF</button>
    </div>
    <div class="sheet">
      <div class="header">
        <div>
          <div class="brand-title">TEIA DE ARANHA <span>•</span> DOSSIÊ DO CLIENTE</div>
          <div class="brand-sub">Sistema de Inteligência Cadastral & Pericial — Mourato & Associados</div>
        </div>
        <div class="doc-meta">
          <div><b>Data de Emissão:</b> ${new Date().toLocaleDateString('pt-BR')}</div>
          <div><b>Perfil:</b> ${isPj ? 'Pessoa Jurídica (PJ) — LIMA GÁS' : 'Pessoa Física (PF) — Titular'}</div>
        </div>
      </div>

      <div class="banner">
        <div>
          <h1>${titulo}</h1>
          <div style="font-size: 8pt; color: #CBD5E1;">Documento: <b>${documento}</b></div>
        </div>
        <div class="badge-tipo">${isPj ? 'PESSOA JURÍDICA' : 'PESSOA FÍSICA'}</div>
      </div>

      <div class="alert-box">
        <b>Status da Análise:</b> Cliente cadastrado com histórico de 14 anos na Receita Federal (Fundação: 15/03/2012). Score <b>800 de 1000</b> (Excelente) no relatório de birô extraído em 29/10/2026. <b>Nenhum protesto ou cheque sem fundos</b>.
      </div>

      <div class="section-title">1. Dados Cadastrais e Localização</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Razão Social / Nome:</b></td>
          <td style="width: 45%;"><b>${titulo}</b></td>
          <td style="width: 15%;"><b>${isPj ? 'CNPJ:' : 'CPF:'}</b></td>
          <td style="width: 20%; font-family: monospace;"><b>${documento}</b></td>
        </tr>
        <tr>
          <td><b>Fundação / CNAE:</b></td>
          <td>15/03/2012 • 4784-9/00 (Comércio Varejista de GLP)</td>
          <td><b>Natureza:</b></td>
          <td>213-5 Empresário Individual</td>
        </tr>
        <tr>
          <td><b>E-mail de Contato:</b></td>
          <td>dadaltofabricio2@gmail.com</td>
          <td><b>Telefones:</b></td>
          <td>(33) 3261-3399 / (33) 3261-2355</td>
        </tr>
        <tr>
          <td><b>Endereço Comercial (PJ):</b></td>
          <td colspan="3">Av. Getúlio Vargas, 2856 - Centro - Conselheiro Pena/MG - CEP: 35240-000</td>
        </tr>
        <tr>
          <td><b>Endereço Residencial (PF):</b></td>
          <td colspan="3">Rua São Paulo, 3020, Edifício Monte Aga, Ap 102 - Itapuã - Vila Velha/ES - CEP: 29101-512</td>
        </tr>
      </table>

      <div class="section-title">2. Relatórios de Birôs de Crédito & SCR BACEN (Posição Oficial)</div>
      <div class="kpi-row">
        ${scoresCards}
      </div>

      <div class="section-title">3. Cofre de Credenciais de Acesso aos Birôs e Portais Governamentais</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Portal / Birô</th>
            <th>Usuário / Chave</th>
            <th>Senha / PIN</th>
            <th>Status do Acesso</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${credsRows}
        </tbody>
      </table>

      <div class="section-title">4. Documentos Comprovatórios Anexados ao Dossiê</div>
      <ul class="docs-ul">
        ${docsList}
      </ul>

      <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #E2E8F0; font-size: 7pt; color: #64748B; display: flex; justify-content: space-between;">
        <span>Dossiê Auditado Teia de Aranha — Mourato & Associados</span>
        <span>Pronto para Verificação de Birôs em Tempo Real</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('=== CADASTRANDO NOVO CLIENTE: ADILSON DE ANDRADE LIMA (LIMA GÁS) ===');

  // 1. Atualizar banco central fichas_cadastrais_db.json
  const rawDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  let list = Array.isArray(rawDb) ? rawDb : Object.values(rawDb);
  
  // Remove se já existia teste anterior
  list = list.filter(c => (c.cpf_raw !== ADILSON_DATA.cpf_raw && c.nome_completo !== ADILSON_DATA.nome_completo));
  list.push(ADILSON_DATA);

  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2), 'utf8');
  console.log('✓ Gravado com sucesso em C:\\Projetos\\Empreas\\data\\fichas_cadastrais_db.json!');

  // 2. Coletar PDFs originais
  const pdfs = [];
  if (fs.existsSync(SOURCE_DIR)) {
    fs.readdirSync(SOURCE_DIR).forEach(f => {
      const src = path.join(SOURCE_DIR, f);
      if (fs.statSync(src).isFile()) {
        pdfs.push({ name: f, path: src, size: fs.statSync(src).size });
      }
    });
  }

  // 3. Criar e estruturar Pasta PJ oficial
  const dirPjAdilson = path.join(BASE_TEIA, 'ClientesPJ', 'ADILSON_DE_ANDRADE_LIMA_LIMA_GAS_15204314000183');
  const dirPjDocs = path.join(dirPjAdilson, 'documentos_pdf');
  fs.mkdirSync(dirPjDocs, { recursive: true });

  // Copia documentos para PJ
  pdfs.forEach(p => {
    fs.copyFileSync(p.path, path.join(dirPjDocs, p.name));
  });

  // Salva ficha_cadastral.json PJ
  fs.writeFileSync(path.join(dirPjAdilson, 'ficha_cadastral.json'), JSON.stringify(ADILSON_DATA.empresas_vinculadas[0], null, 2), 'utf8');
  // Salva credenciais_portais.json PJ
  fs.writeFileSync(path.join(dirPjAdilson, 'credenciais_portais.json'), JSON.stringify(ADILSON_DATA.credenciais, null, 2), 'utf8');
  // Salva scores_pj.json
  fs.writeFileSync(path.join(dirPjAdilson, 'scores_pj.json'), JSON.stringify(ADILSON_DATA.scores, null, 2), 'utf8');
  // Gera FICHA_CADASTRAL_E_SENHAS.html PJ
  const htmlPj = generateFichaHtml('PJ', ADILSON_DATA.empresas_vinculadas[0], ADILSON_DATA.credenciais, ADILSON_DATA.scores, [], pdfs);
  fs.writeFileSync(path.join(dirPjAdilson, 'FICHA_CADASTRAL_E_SENHAS.html'), htmlPj, 'utf8');
  console.log('✓ Dossiê PJ criado em ClientesPJ\\ADILSON_DE_ANDRADE_LIMA_LIMA_GAS_15204314000183');

  // 4. Criar e estruturar Pasta PF oficial
  const dirPfAdilson = path.join(BASE_TEIA, 'ClientesPF', 'ADILSON_DE_ANDRADE_LIMA_12829477880');
  const dirPfDocs = path.join(dirPfAdilson, 'documentos_pdf');
  fs.mkdirSync(dirPfDocs, { recursive: true });

  // Copia documentos para PF
  pdfs.forEach(p => {
    fs.copyFileSync(p.path, path.join(dirPfDocs, p.name));
  });

  // Salva ficha_cadastral.json PF
  fs.writeFileSync(path.join(dirPfAdilson, 'ficha_cadastral.json'), JSON.stringify(ADILSON_DATA, null, 2), 'utf8');
  // Salva credenciais_portais.json PF
  fs.writeFileSync(path.join(dirPfAdilson, 'credenciais_portais.json'), JSON.stringify(ADILSON_DATA.credenciais, null, 2), 'utf8');
  // Salva scores_bureaus.json PF
  fs.writeFileSync(path.join(dirPfAdilson, 'scores_bureaus.json'), JSON.stringify(ADILSON_DATA.scores, null, 2), 'utf8');
  // Gera FICHA_CADASTRAL_E_SENHAS.html PF
  const htmlPf = generateFichaHtml('PF', ADILSON_DATA, ADILSON_DATA.credenciais, ADILSON_DATA.scores, ADILSON_DATA.empresas_vinculadas, pdfs);
  fs.writeFileSync(path.join(dirPfAdilson, 'FICHA_CADASTRAL_E_SENHAS.html'), htmlPf, 'utf8');
  console.log('✓ Dossiê PF criado em ClientesPF\\ADILSON_DE_ANDRADE_LIMA_12829477880');

  console.log('\n=== CADASTRO E DOSSIÊS CONCLUÍDOS COM 100% DE SUCESSO! ===');
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
