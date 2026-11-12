import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const DB_PATH = 'C:\\Projetos\\Empreas\\data\\fichas_cadastrais_db.json';
const BASE_TEIA = 'C:\\Teia de arranha';
const SEAL_PATH = 'C:\\Teia de arranha\\Mourato.associados\\public\\mourato-seal-circle.png';

const sealBase64 = fs.readFileSync(SEAL_PATH).toString('base64');
const sealDataUri = `data:image/png;base64,${sealBase64}`;

// DADOS ESTRITAMENTE EXTRAÍDOS DOS RELATÓRIOS OFICIAIS (SEM ESTIMATIVAS OU SUPOSIÇÕES)
// Se não consta no relatório, o valor é "0" ou ""
const ADILSON_ESTRITO = {
  cpf_raw: "12829477880",
  cpf_formatado: "128.294.778-80",
  id_alias: "adilson_lima",
  nome_completo: "ADILSON DE ANDRADE LIMA",
  rg: "",
  orgao_expedidor: "",
  nascimento: "",
  profissao: "EMPRESARIO",
  estado_civil: "",
  nacionalidade: "",
  nome_mae: "",
  nome_pai: "",
  email_principal: "dadaltofabricio2@gmail.com",
  email_secundario: "",
  telefone_principal: "(33) 3261-3399",
  telefones_adicionais: ["(33) 3261-2355"],
  endereco_principal: "R SAO PAULO, 3020, EDIFICIO MONTE AGA, AP 102 - ITAPUA - VILA VELHA/ES",
  endereco_secundario: "AV. GETULIO VARGAS, 2856 - CENTRO - CONSELHEIRO PENA/MG",
  cep: "29101-512",
  tipo_perfil: "PJ / PF",
  rating_geral: "Score 800 (Crédito Light) / Score 570 (Crédito Total SCR)",
  observacoes: "Dados auditados 100% fiéis aos relatórios oficiais nº 891651 e 891658 de 29/10/2026. Zero pendências, zero protestos, zero cheques sem fundos.",
  created_at: new Date().toLocaleString('pt-BR'),
  updated_at: new Date().toLocaleString('pt-BR'),
  escolaridade: null,
  renda_declarada: 0,
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
      qualificacao: "EMPRESARIO INDIVIDUAL",
      capital_social: "0", // Não consta no relatório do birô
      cnae: "4784900 - COMERCIO VAREJISTA DE GAS LIQUEFEITO DE PETROLEO (GLP)",
      natureza_juridica: "2135 - EMPRESARIO INDIVIDUAL",
      regime_tributario: "",
      endereco: "AV. GETULIO VARGAS, 2856 - CENTRO - CONSELHEIRO PENA/MG - CEP: 35240-000",
      telefones: "(33) 3261-3399 / (33) 3261-2355",
      cargo_socio: "EMPRESARIO (100%)",
      score_serasa_pj: 800,
      score_credito_total: 570,
      cnd_status: "0",
      endividamento_scr: "0",
      pendencias_financeiras: 0,
      titulos_protestados: 0,
      cheques_sem_fundos: 0,
      recheque: 0,
      contumacia: 0
    }
  ],
  scores: [
    {
      id: 501,
      cliente_cpf: "12829477880",
      bureau: "SCORE CRÉDITO LIGHT PJ",
      score: "800",
      faixa: "Base I (Probabilidade Inadimplência: 12,79%)",
      data_atualizacao: "29/10/2026",
      detalhes: "Consulta nº 891658 em 29/10/2026 às 10:58. Chance de pagamento de 87,21% em 6 meses."
    },
    {
      id: 502,
      cliente_cpf: "12829477880",
      bureau: "SCORE CRÉDITO TOTAL + SCR",
      score: "570",
      faixa: "Base I (Probabilidade Inadimplência: 41,75%)",
      data_atualizacao: "29/10/2026",
      detalhes: "Consulta nº 891651 em 29/10/2026 às 10:54. Chance de pagamento de 59,25% em 6 meses."
    }
  ],
  ocorrencias_negativas: {
    pendencias_financeiras_base_1: 0,
    pendencias_financeiras_base_2: 0,
    titulos_protestados_analitico: 0,
    titulos_protestados_sintetico: 0,
    cheques_sem_fundos_bacen: 0,
    cheques_sem_fundos_varejo: 0,
    contumacia: 0,
    recheque: 0,
    operacoes_scr_bacen: 0
  },
  credenciais: [
    {
      id: 601,
      cliente_cpf: "12829477880",
      portal: "Receita Federal / Simples Nacional",
      usuario: "15.204.314/0001-83",
      senha: "0",
      pin: "0",
      metodo_preferencial: "PENDENTE",
      url_acesso: "https://www8.receita.fazenda.gov.br/simplesnacional",
      status: "PENDENTE",
      observacoes: "Sem credencial informada"
    },
    {
      id: 602,
      cliente_cpf: "12829477880",
      portal: "Bacen Registrato (SCR / CCS)",
      usuario: "128.294.778-80",
      senha: "0",
      pin: "0",
      metodo_preferencial: "GOV.BR",
      url_acesso: "https://registrato.bcb.gov.br",
      status: "PENDENTE",
      observacoes: "Sem credencial informada"
    },
    {
      id: 603,
      cliente_cpf: "12829477880",
      portal: "Serasa Experian PJ",
      usuario: "15.204.314/0001-83",
      senha: "0",
      pin: "0",
      metodo_preferencial: "SENHA",
      url_acesso: "https://www.serasa.com.br",
      status: "PENDENTE",
      observacoes: "Sem credencial informada"
    },
    {
      id: 604,
      cliente_cpf: "12829477880",
      portal: "Quod PJ / PF",
      usuario: "12829477880",
      senha: "0",
      pin: "0",
      metodo_preferencial: "SENHA",
      url_acesso: "https://consumidor.quod.com.br",
      status: "PENDENTE",
      observacoes: "Sem credencial informada"
    }
  ]
};

