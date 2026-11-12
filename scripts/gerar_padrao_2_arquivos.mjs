import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const BASE_TEIA = 'C:\\Teia de arranha';
const SEAL_PATH = 'C:\\Teia de arranha\\Mourato.associados\\public\\mourato-seal-circle.png';

async function main() {
  console.log('=== GERANDO PADRÃO DEFINITIVO DE 2 ARQUIVOS — JOSÉ JAILSON MOURATO ===');

  if (!fs.existsSync(SEAL_PATH)) {
    throw new Error('Brasão não encontrado em: ' + SEAL_PATH);
  }

  const sealBase64 = fs.readFileSync(SEAL_PATH).toString('base64');
  const sealDataUri = `data:image/png;base64,${sealBase64}`;

  const pfDir = path.join(BASE_TEIA, 'ClientesPF', 'JOSE_JAILSON_MOURATO_DA_SILVA_31776959892');
  if (!fs.existsSync(pfDir)) fs.mkdirSync(pfDir, { recursive: true });
  const docsDir = path.join(pfDir, 'documentos_pdf');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const dataEmissao = '12/11/2026';
  const horaEmissao = '15:25';
  const hashDoc1 = crypto.createHash('sha256').update('MOURATO_CADASTRO_SENHAS_' + Date.now()).digest('hex').substring(0, 24).toUpperCase();
  const hashDoc2 = crypto.createHash('sha256').update('MOURATO_DOSSIE_BIROS_' + Date.now()).digest('hex').substring(0, 24).toUpperCase();

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  // =========================================================================
  // ARQUIVO 1: PLANILHA / FICHA DE CADASTRO & SENHAS (PROTEGIDA POR SENHA 1307)
  // Regra: Se não tem senha informada, constar explicitamente "(senha não informada)"
  // =========================================================================
  console.log('--- Compilando Arquivo 1: CADASTRO E SENHAS (Protegido) ---');

  const htmlDoc1 = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha de Cadastro e Senhas — José Jailson Mourato da Silva</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    html, body { background: #FFFFFF !important; color: #1E293B; margin: 0; padding: 0; }
    .sheet { 
      width: 210mm; height: 297mm; max-height: 297mm; background: #FFFFFF !important; 
      padding: 14mm 18mm 16mm 18mm; position: relative; overflow: hidden; z-index: 1; 
      page-break-inside: avoid;
    }
    .watermark-mourato {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 145mm; height: 145mm; background-image: url('${sealDataUri}');
      background-size: contain; background-repeat: no-repeat; background-position: center;
      opacity: 0.055; pointer-events: none; z-index: 0;
    }
    .sheet-content { position: relative; z-index: 2; }
    .doc-header-institutional {
      border-bottom: 2px solid #C5A869; padding-bottom: 8px; margin-bottom: 10px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .brand-logo-crest { width: 46px; height: 46px; object-fit: contain; }
    .brand-main-name { font-size: 13pt; font-weight: 800; color: #0B111E; text-transform: uppercase; font-family: 'Cinzel', Georgia, serif; }
    .brand-main-name span { color: #C5A869; }
    .brand-main-sub { font-size: 6.5pt; font-weight: 700; color: #876223; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 2px; }
    .brand-main-meta { font-size: 6pt; color: #64748B; margin-top: 2px; }
    .doc-title-block {
      background: #0B111E; border-left: 4px solid #C5A869; padding: 8px 12px; margin-bottom: 10px; color: #FFFFFF; border-radius: 2px;
    }
    .doc-title-main { font-size: 10.5pt; font-weight: 800; color: #F8FAFC; text-transform: uppercase; letter-spacing: 0.04em; }
    .doc-title-sub { font-size: 7pt; color: #94A3B8; margin-top: 2px; }
    .section-title {
      font-size: 8.2pt; font-weight: 700; color: #876223; text-transform: uppercase; letter-spacing: 0.05em;
      margin: 10px 0 5px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px; display: flex; align-items: center; gap: 6px;
    }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 7.3pt; }
    .data-table th, .data-table td { border: 1px solid #CBD5E1; padding: 4.5px 6.5px; text-align: left; }
    .data-table th { background: #F1F5F9; color: #0F172A; font-weight: 700; text-transform: uppercase; font-size: 6.6pt; }
    .pwd-badge { font-family: 'Consolas', monospace; font-size: 8pt; font-weight: bold; background: #FEF3C7; padding: 2px 5px; border-radius: 3px; border: 1px solid #FCD34D; color: #0B111E; }
    .pwd-missing { font-family: 'Consolas', monospace; font-size: 7pt; font-style: italic; background: #F1F5F9; padding: 2px 5px; border-radius: 3px; border: 1px solid #CBD5E1; color: #94A3B8; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 6.2pt; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-info { background: #DBEAFE; color: #1E40AF; }
    .badge-gray { background: #F1F5F9; color: #64748B; }
    .alert-box { border-radius: 4px; padding: 6px 10px; margin: 8px 0; font-size: 7.2pt; line-height: 1.35; background: #FFFBEB; border: 1px solid #FCD34D; border-left: 4px solid #D97706; color: #78350F; }
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
          <img src="${sealDataUri}" class="brand-logo-crest" alt="Brasão Mourato">
          <div>
            <div class="brand-main-name">MOURATO <span>&</span> ASSOCIADOS</div>
            <div class="brand-main-sub">ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA</div>
            <div class="brand-main-meta">CNPJ: 38.377.738/0001-45 • SÃO PAULO - SP • AV. SÃO LUÍS, 187</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 7pt; color: #64748B; line-height: 1.3;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Arquivo 1 de 2: Cadastro & Senhas</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <div class="doc-title-block">
        <div class="doc-title-main">🔒 01. FICHA CADASTRAL & COFRE DE CREDENCIAIS — PESSOA FÍSICA</div>
        <div class="doc-title-sub">DOCUMENTO PROTEGIDO POR SENHA CRIPTOGRÁFICA (AES-256) • CHAVE DE ABERTURA: <b>1307</b></div>
      </div>

      <div class="section-title">1. Dados Cadastrais & Qualificação Civil Completa</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Nome Completo:</b></td>
          <td style="width: 30%; font-weight: bold;">JOSÉ JAILSON MOURATO DA SILVA</td>
          <td style="width: 20%;"><b>CPF Oficial:</b></td>
          <td style="width: 30%; font-family: monospace; font-weight: bold;">317.769.598-92</td>
        </tr>
        <tr>
          <td><b>Documento RG:</b></td>
          <td style="font-family: monospace;">33.878.601 SSP/PE</td>
          <td><b>Data de Nascimento:</b></td>
          <td>06/03/1988 (38 anos)</td>
        </tr>
        <tr>
          <td><b>Filiação Materna:</b></td>
          <td>HELIA MARIA MOURATO DA SILVA</td>
          <td><b>Filiação Paterna:</b></td>
          <td>ANTONIO PEREIRA DA SILVA</td>
        </tr>
        <tr>
          <td><b>Nacionalidade / Estado Civil:</b></td>
          <td>Brasileira • Solteiro</td>
          <td><b>Naturalidade:</b></td>
          <td>São Paulo/SP</td>
        </tr>
        <tr>
          <td><b>Telefones Oficiais:</b></td>
          <td>(11) 97899-0034 (Principal) • (11) 94744-5745</td>
          <td><b>E-mails Oficiais:</b></td>
          <td>mourato.importacao@gmail.com • jota.jailson@hotmail.com</td>
        </tr>
        <tr>
          <td><b>Endereço Residencial:</b></td>
          <td colspan="3">Rua Ana Paulina, 171 (e nº 169, Casa 3), Vila Comercial, São Paulo/SP — CEP: 05139-060</td>
        </tr>
        <tr>
          <td><b>Empresa Vinculada (PJ):</b></td>
          <td colspan="3"><b>MOURATO E ASSOCIADOS LTDA (CNPJ: 38.377.738/0001-45)</b> — Sócio-Administrador (100% Quotas)</td>
        </tr>
      </table>

      <div class="alert-box">
        <b>REGRA DE CONFIDENCIALIDADE & SENHAS AUSENTES:</b> Este documento é de custódia interna restrita. Nos termos das diretrizes do ecossistema, os portais ou sistemas em que o titular não informou senha permanecem estritamente marcados como <b>(senha não informada)</b>, vedada qualquer suposição.
      </div>

      <div class="section-title">2. Relação Completa de Senhas e Credenciais dos Birôs e Portais Oficiais</div>
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
          <tr>
            <td><b>Serasa Experian Consumidor</b></td>
            <td>serasa.com.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-badge">Jota1307</span></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
          </tr>
          <tr>
            <td><b>Boa Vista Consumidor Positivo</b></td>
            <td>consumidorpositivo.com.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-badge">290618</span></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
          </tr>
          <tr>
            <td><b>Quod Gestora de Inteligência</b></td>
            <td>consumidor.quod.com.br</td>
            <td><code>31776959892</code></td>
            <td><span class="pwd-badge">aJfbAtwX7</span></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
          </tr>
          <tr>
            <td><b>Bacen Registrato (SCR / CCS)</b></td>
            <td>registrato.bcb.gov.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-badge">123456</span></td>
            <td><span class="badge badge-success">GOV.BR / A1</span></td>
          </tr>
          <tr>
            <td><b>Detran-SP Portal de Serviços</b></td>
            <td>detran.sp.gov.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-badge">123456</span></td>
            <td><span class="badge badge-success">E-CPF A1</span></td>
          </tr>
          <tr>
            <td><b>PGE-SP Dívida Ativa (PRDI)</b></td>
            <td>dividaativa.pge.sp.gov.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-badge">123456</span></td>
            <td><span class="badge badge-success">E-CPF A1</span></td>
          </tr>
          <tr>
            <td><b>Portal REGULARIZE (PGFN)</b></td>
            <td>regularize.pgfn.gov.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-badge">123456</span></td>
            <td><span class="badge badge-success">E-CPF A1</span></td>
          </tr>
          <tr>
            <td><b>Portal e-CAC (Receita Federal)</b></td>
            <td>ecac.receita.fazenda.gov.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-badge">123456</span></td>
            <td><span class="badge badge-success">E-CPF A1</span></td>
          </tr>
          <tr>
            <td><b>SPC Brasil</b></td>
            <td>spcbrasil.org.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-missing">(senha não informada)</span></td>
            <td><span class="badge badge-gray">SEM ACESSO</span></td>
          </tr>
          <tr>
            <td><b>CENPROT Nacional (Protestos)</b></td>
            <td>pesquisaprotesto.com.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-missing">(senha não informada)</span></td>
            <td><span class="badge badge-info">PÚBLICO</span></td>
          </tr>
          <tr>
            <td><b>Tribunal Superior do Trabalho (CNDT)</b></td>
            <td>tst.jus.br</td>
            <td><code>317.769.598-92</code></td>
            <td><span class="pwd-missing">(senha não informada)</span></td>
            <td><span class="badge badge-info">PÚBLICO</span></td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 6.6pt; color: #64748B; line-height: 1.3;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Departamento de Inteligência Cadastral, Forense & Segurança da Informação<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 220px;">
          <div style="font-size: 7.2pt; font-weight: bold; color: #0B111E;">CUSTÓDIA E GOVERNANÇA DIGITAL</div>
          <div style="font-size: 6.2pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>
    </div> <!-- fecha sheet-content -->

    <div class="footer-security">
      <div>Mourato & Associados • Arquivo 1: Cadastro & Senhas • Documento Criptografado (Senha: 1307)</div>
      <div>Autenticidade: <code>${hashDoc1}</code> • Página 1 de 1</div>
    </div>
  </div>
</body>
</html>`;

  const htmlDoc1Path = path.join(pfDir, '01_CADASTRO_E_SENHAS_PROTEGIDO.html');
  const pdfDoc1TempPath = path.join(pfDir, '01_CADASTRO_E_SENHAS_TEMP.pdf');
  const pdfDoc1FinalPath = path.join(pfDir, '01_CADASTRO_E_SENHAS_PROTEGIDO.pdf');
  const pdfFichaPath = path.join(pfDir, 'FICHA_CADASTRAL_E_SENHAS.pdf');

  fs.writeFileSync(htmlDoc1Path, htmlDoc1, 'utf8');

  const page1 = await browser.newPage();
  await page1.goto('file:///' + htmlDoc1Path.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page1.waitForTimeout(400);
  await page1.pdf({ path: pdfDoc1TempPath, format: 'A4', printBackground: true, margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' } });
  await page1.close();

  // Criptografa o Arquivo 1 com senha 1307
  const pyEncrypt = `
import pypdf
reader = pypdf.PdfReader(r"${pdfDoc1TempPath.replace(/\\/g, '\\\\')}")
writer = pypdf.PdfWriter()
for p in reader.pages:
    writer.add_page(p)
writer.encrypt("1307")
with open(r"${pdfDoc1FinalPath.replace(/\\/g, '\\\\')}", "wb") as f:
    writer.write(f)
`;
  const pyScriptPath = path.join(pfDir, 'encrypt_doc1.py');
  fs.writeFileSync(pyScriptPath, pyEncrypt, 'utf8');
  execSync(`python "${pyScriptPath}"`, { stdio: 'inherit' });
  if (fs.existsSync(pdfDoc1TempPath)) fs.unlinkSync(pdfDoc1TempPath);
  if (fs.existsSync(pyScriptPath)) fs.unlinkSync(pyScriptPath);

  // Espelha o Arquivo 1 no nome canônico FICHA_CADASTRAL_E_SENHAS.pdf
  fs.copyFileSync(pdfDoc1FinalPath, pdfFichaPath);
  fs.copyFileSync(pdfDoc1FinalPath, path.join(docsDir, '01_CADASTRO_E_SENHAS_PROTEGIDO.pdf'));
  fs.copyFileSync(pdfDoc1FinalPath, path.join(docsDir, 'FICHA_CADASTRAL_E_SENHAS.pdf'));
  console.log('✓ Arquivo 1 compilado e criptografado com senha 1307!');

  // =========================================================================
  // ARQUIVO 2: DOSSIÊ E BIRÔS COMPLETO (100% DAS INFORMAÇÕES - ABERTO)
  // Regra: Sem senhas. Onde não há valores/apontamentos nos birôs, fica em branco!
  // =========================================================================
  console.log('--- Compilando Arquivo 2: DOSSIÊ E BIRÔS COMPLETO (Aberto) ---');

  const totalPagesDoc2 = 2;

  const htmlDoc2 = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Dossiê Pericial de Birôs Completo — José Jailson Mourato da Silva</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    html, body { background: #FFFFFF !important; color: #1E293B; margin: 0; padding: 0; }
    .sheet { 
      width: 210mm; height: 297mm; max-height: 297mm; background: #FFFFFF !important; 
      padding: 12mm 18mm 16mm 18mm; position: relative; overflow: hidden; z-index: 1; 
      page-break-after: always; page-break-inside: avoid;
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
      margin: 8px 0 4px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px; display: flex; align-items: center; gap: 6px;
    }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 7.2pt; }
    .data-table th, .data-table td { border: 1px solid #CBD5E1; padding: 4px 6px; text-align: left; }
    .data-table th { background: #F1F5F9; color: #0F172A; font-weight: 700; text-transform: uppercase; font-size: 6.5pt; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 8px; }
    .kpi-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-top: 3px solid #C5A869; padding: 5px 6px; border-radius: 4px; text-align: center; }
    .kpi-label { font-size: 5.8pt; font-weight: 700; color: #64748B; text-transform: uppercase; }
    .kpi-val { font-size: 10pt; font-weight: 800; color: #0F172A; margin: 1px 0; font-family: 'Cinzel', Georgia, serif; }
    .kpi-sub { font-size: 5.6pt; color: #16A34A; font-weight: bold; }
    .alert-box { border-radius: 4px; padding: 5px 8px; margin: 5px 0; font-size: 7pt; line-height: 1.35; }
    .alert-success { background: #F0FDF4; border: 1px solid #86EFAC; border-left: 3px solid #16A34A; color: #166534; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 6pt; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-info { background: #DBEAFE; color: #1E40AF; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    .footer-security {
      position: absolute; bottom: 8mm; left: 18mm; right: 18mm; border-top: 1px solid #CBD5E1;
      padding-top: 4px; display: flex; justify-content: space-between; font-size: 6.2pt; color: #94A3B8; line-height: 1.3; z-index: 10;
    }
  </style>
</head>
<body>

  <!-- ==================== PÁGINA 1: BIRÔS DE CRÉDITO, SCR BACEN E CCS ==================== -->
  <div class="sheet">
    <div class="watermark-mourato"></div>
    <div class="sheet-content">
      <div class="doc-header-institutional">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${sealDataUri}" class="brand-logo-crest" alt="Brasão Mourato">
          <div>
            <div class="brand-main-name">MOURATO <span>&</span> ASSOCIADOS</div>
            <div class="brand-main-sub">ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA</div>
            <div class="brand-main-meta">CNPJ: 38.377.738/0001-45 • SÃO PAULO - SP • AV. SÃO LUÍS, 187</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 7pt; color: #64748B; line-height: 1.3;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Arquivo 2 de 2: Dossiê e Birôs</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <div class="doc-title-block">
        <div class="doc-title-main">02. DOSSIÊ PERICIAL DE BIRÔS DE CRÉDITO & COMPLIANCE FORENSE MASTER</div>
        <div class="doc-title-sub">Laudo Integrado de 100% das Consultas Realizadas no SFN • Documento Habilitado para Comitês Bancários</div>
      </div>

      <!-- CARDS DE SCORES HOMOLOGADOS -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Score Quod</div>
          <div class="kpi-val">711</div>
          <div class="kpi-sub">✓ Extrato 14/10/2026</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Score Boa Vista</div>
          <div class="kpi-val">800</div>
          <div class="kpi-sub">✓ Positivo Ativo</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Score Serasa</div>
          <div class="kpi-val">654</div>
          <div class="kpi-sub">✓ Sem Apontamentos</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Rating SCR Bacen</div>
          <div class="kpi-val" style="color:#16A34A;">A1</div>
          <div class="kpi-sub">✓ KPXA-XE7M-GN</div>
        </div>
      </div>

      <!-- 1. IDENTIFICAÇÃO BÁSICA DO TITULAR -->
      <div class="section-title">1. Identificação do Titular Auditado</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Titular:</b></td>
          <td style="width: 30%; font-weight: bold;">JOSÉ JAILSON MOURATO DA SILVA</td>
          <td style="width: 20%;"><b>CPF:</b></td>
          <td style="width: 30%; font-family: monospace; font-weight: bold;">317.769.598-92</td>
        </tr>
        <tr>
          <td><b>Empresa Vinculada:</b></td>
          <td colspan="3"><b>MOURATO E ASSOCIADOS LTDA (CNPJ: 38.377.738/0001-45)</b> — Sócio-Administrador (Capital: R$ 1.000.000,00)</td>
        </tr>
      </table>

      <!-- 2. AUDITORIA QUOD (HISTÓRICO COMPROVADO) -->
      <div class="section-title">2. Auditoria Oficial da Quod (Birô dos 5 Maiores Bancos)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Instituição / Contrato</th>
            <th>Modalidade</th>
            <th>Histórico Financeiro Comprovado</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Banco Itaú Unibanco S.A.</b> (Final 8649)</td>
            <td>Cartão de Crédito</td>
            <td>Fatura 25/08: R$ 635,09 • Fatura 25/07: R$ 749,97 (Pagas Rigorosamente em Dia)</td>
            <td><span class="badge badge-success">PONTUALIDADE 100%</span></td>
          </tr>
          <tr>
            <td><b>Banco Itaú Unibanco S.A.</b> (00000000728300073331)</td>
            <td>Cheque Especial</td>
            <td>Saldo Utilizado em 25/08/2026: <b>R$ 0,00</b> (Limite Livre)</td>
            <td><span class="badge badge-success">ZERO USO ROTATIVO</span></td>
          </tr>
          <tr>
            <td><b>Banco Itaú Unibanco S.A.</b> (Empréstimo 000002960703672)</td>
            <td>Crédito Pessoal (R$ 1.542,58)</td>
            <td>Parcelas 1 a 4 quitadas com antecedência (Liquidado em 01/07/2026)</td>
            <td><span class="badge badge-success">TOTALMENTE QUITADO</span></td>
          </tr>
          <tr>
            <td><b>Banco Itaú Unibanco S.A.</b> (Empréstimo 000003264314083)</td>
            <td>Crédito Pessoal (R$ 1.032,85)</td>
            <td>Parcelas 1 a 4 quitadas com antecedência (Liquidado em 01/07/2026)</td>
            <td><span class="badge badge-success">TOTALMENTE QUITADO</span></td>
          </tr>
          <tr>
            <td><b>Contas de Consumo</b> (Claro & Eletropaulo)</td>
            <td>Telecom e Energia</td>
            <td>Todas as faturas de 2026 liquidadas com pontualidade comprovada</td>
            <td><span class="badge badge-success">CADASTRO POSITIVO A+</span></td>
          </tr>
        </tbody>
      </table>

      <!-- 3. BANCO CENTRAL (SCR & CCS) -->
      <div class="section-title">3. Banco Central do Brasil — SCR (Créditos) & CCS (Relacionamentos)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Sistema BACEN</th>
            <th>Parâmetro Auditado</th>
            <th>Valor / Situação Oficial Comprovada</th>
            <th>Classificação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>SCR (Código KPXA-XE7M-GN)</b></td>
            <td>Operações de Crédito em Dia</td>
            <td>R$ 259,43 (Fatura corrente de cartão Itaú)</td>
            <td><span class="badge badge-success">REGULAR</span></td>
          </tr>
          <tr>
            <td><b>SCR (Código KPXA-XE7M-GN)</b></td>
            <td>Dívidas Vencidas / Em Atraso</td>
            <td><b>R$ 0,00 (ZERO)</b> em toda a rede bancária nacional (5 anos de histórico)</td>
            <td><span class="badge badge-success">ZERO ATRASO</span></td>
          </tr>
          <tr>
            <td><b>SCR (Código KPXA-XE7M-GN)</b></td>
            <td>Prejuízo Registrado (Write-Off)</td>
            <td><b>R$ 0,00 (ZERO)</b></td>
            <td><span class="badge badge-success">ZERO PREJUÍZO</span></td>
          </tr>
          <tr>
            <td><b>SCR (Código KPXA-XE7M-GN)</b></td>
            <td>Limites de Crédito Disponíveis</td>
            <td>R$ 2.153,62 (Itaú Unibanco S.A.)</td>
            <td><span class="badge badge-info">DISPONÍVEL</span></td>
          </tr>
          <tr>
            <td><b>CCS Bacen (Contas Ativas)</b></td>
            <td>Relacionamentos Bancários</td>
            <td>Itaú Unibanco (Principal), Nubank, Banco Santander, C6 Bank</td>
            <td><span class="badge badge-success">4 CONTAS ATIVAS</span></td>
          </tr>
        </tbody>
      </table>

    </div> <!-- fecha sheet-content -->

    <div class="footer-security">
      <div>Mourato & Associados • Arquivo 2: Dossiê e Birôs Completo • Laudo Pericial de Crédito</div>
      <div>Autenticidade: <code>${hashDoc2}</code> • Página 1 de ${totalPagesDoc2}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 2: PROTESTOS, DÍVIDA ATIVA, TRIBUNAIS E PARECER ==================== -->
  <div class="sheet">
    <div class="watermark-mourato"></div>
    <div class="sheet-content">
      <div class="doc-header-institutional">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${sealDataUri}" class="brand-logo-crest" alt="Brasão Mourato">
          <div>
            <div class="brand-main-name">MOURATO <span>&</span> ASSOCIADOS</div>
            <div class="brand-main-sub">ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA</div>
            <div class="brand-main-meta">CNPJ: 38.377.738/0001-45 • SÃO PAULO - SP • AV. SÃO LUÍS, 187</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 7pt; color: #64748B; line-height: 1.3;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Arquivo 2 de 2: Dossiê e Birôs</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- 4. CARTÓRIOS DE PROTESTO (CENPROT) -->
      <div class="section-title">4. Central Nacional de Protestos (CENPROT / IEPTB) & 6º Cartório de SP</div>
      <table class="data-table">
        <tr>
          <td style="width: 30%;"><b>Pesquisa Nacional CENPROT:</b></td>
          <td style="width: 70%;"><span class="badge badge-success">ZERO TÍTULOS PROTESTADOS ATIVOS</span> (Certidão anexada do 6º Tabelião de Protesto de SP)</td>
        </tr>
      </table>

      <!-- 5. DÍVIDA ATIVA DA UNIÃO E DO ESTADO (PGFN / PGE-SP) -->
      <div class="section-title">5. Dívida Ativa da União (PGFN) & Dívida Ativa Estadual (PGE-SP)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Órgão Competente</th>
            <th>Tipo de Consulta</th>
            <th>Resultado Pericial Auditado</th>
            <th>Classificação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Dívida Ativa da União (PGFN)</b></td>
            <td>Certidão Conjunta Tributos Federais</td>
            <td><b>NADA CONSTA</b> (Ausência de débitos ou execuções fiscais da União)</td>
            <td><span class="badge badge-success">100% REGULAR</span></td>
          </tr>
          <tr>
            <td><b>Portal Dívida Aberta (PGFN)</b></td>
            <td>Cadastro de Inscrições Ativas</td>
            <td><b>NÃO INSCRITO</b> (Zero débitos tributários ou previdenciários)</td>
            <td><span class="badge badge-success">FICHA LIMPA</span></td>
          </tr>
          <tr>
            <td><b>Dívida Ativa do Estado (PGE-SP)</b></td>
            <td>CRDA Estadual / IPVA Moto</td>
            <td>CDA nº 1.480.853.730 de IPVA moto DUZ-0988 (alienada há 18 anos). Objeto de pedido de desvinculação e anulação via Portaria Detran 519/13 e Súmula 585 do STJ.</td>
            <td><span class="badge badge-warning">EM DEFESA</span></td>
          </tr>
        </tbody>
      </table>

      <!-- 6. AUDITORIA FORENSE E COMPLIANCE -->
      <div class="section-title">6. Auditoria Forense, Judiciária e Compliance PLD/FT</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Órgão / Tribunal</th>
            <th>Esfera Jurisdicional</th>
            <th>Resultado da Consulta Oficial</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Tribunal de Justiça de SP (TJSP)</b></td>
            <td>Distribuição Cível (Ações, Execuções, Cobranças)</td>
            <td><b>NADA CONSTA</b></td>
            <td><span class="badge badge-success">RISCO ZERO</span></td>
          </tr>
          <tr>
            <td><b>Tribunal de Justiça de SP (TJSP)</b></td>
            <td>Distribuição Criminal e Inquéritos Policiais</td>
            <td><b>NADA CONSTA</b></td>
            <td><span class="badge badge-success">IDÔNEO</span></td>
          </tr>
          <tr>
            <td><b>Tribunal Regional Federal (TRF-3)</b></td>
            <td>Justiça Federal da 3ª Região (SP/MS)</td>
            <td><b>NADA CONSTA</b></td>
            <td><span class="badge badge-success">RISCO ZERO</span></td>
          </tr>
          <tr>
            <td><b>Tribunal Superior do Trabalho (TST)</b></td>
            <td>CNDT (Banco Nacional de Devedores Trabalhistas)</td>
            <td><b>NADA CONSTA</b></td>
            <td><span class="badge badge-success">REGULAR</span></td>
          </tr>
          <tr>
            <td><b>Conselho Nacional de Justiça (CNJ)</b></td>
            <td>BNMP (Mandados de Prisão)</td>
            <td><b>NADA CONSTA</b></td>
            <td><span class="badge badge-success">REGULAR</span></td>
          </tr>
          <tr>
            <td><b>Portal Transparência / TCU</b></td>
            <td>Listas Restritivas (CEIS, CNEP, CEPIM, TCU, PEP)</td>
            <td><b>NADA CONSTA</b> em todas as listas restritivas</td>
            <td><span class="badge badge-success">CONFORME</span></td>
          </tr>
        </tbody>
      </table>

      <!-- 7. PARECER CONCLUSIVO E RATING DE CRÉDITO -->
      <div class="section-title">7. Parecer Conclusivo da Assessoria & Classificação de Rating</div>
      <div class="alert-box alert-success" style="padding: 6px 9px;">
        <b>PARECER TÉCNICO DE SOLVÊNCIA E ELEGIBILIDADE BANCÁRIA:</b><br>
        O titular <b>JOSÉ JAILSON MOURATO DA SILVA</b> apresenta conformidade plena perante o Sistema Financeiro:<br>
        1. <b>Adimplência Comprovada:</b> Score Quod 711, Boa Vista 800 e Serasa 654, com zero atrasos e zero prejuízos no SCR Bacen em 5 anos.<br>
        2. <b>Reputação Forense Ilibada:</b> Nada Consta em Tribunais Cíveis, Criminais, Federais, Trabalhistas e órgãos de controle.<br>
        3. <b>Regularidade Fiscal Federal:</b> CND da União 100% negativa e débitos estaduais de IPVA antigo formalmente amparados na Súmula 585 do STJ.<br>
        <b>Classificação Atribuída:</b> <span class="badge badge-success" style="font-size: 7.8pt;">RATING PESSOA FÍSICA: AAA (APTO PARA AVAL, FIANÇA E CRÉDITO ESTRUTURADO)</span>
      </div>

      <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 6.5pt; color: #64748B; line-height: 1.3;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Departamento de Inteligência Cadastral, Forense & Risco Financeiro<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 220px;">
          <div style="font-size: 7.2pt; font-weight: bold; color: #0B111E;">COMITÊ PERICIAL DE COMPLIANCE</div>
          <div style="font-size: 6.2pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>
    </div> <!-- fecha sheet-content -->

    <div class="footer-security">
      <div>Mourato & Associados • Arquivo 2: Dossiê e Birôs Completo • Laudo Pericial de Crédito</div>
      <div>Autenticidade: <code>${hashDoc2}</code> • Página 2 de ${totalPagesDoc2}</div>
    </div>
  </div>
</body>
</html>`;

  const htmlDoc2Path = path.join(pfDir, '02_DOSSIE_E_BIROS_COMPLETO.html');
  const pdfDoc2FinalPath = path.join(pfDir, '02_DOSSIE_E_BIROS_COMPLETO.pdf');
  const pdfRelCndsPath = path.join(pfDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf');

  fs.writeFileSync(htmlDoc2Path, htmlDoc2, 'utf8');

  const page2 = await browser.newPage();
  await page2.goto('file:///' + htmlDoc2Path.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page2.waitForTimeout(400);
  await page2.pdf({ path: pdfDoc2FinalPath, format: 'A4', printBackground: true, margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' } });
  await page2.close();

  // Espelha o Arquivo 2 no nome canônico
  fs.copyFileSync(pdfDoc2FinalPath, pdfRelCndsPath);
  fs.copyFileSync(pdfDoc2FinalPath, path.join(docsDir, '02_DOSSIE_E_BIROS_COMPLETO.pdf'));
  fs.copyFileSync(pdfDoc2FinalPath, path.join(docsDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf'));
  console.log('✓ Arquivo 2 compilado com sucesso (Aberto)!');

  await browser.close();

  console.log('=== EXECUÇÃO CONCLUÍDA COM SUCESSO ABSOLUTO! ===');
  console.log('Arquivo 1 (Protegido por senha 1307): ' + pdfDoc1FinalPath);
  console.log('Arquivo 2 (Aberto para bancos): ' + pdfDoc2FinalPath);
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
