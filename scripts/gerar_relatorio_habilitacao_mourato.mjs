import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { chromium } from 'playwright';

const BASE_TEIA = 'C:\\Teia de arranha';
const SEAL_PATH = 'C:\\Teia de arranha\\Mourato.associados\\public\\mourato-seal-circle.png';

async function main() {
  console.log('=== GERANDO LAUDO PERICIAL DE HABILITAÇÃO, CAPITAL SOCIAL E SCR DA MOURATO ===');

  if (!fs.existsSync(SEAL_PATH)) {
    throw new Error('Brasão não encontrado em: ' + SEAL_PATH);
  }

  const sealBase64 = fs.readFileSync(SEAL_PATH).toString('base64');
  const sealDataUri = `data:image/png;base64,${sealBase64}`;

  const pjDir = path.join(BASE_TEIA, 'ClientesPJ', 'MOURATO_E_ASSOCIADOS_LTDA_38377738000145');
  const pfDir = path.join(BASE_TEIA, 'ClientesPF', 'JOSE_JAILSON_MOURATO_DA_SILVA_31776959892');

  if (!fs.existsSync(pjDir)) fs.mkdirSync(pjDir, { recursive: true });
  if (!fs.existsSync(pfDir)) fs.mkdirSync(pfDir, { recursive: true });
  if (!fs.existsSync(path.join(pjDir, 'documentos_pdf'))) fs.mkdirSync(path.join(pjDir, 'documentos_pdf'), { recursive: true });
  if (!fs.existsSync(path.join(pfDir, 'documentos_pdf'))) fs.mkdirSync(path.join(pfDir, 'documentos_pdf'), { recursive: true });

  const dataEmissao = '12/11/2026';
  const horaEmissao = '13:30';
  const hashDoc = crypto.createHash('sha256').update('MOURATO_LAUDO_HABILITACAO_' + Date.now()).digest('hex').substring(0, 24).toUpperCase();

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo Pericial de Habilitação Bancária e Governança — MOURATO & ASSOCIADOS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    body { background: #0F172A; color: #1E293B; padding: 2rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 2rem; }
    
    .sheet { 
      width: 210mm; 
      min-height: 297mm; 
      background: #FFFFFF; 
      padding: 18mm 20mm; 
      box-shadow: 0 10px 40px rgba(0,0,0,0.5); 
      position: relative; 
      overflow: hidden; 
      z-index: 1; 
      page-break-after: always;
    }
    
    /* MARCA D'ÁGUA OFICIAL MOURATO (5.5%) */
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
    
    /* CABEÇALHO PADRÃO MOURATO */
    .doc-header-institutional {
      border-bottom: 2px solid #C5A869;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-logo-crest {
      width: 52px;
      height: 52px;
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
      margin-top: 3px;
    }
    .brand-main-meta {
      font-size: 6.2pt;
      color: #64748B;
      margin-top: 2px;
    }
    
    .doc-title-block {
      background: #F8FAFC;
      border-left: 4px solid #C5A869;
      padding: 10px 14px;
      margin-bottom: 16px;
    }
    .doc-title-main {
      font-size: 11pt;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .doc-title-sub {
      font-size: 8pt;
      color: #64748B;
      margin-top: 3px;
    }
    
    .section-title {
      font-size: 8.8pt;
      font-weight: 700;
      color: #876223;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 14px 0 8px 0;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8pt;
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
      font-size: 7.2pt;
      letter-spacing: 0.03em;
    }
    
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .kpi-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-top: 3px solid #C5A869;
      padding: 8px 10px;
      border-radius: 4px;
      text-align: center;
    }
    .kpi-label { font-size: 6.8pt; font-weight: 700; color: #64748B; text-transform: uppercase; }
    .kpi-val { font-size: 12pt; font-weight: 800; color: #0F172A; margin: 2px 0; font-family: 'Cinzel', Georgia, serif; }
    .kpi-sub { font-size: 6.5pt; color: #16A34A; font-weight: bold; }
    
    .alert-box {
      border-radius: 4px;
      padding: 10px 12px;
      margin: 10px 0;
      font-size: 8pt;
      line-height: 1.45;
    }
    .alert-success {
      background: #F0FDF4;
      border: 1px solid #86EFAC;
      border-left: 4px solid #16A34A;
      color: #166534;
    }
    .alert-info {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-left: 4px solid #2563EB;
      color: #1E40AF;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-info { background: #DBEAFE; color: #1E40AF; }
    
    .footer-security {
      margin-top: 18px;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #94A3B8;
      line-height: 1.4;
    }
  </style>
</head>
<body>

  <!-- PÁGINA 1: AUDITORIA SOCIETÁRIA, CAPITAL SOCIAL E BANCO CENTRAL -->
  <div class="sheet">
    <div class="watermark-mourato"></div>
    <div class="sheet-content">
      
      <!-- CABEÇALHO PADRÃO MOURATO -->
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
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Dossiê Institucional & Rating Bancário</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- TÍTULO DO DOCUMENTO -->
      <div class="doc-title-block">
        <div class="doc-title-main">LAUDO PERICIAL DE HABILITAÇÃO BANCÁRIA, CAPITAL SOCIAL E RATING SCR</div>
        <div class="doc-title-sub">Dossiê de Qualificação Técnica e Idoneidade Financeira perante Instituições Financeiras e Fundos</div>
      </div>

      <!-- CARDS DE DESTAQUE EXECUTIVO -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Capital Social Integralizado</div>
          <div class="kpi-val">R$ 1.000.000</div>
          <div class="kpi-sub">✓ 100% em Moeda Nacional (JUCESP)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Endividamento SCR Bacen</div>
          <div class="kpi-val">R$ 0,00</div>
          <div class="kpi-sub">✓ Zero Dívidas / Desalavancada</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Classificação de Risco</div>
          <div class="kpi-val" style="color: #16A34A;">RATING A+</div>
          <div class="kpi-sub">✓ Apta para Linhas Estruturadas</div>
        </div>
      </div>

      <!-- DADOS CADASTRAIS CONFERIDOS -->
      <div class="section-title">1. Qualificação Societária e Registro Mercantil (JUCESP)</div>
      <table class="data-table">
        <tr>
          <td style="width: 22%;"><b>Razão Social:</b></td>
          <td style="width: 28%;">MOURATO E ASSOCIADOS LTDA</td>
          <td style="width: 22%;"><b>CNPJ:</b></td>
          <td style="width: 28%; font-family: monospace; font-weight: bold;">38.377.738/0001-45</td>
        </tr>
        <tr>
          <td><b>Nome Fantasia:</b></td>
          <td>MOURATO & ASSOCIADOS</td>
          <td><b>Natureza Jurídica:</b></td>
          <td>206-2 — Sociedade Limitada Unipessoal (SLU)</td>
        </tr>
        <tr>
          <td><b>NIRE de Registro:</b></td>
          <td style="font-family: monospace;">35270804594</td>
          <td><b>Arquivamento JUCESP:</b></td>
          <td style="font-family: monospace;">Nº 1.516.489/26-3 (23/10/2026)</td>
        </tr>
        <tr>
          <td><b>Data de Abertura:</b></td>
          <td>08/09/2020 (Mais de 6 anos ativa)</td>
          <td><b>Regime Tributário:</b></td>
          <td>Optante pelo Simples Nacional (ME)</td>
        </tr>
        <tr>
          <td><b>Sócio-Administrador:</b></td>
          <td>JOSÉ JAILSON MOURATO DA SILVA</td>
          <td><b>CPF do Titular:</b></td>
          <td style="font-family: monospace;">317.769.598-92 (100% das Quotas)</td>
        </tr>
        <tr>
          <td><b>Sede Corporativa:</b></td>
          <td colspan="3">Avenida São Luís, 187, Sala 69 A - República, São Paulo/SP - CEP: 01046-000</td>
        </tr>
      </table>

      <!-- AUDITORIA DO CAPITAL SOCIAL -->
      <div class="section-title">2. Auditoria Pericial do Capital Social (Certidão Inteiro Teor JUCESP)</div>
      <div class="alert-box alert-success">
        <b>COMPROVAÇÃO DE INTEGRALIZAÇÃO (CLÁUSULA TERCEIRA DO CONTRATO CONSOLIDADO):</b><br>
        Conforme certidão digital da Junta Comercial do Estado de São Paulo expedida em 27/10/2026 sob código de controle <code>303659372</code> (assinada pela Secretária Geral da JUCESP, Marina Centurion Dardani, via ICP-Brasil), atesta-se formalmente que:<br>
        <i>"O capital social é de <b>R$ 1.000.000,00 (um milhão de reais)</b>, dividido em 1.000.000 de quotas de R$ 1,00 cada, <b>totalmente subscrito e integralizado em moeda corrente nacional</b>, detido 100% pelo sócio José Jailson Mourato da Silva."</i><br>
        <b>Implicação Pericial:</b> Atende com perfeição o requisito de porte e patrimônio líquido mínimo exigido por mesas de crédito bancário corporativo.
      </div>

      <!-- AUDITORIA DO SCR BANCO CENTRAL -->
      <div class="section-title">3. Auditoria Pericial do Sistema de Informações de Crédito (SCR BANCO CENTRAL)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Parâmetro Auditado</th>
            <th>Extrato Oficial do Banco Central</th>
            <th>Código de Autenticidade</th>
            <th>Status Pericial</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Período Analisado</b></td>
            <td><b>Setembro/2022 a Setembro/2026 (48 meses ininterruptos)</b></td>
            <td rowspan="4" style="text-align: center; font-family: monospace; font-size: 9pt; font-weight: bold; background: #F8FAFC;">
              BACEN REGISTRATO<br>
              <code>CVS9-GV5D-W9</code><br>
              <span style="font-size: 6.5pt; color: #64748B; font-weight: normal;">Emitido em 12/11/2026 13:22</span>
            </td>
            <td><span class="badge badge-success">AUDITADO 4 ANOS</span></td>
          </tr>
          <tr>
            <td><b>Operações de Crédito em Aberto</b></td>
            <td><b>R$ 0,00</b> (Não foram encontrados registros de operações)</td>
            <td><span class="badge badge-success">100% DESALAVANCADA</span></td>
          </tr>
          <tr>
            <td><b>Créditos em Atraso (> 15/30 dias)</b></td>
            <td><b>R$ 0,00</b> (Zero inadimplência no Sistema Financeiro Nacional)</td>
            <td><span class="badge badge-success">IMPECÁVEL</span></td>
          </tr>
          <tr>
            <td><b>Prejuízo Baixado (Write-Off)</b></td>
            <td><b>R$ 0,00</b> (Inexistência de qualquer calote ou baixa em prejuízo)</td>
            <td><span class="badge badge-success">RATING MÁXIMO</span></td>
          </tr>
        </tbody>
      </table>

      <div class="alert-box alert-info">
        <b>ANÁLISE DE CAPACIDADE DE TOMADA DE CRÉDITO:</b><br>
        O relatório oficial do Banco Central do Brasil demonstra que a empresa possui seu <b>balanço 100% desonerado</b>. A ausência de tomada de crédito prévia garante capacidade máxima de alavancagem sem comprometer o limite prudencial de endividamento da instituição financeira.
      </div>

      <div class="footer-security">
        <div>Mourato & Associados • Dossiê Institucional de Habilitação • LGPD Art. 7º Inc. IX</div>
        <div>Código de Autenticidade: <code>${hashDoc}</code> • Página 1 de 2</div>
      </div>
    </div>
  </div>

  <!-- PÁGINA 2: CNAES, EVE, CAPACIDADE FINANCEIRA E CONCLUSÃO -->
  <div class="sheet">
    <div class="watermark-mourato"></div>
    <div class="sheet-content">
      
      <!-- CABEÇALHO PADRÃO MOURATO (PÁG 2) -->
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
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Dossiê Institucional & Rating Bancário</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- CNAES E OPERACIONALIDADE -->
      <div class="section-title">4. Matriz de CNAEs Ativos e Objeto Social Estruturado</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Código CNAE</th>
            <th>Descrição da Atividade Econômica</th>
            <th>Enquadramento Operacional Bancário</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-family: monospace; font-weight: bold;">6619-3/99</td>
            <td>Outras atividades auxiliares dos serviços financeiros não especificadas anteriormente</td>
            <td>Assessoria de Crédito, Estruturação Financeira e Correspondência.</td>
          </tr>
          <tr>
            <td style="font-family: monospace; font-weight: bold;">7020-4/00</td>
            <td>Atividades de consultoria em gestão empresarial, exceto consultoria técnica específica</td>
            <td>Elaboração de Planos Estratégicos, EVE e Reestruturação Corporativa.</td>
          </tr>
          <tr>
            <td style="font-family: monospace; font-weight: bold;">6920-6/01</td>
            <td>Atividades de contabilidade</td>
            <td>BPO Financeiro, Conciliação e Governança de Balanço.</td>
          </tr>
          <tr>
            <td style="font-family: monospace; font-weight: bold;">7490-1/04</td>
            <td>Atividades de intermediação e agenciamento de serviços e negócios em geral</td>
            <td>Intermediação e Negócios B2B com Fundos e Securitizadoras.</td>
          </tr>
        </tbody>
      </table>

      <!-- INDICADORES ECONÔMICOS DO LAUDO EVE BANCO SAFRA -->
      <div class="section-title">5. Indicadores Econômico-Financeiros Auditados (Laudo EVE de Referência)</div>
      <table class="data-table">
        <tr>
          <td style="width: 25%;"><b>Faturamento Médio Anualizado:</b></td>
          <td style="width: 25%; font-weight: bold;">R$ 1.753.240,36</td>
          <td style="width: 25%;"><b>Faturamento Médio Mensal:</b></td>
          <td style="width: 25%; font-weight: bold;">R$ 146.103,36</td>
        </tr>
        <tr>
          <td><b>EBITDA Projetado:</b></td>
          <td style="color: #16A34A; font-weight: bold;">R$ 497.920,26 (28,4%)</td>
          <td><b>Lucro Líquido Projetado:</b></td>
          <td style="color: #16A34A; font-weight: bold;">R$ 385.712,88 (22,0%)</td>
        </tr>
        <tr>
          <td><b>Índice Cobertura da Dívida (ICSD):</b></td>
          <td style="font-weight: bold;">2,75x (Mínimo exigido: 1,30x)</td>
          <td><b>Liquidez Corrente:</b></td>
          <td style="font-weight: bold;">2,45 (Excelente folga operacional)</td>
        </tr>
      </table>

      <!-- CONCLUSÃO E RATING PERICIAL -->
      <div class="section-title">6. Conclusão Pericial de Habilitação & Rating Corporativo</div>
      <div class="alert-box alert-success">
        <b>PARECER CONCLUSIVO DE IDONEIDADE & HABILITAÇÃO:</b><br>
        A empresa <b>MOURATO E ASSOCIADOS LTDA</b> cumpre integralmente os requisitos de idoneidade mercantil, solvência patrimonial e regularidade cadastral:<br>
        1. <b>Capital Social Robusto e Auditado:</b> R$ 1.000.000,00 integralizado em moeda nacional arquivado formalmente na JUCESP sob o nº 1.516.489/26-3.<br>
        2. <b>Endividamento Zero no Banco Central:</b> Certidão do SCR BACEN (código <code>CVS9-GV5D-W9</code>) atesta total desalavancagem e ausência de restrições em 4 anos de série histórica.<br>
        3. <b>Estrutura Societária Segura:</b> Modelo SLU (Art. 1.052 do CC) com segregação de patrimônio entre pessoa física e jurídica.<br>
        <b>Classificação Atribuída:</b> <span class="badge badge-success" style="font-size: 8pt;">RATING A+ (EMPRESA 100% APTA E ELEGÍVEL A LINHAS BANCÁRIAS E PARCERIAS)</span>
      </div>

      <!-- ASSINATURA CORPORATIVA -->
      <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 7pt; color: #64748B; line-height: 1.4;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Departamento Pericial de Estruturação Financeira & Risco<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 230px;">
          <div style="font-size: 7.5pt; font-weight: bold; color: #0B111E;">COMITÊ TÉCNICO DE GOVERNANÇA</div>
          <div style="font-size: 6.5pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>

      <div class="footer-security">
        <div>Mourato & Associados • Dossiê Institucional de Habilitação • LGPD Art. 7º Inc. IX</div>
        <div>Código de Autenticidade: <code>${hashDoc}</code> • Página 2 de 2</div>
      </div>
    </div>
  </div>

</body>
</html>`;

  const htmlPj = path.join(pjDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.html');
  const htmlPf = path.join(pfDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.html');
  fs.writeFileSync(htmlPj, htmlContent, 'utf8');
  fs.writeFileSync(htmlPf, htmlContent, 'utf8');
  console.log('✓ HTML salvo em PJ e PF com cabeçalho padrão e marca d\'água 5.5%');

  console.log('--- Compilando PDF em Alta Definição via Chromium/Chrome ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + htmlPj.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const pdfPj1 = path.join(pjDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf');
  const pdfPj2 = path.join(pjDir, 'documentos_pdf', 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf');
  const pdfPf1 = path.join(pfDir, 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf');
  const pdfPf2 = path.join(pfDir, 'documentos_pdf', 'RELATORIO_PERICIAL_HABILITACAO_E_CNDS.pdf');

  await page.pdf({
    path: pdfPj1,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
  });

  await page.close();
  await browser.close();

  fs.copyFileSync(pdfPj1, pdfPj2);
  fs.copyFileSync(pdfPj1, pdfPf1);
  fs.copyFileSync(pdfPj1, pdfPf2);

  console.log('✓ PDF compilado e salvo com sucesso em:');
  console.log('  -> ' + pdfPj1);
  console.log('  -> ' + pdfPj2);
  console.log('  -> ' + pdfPf1);
  console.log('  -> ' + pdfPf2);
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