function generateFichaHtml(tipo, data, credenciais, scores, vinculos, ocorrencias, documentos) {
  const isPj = tipo === 'PJ';
  const titulo = isPj ? (data.razao_social + ' (' + (data.nome_fantasia || 'LIMA GÁS') + ')') : data.nome_completo;
  const documento = isPj ? (data.cnpj_formatado || data.cnpj_raw) : data.cpf_formatado;

  const credsRows = credenciais.map(c => `
    <tr>
      <td><b>${c.portal}</b></td>
      <td><code>${c.usuario || '0'}</code></td>
      <td style="color: #64748B; font-family: monospace;">${c.senha === '0' ? '0 (Não informada)' : c.senha}</td>
      <td><span class="badge" style="background:#F1F5F9; color:#64748B;">${c.status}</span></td>
      <td>${c.url_acesso ? `<a href="${c.url_acesso}" target="_blank" class="link-btn">Acessar Portal ↗</a>` : '0'}</td>
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
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    body { background: #0F172A; color: #1E293B; padding: 2rem 1rem; display: flex; justify-content: center; }
    .sheet { width: 210mm; min-height: 297mm; background: #FFFFFF; padding: 18mm 20mm; box-shadow: 0 10px 40px rgba(0,0,0,0.5); position: relative; overflow: hidden; z-index: 1; }
    .watermark-mourato {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 140mm;
      height: 140mm;
      background-image: url('${sealDataUri}');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.055;
      pointer-events: none;
      z-index: 0;
    }
    .sheet-content { position: relative; z-index: 2; }
    .no-print { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: #1E293B; padding: 0.75rem 1.25rem; border-radius: 6px; color: #fff; width: 210mm; }
    .btn-print { background: linear-gradient(135deg, #D4AF37, #996515); color: #000; font-weight: bold; border: none; padding: 0.5rem 1.2rem; border-radius: 4px; cursor: pointer; }
    
    .doc-header-institutional {
      border-bottom: 2px solid #C5A869;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-logo-crest { width: 52px; height: 52px; object-fit: contain; flex-shrink: 0; }
    .brand-text-block { display: flex; flex-direction: column; }
    .brand-main-name { font-size: 14pt; font-weight: 800; color: #0B111E; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.1; }
    .brand-main-name span { color: #C5A869; }
    .brand-main-sub { font-size: 6.8pt; font-weight: 700; color: #876223; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 3px; }
    .brand-main-meta { font-size: 6.2pt; color: #64748B; margin-top: 2px; }

    .banner { background: #0B111E; color: #FFFFFF; padding: 10px 14px; border-radius: 4px; border-left: 4px solid #C5A869; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .banner h1 { font-size: 11pt; font-weight: bold; }
    .badge-tipo { background: rgba(197, 168, 105, 0.25); color: #F5DF98; font-size: 7.5pt; font-weight: bold; padding: 3px 8px; border-radius: 4px; border: 1px solid #C5A869; }
    .section-title { font-size: 9pt; font-weight: 800; color: #0B111E; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px; margin: 14px 0 8px 0; text-transform: uppercase; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 12px; }
    .data-table th { background: #F1F5F9; color: #0B111E; text-align: left; padding: 5px 8px; border: 1px solid #E2E8F0; font-size: 7pt; text-transform: uppercase; }
    .data-table td { padding: 5px 8px; border: 1px solid #E2E8F0; }
    .data-table tr:nth-child(even) td { background: #F8FAFC; }
    .kpi-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
    .kpi-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-top: 2px solid #C5A869; padding: 8px 10px; text-align: center; border-radius: 4px; }
    .kpi-label { font-size: 6.8pt; text-transform: uppercase; color: #64748B; font-weight: bold; }
    .kpi-val { font-size: 13pt; font-weight: 800; color: #0B111E; margin: 2px 0; font-family: monospace; }
    .kpi-sub { font-size: 6.5pt; color: #16A34A; font-weight: bold; }
    .badge { font-size: 6.5pt; font-weight: bold; padding: 2px 5px; border-radius: 3px; }
    .link-btn { font-size: 7pt; font-weight: bold; color: #1D4ED8; text-decoration: none; }
    .docs-ul { font-size: 7.8pt; line-height: 1.6; list-style: none; padding-left: 0; }
    .audit-note { background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #16A34A; padding: 8px 12px; border-radius: 4px; font-size: 7.5pt; color: #334155; margin-bottom: 12px; }
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
      <span><b>Mourato & Associados</b> — Dossiê Cadastral Auditado (Fidelidade Real de Dados)</span>
      <button class="btn-print" onclick="window.print()">🖨️ IMPRIMIR / PDF</button>
    </div>
    <div class="sheet">
      <div class="watermark-mourato"></div>
      <div class="sheet-content">
        <div class="doc-header-institutional">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${sealDataUri}" class="brand-logo-crest" alt="Brasão Oficial Mourato & Associados">
            <div class="brand-text-block">
              <div class="brand-main-name">MOURATO <span>&</span> ASSOCIADOS</div>
              <div class="brand-main-sub">ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA</div>
              <div class="brand-main-meta">CNPJ: 38.377.738/0001-45 • SÃO PAULO - SP • AV. SÃO LUÍS, 187</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 7.5pt; color: #64748B; line-height: 1.4;">
            <div><b>TEIA DE ARANHA</b></div>
            <div>Dossiê de Fidelidade Real</div>
            <div>Zero Dados Inventados</div>
          </div>
        </div>

        <div class="banner">
          <div>
            <h1>${titulo}</h1>
            <div style="font-size: 8pt; color: #CBD5E1;">Documento: <b>${documento}</b></div>
          </div>
          <div class="badge-tipo">${isPj ? 'PESSOA JURÍDICA' : 'PESSOA FÍSICA'}</div>
        </div>

        <div class="audit-note">
          <b>Princípio de Fidelidade Real:</b> Dados auditados com base exclusiva nos relatórios oficiais nº 891651 e nº 891658 emitidos em 29/10/2026. Campos sem comprovação documental registrada permanecem estritamente assinalados como <b>0</b>.
        </div>

        <div class="section-title">1. Dados Cadastrais Auditados</div>
        <table class="data-table">
          <tr>
            <td style="width: 20%;"><b>Razão Social / Nome:</b></td>
            <td style="width: 45%;"><b>${titulo}</b></td>
            <td style="width: 15%;"><b>${isPj ? 'CNPJ:' : 'CPF:'}</b></td>
            <td style="width: 20%; font-family: monospace;"><b>${documento}</b></td>
          </tr>
          <tr>
            <td><b>Fundação / CNAE:</b></td>
            <td>15/03/2012 • 4784900 (Comércio Varejista de GLP)</td>
            <td><b>Natureza:</b></td>
            <td>2135 - EMPRESARIO INDIVIDUAL</td>
          </tr>
          <tr>
            <td><b>Capital Social:</b></td>
            <td><b>0</b> (Não informado em relatório)</td>
            <td><b>Participação:</b></td>
            <td>100% (Empresário Individual)</td>
          </tr>
          <tr>
            <td><b>E-mail Registrado:</b></td>
            <td>${data.email_principal || '0'}</td>
            <td><b>Telefones:</b></td>
            <td>${data.telefones || '(33) 3261-3399 / (33) 3261-2355'}</td>
          </tr>
          <tr>
            <td><b>Endereço PJ (Empresa):</b></td>
            <td colspan="3">AV. GETULIO VARGAS, 2856 - CENTRO - CONSELHEIRO PENA/MG - CEP: 35240-000</td>
          </tr>
          <tr>
            <td><b>Endereço PF (Titular):</b></td>
            <td colspan="3">R SAO PAULO, 3020, EDIFICIO MONTE AGA, AP 102 - ITAPUA - VILA VELHA/ES - CEP: 29101-512</td>
          </tr>
        </table>

        <div class="section-title">2. Scores Auditados em Relatórios Oficiais (29/10/2026)</div>
        <div class="kpi-row">
          ${scoresCards}
        </div>

        <div class="section-title">3. Ocorrências e Restrições Registradas nos Birôs (Relatórios nº 891651 e 891658)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Base de Consulta</th>
              <th>Status do Relatório</th>
              <th>Quantidade</th>
              <th>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Pendências Financeiras (Base I e II)</b></td>
              <td>NENHUM REGISTRO ENCONTRADO (NADA CONSTA)</td>
              <td style="font-family: monospace; font-weight: bold;">0</td>
              <td style="font-family: monospace;">R$ 0,00</td>
            </tr>
            <tr>
              <td><b>Títulos Protestados (Analítico e Sintético)</b></td>
              <td>NENHUM REGISTRO ENCONTRADO (NADA CONSTA)</td>
              <td style="font-family: monospace; font-weight: bold;">0</td>
              <td style="font-family: monospace;">R$ 0,00</td>
            </tr>
            <tr>
              <td><b>Cheques sem Fundos BACEN (CCF) e Varejo</b></td>
              <td>NENHUM REGISTRO ENCONTRADO (NADA CONSTA)</td>
              <td style="font-family: monospace; font-weight: bold;">0</td>
              <td style="font-family: monospace;">R$ 0,00</td>
            </tr>
            <tr>
              <td><b>Contumácia e Recheque</b></td>
              <td>NENHUM REGISTRO ENCONTRADO (NADA CONSTA)</td>
              <td style="font-family: monospace; font-weight: bold;">0</td>
              <td style="font-family: monospace;">R$ 0,00</td>
            </tr>
            <tr>
              <td><b>Operações Irregulares SCR Banco Central</b></td>
              <td>NÃO EXISTE NENHUMA OPERAÇÃO NO PERÍODO</td>
              <td style="font-family: monospace; font-weight: bold;">0</td>
              <td style="font-family: monospace;">R$ 0,00</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">4. Senhas e Acessos a Portais (Pendente Coleta)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Portal / Birô</th>
              <th>Usuário / Chave</th>
              <th>Senha / PIN</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${credsRows}
          </tbody>
        </table>

        <div class="section-title">5. Documentos Comprovatórios Anexados</div>
        <ul class="docs-ul">
          ${docsList}
        </ul>

        <div style="margin-top: 20px; padding-top: 8px; border-top: 1px solid #E2E8F0; font-size: 7pt; color: #64748B; display: flex; justify-content: space-between;">
          <span>Mourato & Associados — Governança e Integridade de Dados</span>
          <span>Certificação Oficial de Auditoria Cadastral</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function correctData() {
  console.log('=== APLICANDO REGRA ESTRITA DE FIDELIDADE DE DADOS (SEM DADOS INVENTADOS) ===');

  // 1. Atualizar banco central
  const rawDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  let list = Array.isArray(rawDb) ? rawDb : Object.values(rawDb);
  list = list.filter(c => c.cpf_raw !== ADILSON_ESTRITO.cpf_raw && c.nome_completo !== ADILSON_ESTRITO.nome_completo);
  list.push(ADILSON_ESTRITO);
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2), 'utf8');
  console.log('✓ Banco central C:\\Projetos\\Empreas\\data\\fichas_cadastrais_db.json corrigido.');

  // 2. Atualizar arquivos locais na pasta PJ
  const pjDir = path.join(BASE_TEIA, 'ClientesPJ', 'ADILSON_DE_ANDRADE_LIMA_LIMA_GAS_15204314000183');
  const docsDirPj = path.join(pjDir, 'documentos_pdf');
  const pdfs = [];
  if (fs.existsSync(docsDirPj)) {
    fs.readdirSync(docsDirPj).forEach(f => {
      const p = path.join(docsDirPj, f);
      if (fs.statSync(p).isFile()) pdfs.push({ name: f, size: fs.statSync(p).size });
    });
  }

  fs.writeFileSync(path.join(pjDir, 'ficha_cadastral.json'), JSON.stringify(ADILSON_ESTRITO.empresas_vinculadas[0], null, 2), 'utf8');
  fs.writeFileSync(path.join(pjDir, 'credenciais_portais.json'), JSON.stringify(ADILSON_ESTRITO.credenciais, null, 2), 'utf8');
  fs.writeFileSync(path.join(pjDir, 'scores_pj.json'), JSON.stringify(ADILSON_ESTRITO.scores, null, 2), 'utf8');
  const htmlPj = generateFichaHtml('PJ', ADILSON_ESTRITO.empresas_vinculadas[0], ADILSON_ESTRITO.credenciais, ADILSON_ESTRITO.scores, [], ADILSON_ESTRITO.ocorrencias_negativas, pdfs);
  fs.writeFileSync(path.join(pjDir, 'FICHA_CADASTRAL_E_SENHAS.html'), htmlPj, 'utf8');

  // 3. Atualizar arquivos locais na pasta PF
  const pfDir = path.join(BASE_TEIA, 'ClientesPF', 'ADILSON_DE_ANDRADE_LIMA_12829477880');
  fs.writeFileSync(path.join(pfDir, 'ficha_cadastral.json'), JSON.stringify(ADILSON_ESTRITO, null, 2), 'utf8');
  fs.writeFileSync(path.join(pfDir, 'credenciais_portais.json'), JSON.stringify(ADILSON_ESTRITO.credenciais, null, 2), 'utf8');
  fs.writeFileSync(path.join(pfDir, 'scores_bureaus.json'), JSON.stringify(ADILSON_ESTRITO.scores, null, 2), 'utf8');
  const htmlPf = generateFichaHtml('PF', ADILSON_ESTRITO, ADILSON_ESTRITO.credenciais, ADILSON_ESTRITO.scores, ADILSON_ESTRITO.empresas_vinculadas, ADILSON_ESTRITO.ocorrencias_negativas, pdfs);
  fs.writeFileSync(path.join(pfDir, 'FICHA_CADASTRAL_E_SENHAS.html'), htmlPf, 'utf8');

  // 4. Regerar os PDFs com Playwright
  console.log('--- Regerando PDFs com Cabeçalho e Marca d\'Água ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  
  // PDF PJ
  await page.goto('file:///' + path.join(pjDir, 'FICHA_CADASTRAL_E_SENHAS.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.pdf({ path: path.join(pjDir, 'FICHA_CADASTRAL_E_SENHAS.pdf'), format: 'A4', printBackground: true, margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' } });
  console.log('✓ PDF PJ gerado:', path.join(pjDir, 'FICHA_CADASTRAL_E_SENHAS.pdf'));

  // PDF PF
  await page.goto('file:///' + path.join(pfDir, 'FICHA_CADASTRAL_E_SENHAS.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.pdf({ path: path.join(pfDir, 'FICHA_CADASTRAL_E_SENHAS.pdf'), format: 'A4', printBackground: true, margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' } });
  console.log('✓ PDF PF gerado:', path.join(pfDir, 'FICHA_CADASTRAL_E_SENHAS.pdf'));

  await browser.close();
  console.log('=== CORREÇÃO E COMPILAÇÃO CONCLUÍDAS COM SUCESSO! ===');
}

correctData().catch(console.error);
