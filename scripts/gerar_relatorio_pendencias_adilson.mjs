import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { chromium } from 'playwright';

const BASE_TEIA = 'C:\\Teia de arranha';
const SEAL_PATH = 'C:\\Teia de arranha\\Mourato.associados\\public\\mourato-seal-circle.png';

async function main() {
  console.log('=== GERANDO RELATÓRIO PERICIAL DE PENDÊNCIAS E COMPLIANCE ===');

  if (!fs.existsSync(SEAL_PATH)) {
    throw new Error('Brasão não encontrado em: ' + SEAL_PATH);
  }

  const sealBase64 = fs.readFileSync(SEAL_PATH).toString('base64');
  const sealDataUri = `data:image/png;base64,${sealBase64}`;

  const pjDir = path.join(BASE_TEIA, 'ClientesPJ', 'ADILSON_DE_ANDRADE_LIMA_LIMA_GAS_15204314000183');
  const pfDir = path.join(BASE_TEIA, 'ClientesPF', 'ADILSON_DE_ANDRADE_LIMA_12829477880');

  if (!fs.existsSync(pjDir)) fs.mkdirSync(pjDir, { recursive: true });
  if (!fs.existsSync(pfDir)) fs.mkdirSync(pfDir, { recursive: true });
  if (!fs.existsSync(path.join(pjDir, 'documentos_pdf'))) fs.mkdirSync(path.join(pjDir, 'documentos_pdf'), { recursive: true });
  if (!fs.existsSync(path.join(pfDir, 'documentos_pdf'))) fs.mkdirSync(path.join(pfDir, 'documentos_pdf'), { recursive: true });

  const dataEmissao = '12/11/2026';
  const horaEmissao = '12:50';
  const hashDoc = crypto.createHash('sha256').update('MOURATO_COMPLIANCE_ADILSON_LIMA_' + Date.now()).digest('hex').substring(0, 24).toUpperCase();

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Pericial de Compliance e Pendências — Lima Gás / Adilson de Andrade Lima</title>
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
        gap: 20px;
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
      padding: 13mm 18mm 16mm 18mm; 
      position: relative; 
      overflow: hidden; 
      z-index: 1; 
      page-break-after: always;
      page-break-inside: avoid;
    }
    
    /* MARCA D'ÁGUA OFICIAL MOURATO (OPACIDADE CALIBRADA 5.5%) */
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
      font-size: 9pt;
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
    
    .alert-box {
      border-radius: 4px;
      padding: 10px 12px;
      margin: 10px 0;
      font-size: 8pt;
      line-height: 1.45;
    }
    .alert-danger {
      background: #FEF2F2;
      border: 1px solid #F87171;
      border-left: 4px solid #DC2626;
      color: #991B1B;
    }
    .alert-warning {
      background: #FFFBEB;
      border: 1px solid #FCD34D;
      border-left: 4px solid #D97706;
      color: #92400E;
    }
    .alert-success {
      background: #F0FDF4;
      border: 1px solid #86EFAC;
      border-left: 4px solid #16A34A;
      color: #166534;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-danger { background: #FEE2E2; color: #991B1B; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    .badge-success { background: #DCFCE7; color: #166534; }
    
    .footer-security {
      position: absolute;
      bottom: 10mm;
      left: 18mm;
      right: 18mm;
      border-top: 1px solid #CBD5E1;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #94A3B8;
      line-height: 1.4;
    }
  </style>
</head>
<body>

  <!-- PÁGINA 1: AUDITORIA FORENSE E COMPLIANCE BANCÁRIO -->
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
          <div><b>TEIA DE ARANHA</b></div>
          <div>Dossiê de Inteligência & Compliance</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- TÍTULO DO DOCUMENTO -->
      <div class="doc-title-block">
        <div class="doc-title-main">RELATÓRIO PERICIAL DE AUDITORIA DE COMPLIANCE, RISCO FORENSE E PENDÊNCIAS</div>
        <div class="doc-title-sub">Dossiê Especial de Diligência Prévia (Due Diligence) para Submissão a Comitês Bancários</div>
      </div>

      <!-- IDENTIFICAÇÃO DO CLIENTE -->
      <div class="section-title">1. Identificação do Cliente Auditado</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Razão Social (PJ):</b></td>
          <td style="width: 30%;">ADILSON DE ANDRADE LIMA - ME</td>
          <td style="width: 20%;"><b>CNPJ:</b></td>
          <td style="width: 30%; font-family: monospace; font-weight: bold;">15.204.314/0001-83</td>
        </tr>
        <tr>
          <td><b>Nome Fantasia:</b></td>
          <td>LIMA GÁS</td>
          <td><b>Natureza Jurídica:</b></td>
          <td>213-5 — Empresário Individual</td>
        </tr>
        <tr>
          <td><b>Titular / Administrador:</b></td>
          <td>ADILSON DE ANDRADE LIMA</td>
          <td><b>CPF:</b></td>
          <td style="font-family: monospace; font-weight: bold;">128.294.778-80</td>
        </tr>
        <tr>
          <td><b>Atividade Principal:</b></td>
          <td>47.84-9-00 (Comércio varejista de GLP)</td>
          <td><b>Data Abertura:</b></td>
          <td>15/03/2012 (Ativa há > 14 anos)</td>
        </tr>
        <tr>
          <td><b>Endereço PJ:</b></td>
          <td colspan="3">Av. Getúlio Vargas, 2856 - Centro - Conselheiro Pena/MG - CEP: 35240-000</td>
        </tr>
      </table>

      <!-- RESUMO EXECUTIVO -->
      <div class="section-title">2. Resumo Executivo da Auditoria de Crédito & Compliance</div>
      <div class="alert-box alert-warning">
        <b>DIAGNÓSTICO TÉCNICO PERICIAL (DICOTOMIA CRÉDITO x COMPLIANCE):</b><br>
        A empresa apresenta excelente comportamento comercial nos birôs convencionais (Score Serasa PJ <b>800</b>, zero protestos, zero cheques sem fundos e SCR regular). No entanto, o comitê de crédito bancário <b>rejeitará sumariamente a operação</b> caso submetida sem saneamento, devido ao <b>apontamento de processos criminais de alta repercussão envolvendo o titular na Comarca de Conselheiro Pena/MG</b>, além de <b>pendências regulatórias mandatórias do setor de combustíveis/GLP</b>.
      </div>

      <!-- PENDÊNCIA 1: FORENSE E REPUTACIONAL -->
      <div class="section-title">3. Apontamento Forense Crítico: Processos Judiciais (TJMG / STJ / STF)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Instância / Tribunal</th>
            <th>Identificação dos Registros</th>
            <th>Matéria / Objeto Processual</th>
            <th>Classificação de Risco</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>STF (Supremo Tribunal Federal)</b></td>
            <td>Habeas Corpus nº 184.436<br>Habeas Corpus nº 180.854</td>
            <td>Discussão sobre prisão preventiva, contemporaneidade e medidas cautelares penais.</td>
            <td><span class="badge badge-danger">CRÍTICO (PLD/FT)</span></td>
          </tr>
          <tr>
            <td><b>STJ (Superior Tribunal de Justiça)</b></td>
            <td>Recursos em Habeas Corpus e Agravos Regimentais</td>
            <td>Recursos defensivos vinculados à Ação Penal de Conselheiro Pena (MG).</td>
            <td><span class="badge badge-danger">CRÍTICO (PLD/FT)</span></td>
          </tr>
          <tr>
            <td><b>TJMG (Tribunal de Justiça de Minas Gerais)</b></td>
            <td>Comarca de Conselheiro Pena e Comarca de Goiabeira/MG</td>
            <td>Investigações e Ações Penais por homicídio qualificado e suspeita de grupo armado local.</td>
            <td><span class="badge badge-danger">CRÍTICO (PLD/FT)</span></td>
          </tr>
        </tbody>
      </table>

      <div class="alert-box alert-danger">
        <b>IMPACTO TÉCNICO NOS BANCOS (LEI 9.613/98 & CIRCULAR BACEN 3.978/2020):</b><br>
        1. <b>Confusão Patrimonial Absoluta:</b> Sendo Empresário Individual (213-5), o patrimônio da pessoa física responde integralmente pelas obrigações e riscos da pessoa jurídica. Os robôs de Background Check bancário realizam o espelhamento PF/PJ imediato.<br>
        2. <b>Esteira de Prevenção à Lavagem de Dinheiro (PLD/FT):</b> Apontamentos criminais relacionados a investigações de crimes contra a vida ou organização criminosa geram "Red Flag" (Alerta Vermelho) automático no comitê de compliance de bancos comerciais e de investimento, suspendendo a concessão de crédito.
      </div>

      <div class="footer-security">
        <div>Mourato & Associados • Dossiê Pericial Confidencial • LGPD Art. 7º Inc. IX</div>
        <div>Código de Autenticidade: <code>${hashDoc}</code> • Página 1 de 2</div>
      </div>
    </div>
  </div>

  <!-- PÁGINA 2: PENDÊNCIAS REGULATÓRIAS E PLANO DE SANEAMENTO -->
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
          <div><b>TEIA DE ARANHA</b></div>
          <div>Dossiê de Inteligência & Compliance</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- PENDÊNCIAS REGULATÓRIAS E CADASTRAIS -->
      <div class="section-title">4. Matriz de Pendências Regulatórias, Fiscais e Documentais</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Área Auditada</th>
            <th>Documento / Exigência Obrigatória</th>
            <th>Situação Atual</th>
            <th>Impacto na Operação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Regulação Setorial (ANP)</b></td>
            <td>Autorização de Revendedor Varejista de GLP ativa na ANP</td>
            <td><span class="badge badge-danger">PENDENTE</span></td>
            <td>Impossibilita aprovação bancária para empresa de gás sem licença ativa.</td>
          </tr>
          <tr>
            <td><b>Fisco Estadual (SEFAZ-MG)</b></td>
            <td>Comprovante de Inscrição Estadual (Sintegra) Habilitada</td>
            <td><span class="badge badge-warning">PENDENTE CONFERÊNCIA</span></td>
            <td>Necessário para atestar emissão regular de NF-e comercial.</td>
          </tr>
          <tr>
            <td><b>CNDs Quíntuplas Oficiais</b></td>
            <td>Certidões Negativas: Federal (PGFN), Estadual, Municipal, FGTS e CNDT</td>
            <td><span class="badge badge-warning">NÃO APRESENTADAS</span></td>
            <td>Exigência legal para concessão de crédito por instituições financeiras.</td>
          </tr>
          <tr>
            <td><b>Comprovação de Faturamento</b></td>
            <td>Extrato PGDAS-D / DEFIS dos últimos 12 meses (Simples Nacional)</td>
            <td><span class="badge badge-warning">NÃO APRESENTADO</span></td>
            <td>Bancos não aceitam declarações unilaterais; exigem chancela do Fisco.</td>
          </tr>
          <tr>
            <td><b>Capital Social (JUCEMG)</b></td>
            <td>Requerimento de Empresário ou Ficha de Breve Relato</td>
            <td><span class="badge badge-warning">VALOR REGISTRADO: 0</span></td>
            <td>Mantido como 0 conforme a Regra Fundamental do Zero Dados Inventados.</td>
          </tr>
          <tr>
            <td><b>Acessos Oficiais do Titular</b></td>
            <td>Credencial Gov.br (Prata/Ouro) para extração do SCR Bacen Completo</td>
            <td><span class="badge badge-warning">PENDENTE COLETA</span></td>
            <td>Necessário para comprovar ausência de endividamento em outros bancos.</td>
          </tr>
        </tbody>
      </table>

      <!-- PLANO DE AÇÃO E SANEAMENTO -->
      <div class="section-title">5. Plano de Saneamento Técnico e Blindagem Operacional (Mourato & Associados)</div>
      <div class="alert-box alert-success">
        <b>MEDIDAS TÉCNICAS E JURÍDICAS MANDATÓRIAS PARA HABILITAR A EMPRESA:</b><br>
        1. <b>Certidões de Objeto e Pé dos Processos Criminais:</b> Requerer junto à Comarca de Conselheiro Pena (MG) as certidões narratórias atualizadas de cada ação penal, demonstrando eventual absolvição, arquivamento, suspensão condicional ou cumprimento de medidas, afastando risco de contaminação patrimonial.<br>
        2. <b>Regularização e Anexação da Licença ANP:</b> Obter o espelho de autorização de revenda no portal da Agência Nacional do Petróleo (SIMP/ANP).<br>
        3. <b>Emissão em Lote das 5 CNDs Oficiais:</b> Emitir CND Federal, Estadual (MG), Municipal, CRF/FGTS e Trabalhista (CNDT).<br>
        4. <b>Consolidação Contábil Fiscal:</b> Solicitar ao contador responsável os 12 últimos PGDAS-D para cálculo do faturamento médio mensal bancável.<br>
        5. <b>Migração Societária Recomendada (Estratégia Societária):</b> Sugerir a transformação de Empresário Individual (213-5) para Sociedade Limitada Unipessoal - SLU (206-2), estabelecendo separação patrimonial jurídica entre a pessoa de Adilson e a empresa Lima Gás.
      </div>

      <!-- PARECER PERICIAL CONCLUSIVO -->
      <div class="section-title">6. Conclusão Pericial da Assessoria</div>
      <p style="font-size: 8pt; line-height: 1.5; color: #334155;">
        Conclui-se pericialmente que a empresa <b>ADILSON DE ANDRADE LIMA - ME</b> possui excelente potencial cadastral nos birôs comerciais clássicos, porém encontra-se <b>temporariamente inabilitada para submissão direta a comitês de crédito bancário</b> em virtude do risco reputacional/forense pendente de esclarecimento documental e da ausência das licenças operacionais de GLP. A execução do plano de saneamento acima descrito é condição <i>sine qua non</i> para assegurar a aprovação de limites e blindar o usuário e a assessoria contra rejeições bancárias definitivas.
      </p>

      <!-- ASSINATURA CORPORATIVA -->
      <div style="margin-top: 25px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 7pt; color: #64748B; line-height: 1.4;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Departamento de Inteligência de Crédito, Risco & Governança<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 220px;">
          <div style="font-size: 7.5pt; font-weight: bold; color: #0B111E;">COMITÊ PERICIAL DE COMPLIANCE</div>
          <div style="font-size: 6.5pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>

      <div class="footer-security">
        <div>Mourato & Associados • Dossiê Pericial Confidencial • LGPD Art. 7º Inc. IX</div>
        <div>Código de Autenticidade: <code>${hashDoc}</code> • Página 2 de 2</div>
      </div>
    </div>
  </div>

</body>
</html>`;

  // Salva os HTMLs nas pastas de PJ e PF
  const htmlPj = path.join(pjDir, 'RELATORIO_PERICIAL_PENDENCIAS_E_COMPLIANCE.html');
  const htmlPf = path.join(pfDir, 'RELATORIO_PERICIAL_PENDENCIAS_E_COMPLIANCE.html');
  fs.writeFileSync(htmlPj, htmlContent, 'utf8');
  fs.writeFileSync(htmlPf, htmlContent, 'utf8');
  console.log('✓ HTML salvo em PJ e PF com cabeçalho oficial e marca d\'água 5.5%');

  // Compila o PDF de alta definição via Playwright
  console.log('--- Compilando PDF em Alta Definição via Chromium/Chrome ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + htmlPj.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const pdfPj1 = path.join(pjDir, 'RELATORIO_PERICIAL_PENDENCIAS_E_COMPLIANCE.pdf');
  const pdfPj2 = path.join(pjDir, 'documentos_pdf', 'RELATORIO_PERICIAL_PENDENCIAS_E_COMPLIANCE.pdf');
  const pdfPf1 = path.join(pfDir, 'RELATORIO_PERICIAL_PENDENCIAS_E_COMPLIANCE.pdf');
  const pdfPf2 = path.join(pfDir, 'documentos_pdf', 'RELATORIO_PERICIAL_PENDENCIAS_E_COMPLIANCE.pdf');

  await page.pdf({
    path: pdfPj1,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
  });

  await page.close();
  await browser.close();

  // Copia para as demais pastas obrigatórias
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

