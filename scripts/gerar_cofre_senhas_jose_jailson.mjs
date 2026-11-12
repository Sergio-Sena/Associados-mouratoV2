import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const BASE_TEIA = 'C:\\Teia de arranha';
const SEAL_PATH = 'C:\\Teia de arranha\\Mourato.associados\\public\\mourato-seal-circle.png';

async function main() {
  console.log('=== GERANDO COFRE DE SENHAS DOS BIRÔS PROTEGIDO POR SENHA (1307) ===');

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
  const horaEmissao = '14:40';
  const hashDoc = crypto.createHash('sha256').update('MOURATO_COFRE_SENHAS_JOSE_JAILSON_' + Date.now()).digest('hex').substring(0, 24).toUpperCase();

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Cofre Digital de Senhas — José Jailson Mourato da Silva</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    html, body { 
      background: #FFFFFF !important; 
      color: #1E293B; 
      margin: 0; 
      padding: 0; 
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media screen {
      body {
        background: #E2E8F0 !important;
        padding: 20px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .sheet {
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      }
    }
    
    .sheet { 
      width: 210mm; 
      height: 297mm; 
      max-height: 297mm; 
      background: #FFFFFF !important; 
      padding: 14mm 18mm 16mm 18mm; 
      position: relative; 
      overflow: hidden; 
      z-index: 1; 
      page-break-inside: avoid;
    }
    
    /* MARCA D'ÁGUA OFICIAL MOURATO 5.5% */
    .watermark-mourato {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 145mm;
      height: 145mm;
      background-image: url('${sealDataUri}');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.055;
      pointer-events: none;
      z-index: 0;
    }
    
    .sheet-content { 
      position: relative; 
      z-index: 2; 
    }
    
    /* CABEÇALHO PADRÃO MOURATO */
    .doc-header-institutional {
      border-bottom: 2px solid #C5A869;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-logo-crest {
      width: 48px;
      height: 48px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand-text-block {
      display: flex;
      flex-direction: column;
    }
    .brand-main-name {
      font-size: 13.5pt;
      font-weight: 800;
      color: #0B111E;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.1;
      font-family: 'Cinzel', Georgia, serif;
    }
    .brand-main-name span { color: #C5A869; }
    .brand-main-sub {
      font-size: 6.8pt;
      font-weight: 700;
      color: #876223;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .brand-main-meta {
      font-size: 6pt;
      color: #64748B;
      margin-top: 2px;
    }
    
    .doc-title-block {
      background: #0B111E;
      border-left: 4px solid #C5A869;
      padding: 10px 14px;
      margin-bottom: 12px;
      color: #FFFFFF;
      border-radius: 2px;
    }
    .doc-title-main {
      font-size: 11pt;
      font-weight: 800;
      color: #F8FAFC;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .doc-title-sub {
      font-size: 7.2pt;
      color: #94A3B8;
      margin-top: 3px;
    }
    
    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #876223;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 12px 0 6px 0;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 7.6pt;
    }
    .data-table th, .data-table td {
      border: 1px solid #CBD5E1;
      padding: 6px 8px;
      text-align: left;
    }
    .data-table th {
      background: #F1F5F9;
      color: #0F172A;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 6.8pt;
      letter-spacing: 0.03em;
    }
    
    .password-cell {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      font-weight: 800;
      color: #0B111E;
      background: #FEF3C7;
      padding: 3px 6px;
      border-radius: 3px;
      display: inline-block;
      border: 1px solid #FCD34D;
    }
    
    .alert-box {
      border-radius: 4px;
      padding: 8px 12px;
      margin: 10px 0;
      font-size: 7.4pt;
      line-height: 1.4;
    }
    .alert-security {
      background: #FFFBEB;
      border: 1px solid #FCD34D;
      border-left: 4px solid #D97706;
      color: #78350F;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-info { background: #DBEAFE; color: #1E40AF; }
    
    .footer-security {
      position: absolute;
      bottom: 8mm;
      left: 18mm;
      right: 18mm;
      border-top: 1px solid #CBD5E1;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      font-size: 6.2pt;
      color: #94A3B8;
      line-height: 1.3;
      z-index: 10;
    }
  </style>
</head>
<body>

  <div class="sheet">
    <div class="watermark-mourato"></div>
    <div class="sheet-content">
      
      <!-- CABEÇALHO PADRÃO MOURATO -->
      <div class="doc-header-institutional">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${sealDataUri}" class="brand-logo-crest" alt="Brasão Oficial Mourato & Associados">
          <div class="brand-text-block">
            <div class="brand-main-name">MOURATO <span>&</span> ASSOCIADOS</div>
            <div class="brand-main-sub">ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA</div>
            <div class="brand-main-meta">CNPJ: 38.377.738/0001-45 • SÃO PAULO - SP • AV. SÃO LUÍS, 187</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 7pt; color: #64748B; line-height: 1.3;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Cofre de Segurança Criptografado</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- TÍTULO -->
      <div class="doc-title-block">
        <div class="doc-title-main">🔒 COFRE DIGITAL DE SEGURANÇA — SENHAS E ACESSOS AOS BIRÔS</div>
        <div class="doc-title-sub">Custódia Segregada de Credenciais Operacionais • Proteção Criptográfica AES-256 (Senha de Abertura: <b>1307</b>)</div>
      </div>

      <!-- DADOS DO TITULAR -->
      <div class="section-title">1. Qualificação do Titular das Credenciais</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Titular / Administrador:</b></td>
          <td style="width: 30%; font-weight: bold;">JOSÉ JAILSON MOURATO DA SILVA</td>
          <td style="width: 20%;"><b>CPF Oficial:</b></td>
          <td style="width: 30%; font-family: monospace; font-weight: bold;">317.769.598-92</td>
        </tr>
        <tr>
          <td><b>Empresa Vinculada:</b></td>
          <td colspan="3"><b>MOURATO E ASSOCIADOS LTDA (CNPJ: 38.377.738/0001-45)</b> — Sócio-Administrador</td>
        </tr>
        <tr>
          <td><b>E-mail de Recuperação:</b></td>
          <td>mourato.importacao@gmail.com • jota.jailson@hotmail.com</td>
          <td><b>Telefone / 2FA:</b></td>
          <td>(11) 97899-0034</td>
        </tr>
      </table>

      <!-- ALERTA DE GOVERNANÇA LGPD -->
      <div class="alert-box alert-security">
        <b>AVISO DE CONFIDENCIALIDADE E POLÍTICA DE SEGURANÇA (LGPD ART. 7º, IX):</b><br>
        Este documento contém as senhas de acesso aos sistemas de análise de crédito, birôs e portais governamentais do titular. O acesso é estritamente restrito à diretoria executiva e ao titular. A abertura deste PDF é protegida por senha de segurança (<b>1307</b>). Este documento não deve ser fornecido a terceiros sem prévia autorização formal.
      </div>

      <!-- TABELA DE CREDENCIAIS COMPLETAS -->
      <div class="section-title">2. Relação Completa de Senhas e Credenciais dos Birôs e Portais Oficiais</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 24%;">Portal / Birô</th>
            <th style="width: 22%;">Chave / Login</th>
            <th style="width: 18%;">Senha / PIN</th>
            <th style="width: 14%;">Status</th>
            <th style="width: 22%;">Link / Finalidade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Serasa Experian Consumidor</b></td>
            <td><code>317.769.598-92</code></td>
            <td><span class="password-cell">Jota1307</span></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>serasa.com.br<br><small>Score 654 • Histórico limpo</small></td>
          </tr>
          <tr>
            <td><b>Boa Vista Consumidor Positivo</b></td>
            <td><code>317.769.598-92</code></td>
            <td><span class="password-cell">290618</span></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>consumidorpositivo.com.br<br><small>Score 800 • Cadastro Positivo</small></td>
          </tr>
          <tr>
            <td><b>Quod Gestora de Inteligência</b></td>
            <td><code>31776959892</code></td>
            <td><span class="password-cell">aJfbAtwX7</span></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>consumidor.quod.com.br<br><small>Score 711 homologado</small></td>
          </tr>
          <tr>
            <td><b>Banco Central (Registrato)</b></td>
            <td><code>317.769.598-92</code></td>
            <td><span class="password-cell">123456</span></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>registrato.bcb.gov.br<br><small>SCR Bacen e CCS Contas</small></td>
          </tr>
          <tr>
            <td><b>Detran-SP Portal de Serviços</b></td>
            <td><code>317.769.598-92</code></td>
            <td><span class="password-cell">123456</span></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>detran.sp.gov.br<br><small>Proc. SRV2683164 (DUZ-0988)</small></td>
          </tr>
          <tr>
            <td><b>PGE-SP Dívida Ativa (PRDI)</b></td>
            <td><code>317.769.598-92</code></td>
            <td><span class="password-cell">123456</span></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>dividaativa.pge.sp.gov.br<br><small>Emissão e gestão de CRDA</small></td>
          </tr>
          <tr>
            <td><b>Portal REGULARIZE (PGFN)</b></td>
            <td><code>317.769.598-92</code></td>
            <td><span class="password-cell">123456</span></td>
            <td><span class="badge badge-success">HABILITADO</span></td>
            <td>regularize.pgfn.gov.br<br><small>Certificado A1 / e-CPF</small></td>
          </tr>
        </tbody>
      </table>

      <!-- INSTRUÇÕES OPERACIONAIS -->
      <div class="section-title">3. Diretrizes de Governança e Atualização Cadastral</div>
      <table class="data-table">
        <tr>
          <td style="width: 25%;"><b>Ciclo de Troca de Senhas:</b></td>
          <td>Trimestral ou imediatamente após conclusão de auditorias externas.</td>
        </tr>
        <tr>
          <td><b>Certificado Digital A1:</b></td>
          <td>e-CPF A1 ICP-Brasil habilitado em nuvem / repositório criptografado local para assinaturas forenses e protocolos eletrônicos.</td>
        </tr>
        <tr>
          <td><b>Suporte e Custódia:</b></td>
          <td>Mourato & Associados • Departamento de Inteligência e Tecnologia da Informação.</td>
        </tr>
      </table>

      <!-- ASSINATURAS CORPORATIVAS -->
      <div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 6.8pt; color: #64748B; line-height: 1.3;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Departamento de Segurança da Informação & Compliance<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 220px;">
          <div style="font-size: 7.2pt; font-weight: bold; color: #0B111E;">CUSTÓDIA E GOVERNANÇA DIGITAL</div>
          <div style="font-size: 6.2pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>

    </div> <!-- fecha sheet-content -->

    <!-- RODAPÉ FIXO -->
    <div class="footer-security">
      <div>Mourato & Associados • Cofre Digital de Senhas • Documento Criptografado (Senha: 1307)</div>
      <div>Autenticidade: <code>${hashDoc}</code> • Página 1 de 1</div>
    </div>
  </div>

</body>
</html>`;

  const htmlPath = path.join(pfDir, 'COFRE_DE_SENHAS.html');
  const pdfTempPath = path.join(pfDir, 'COFRE_DE_SENHAS_TEMP.pdf');
  const pdfFinalPath = path.join(pfDir, 'COFRE_DE_SENHAS.pdf');
  const pdfFinalPathBiros = path.join(pfDir, 'COFRE_DE_SENHAS_BIROS.pdf');
  const pdfDocsPath = path.join(docsDir, 'COFRE_DE_SENHAS.pdf');
  const pdfDocsPathBiros = path.join(docsDir, 'COFRE_DE_SENHAS_BIROS.pdf');

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('✓ HTML do Cofre de Senhas gravado com sucesso em: ' + htmlPath);

  console.log('--- Compilando PDF base via Playwright/Chromium ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.pdf({
    path: pdfTempPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
  });

  await page.close();
  await browser.close();
  console.log('✓ PDF base compilado em: ' + pdfTempPath);

  console.log('--- Criptografando PDF com senha 1307 via pypdf ---');
  const pythonScript = `
import pypdf

reader = pypdf.PdfReader(r"${pdfTempPath.replace(/\\/g, '\\\\')}")
writer = pypdf.PdfWriter()
for page in reader.pages:
    writer.add_page(page)

# Criptografia com senha '1307'
writer.encrypt("1307")

with open(r"${pdfFinalPath.replace(/\\/g, '\\\\')}", "wb") as f:
    writer.write(f)

print("PDF criptografado com sucesso com a senha: 1307")
`;

  const pyScriptPath = path.join(pfDir, 'encrypt_pdf.py');
  fs.writeFileSync(pyScriptPath, pythonScript, 'utf8');

  execSync(`python "${pyScriptPath}"`, { stdio: 'inherit' });

  // Cria cópias convenientes
  fs.copyFileSync(pdfFinalPath, pdfFinalPathBiros);
  fs.copyFileSync(pdfFinalPath, pdfDocsPath);
  fs.copyFileSync(pdfFinalPath, pdfDocsPathBiros);

  // Remove os temporários
  if (fs.existsSync(pdfTempPath)) fs.unlinkSync(pdfTempPath);
  if (fs.existsSync(pyScriptPath)) fs.unlinkSync(pyScriptPath);

  console.log('✓ SUCESSO: Cofre de Senhas protegido por senha gerado em:');
  console.log('  -> ' + pdfFinalPath);
  console.log('  -> ' + pdfFinalPathBiros);
  console.log('  -> ' + pdfDocsPath);
  console.log('  -> ' + pdfDocsPathBiros);
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});

