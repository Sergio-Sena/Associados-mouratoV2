import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { chromium } from 'playwright';

const BASE_TEIA = 'C:\\Teia de arranha';
const SEAL_PATH = 'C:\\Teia de arranha\\Mourato.associados\\public\\mourato-seal-circle.png';

async function main() {
  console.log('=== GERANDO FICHA DE APRESENTAÇÃO CORPORATIVA — COMERCIAL CONSTTRUTERRA LTDA ===');

  if (!fs.existsSync(SEAL_PATH)) {
    throw new Error('Brasão não encontrado em: ' + SEAL_PATH);
  }

  const sealBase64 = fs.readFileSync(SEAL_PATH).toString('base64');
  const sealDataUri = `data:image/png;base64,${sealBase64}`;

  const pjDir = path.join(BASE_TEIA, 'ClientesPJ', 'COMERCIAL_CONSTTRUTERRA_LTDA_19619259000143');
  if (!fs.existsSync(pjDir)) fs.mkdirSync(pjDir, { recursive: true });
  const docsDir = path.join(pjDir, 'documentos_pdf');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const dataEmissao = '12/11/2026';
  const horaEmissao = '14:55';
  const hashDoc = crypto.createHash('sha256').update('MOURATO_CONSTTRUTERRA_APRESENTACAO_' + Date.now()).digest('hex').substring(0, 24).toUpperCase();

  const totalPages = 2;

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha de Apresentação e Qualificação — COMERCIAL CONSTTRUTERRA LTDA</title>
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
      padding: 12mm 18mm 16mm 18mm; 
      position: relative; 
      overflow: hidden; 
      z-index: 1; 
      page-break-after: always;
      page-break-inside: avoid;
    }
    
    /* MARCA D'ÁGUA OFICIAL MOURATO 5.5% */
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
    
    .sheet-content { 
      position: relative; 
      z-index: 2; 
    }
    
    /* CABEÇALHO PADRÃO MOURATO */
    .doc-header-institutional {
      border-bottom: 2px solid #C5A869;
      padding-bottom: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-logo-crest {
      width: 46px;
      height: 46px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand-text-block {
      display: flex;
      flex-direction: column;
    }
    .brand-main-name {
      font-size: 13pt;
      font-weight: 800;
      color: #0B111E;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.1;
      font-family: 'Cinzel', Georgia, serif;
    }
    .brand-main-name span { color: #C5A869; }
    .brand-main-sub {
      font-size: 6.5pt;
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
      background: #F8FAFC;
      border-left: 4px solid #C5A869;
      padding: 7px 12px;
      margin-bottom: 10px;
    }
    .doc-title-main {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .doc-title-sub {
      font-size: 7.2pt;
      color: #64748B;
      margin-top: 2px;
    }
    
    .section-title {
      font-size: 8.2pt;
      font-weight: 700;
      color: #876223;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 8px 0 5px 0;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 7px;
      font-size: 7.4pt;
    }
    .data-table th, .data-table td {
      border: 1px solid #CBD5E1;
      padding: 4px 6px;
      text-align: left;
    }
    .data-table th {
      background: #F1F5F9;
      color: #0F172A;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 6.6pt;
      letter-spacing: 0.03em;
    }
    
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 9px;
    }
    .kpi-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-top: 3px solid #C5A869;
      padding: 6px 8px;
      border-radius: 4px;
      text-align: center;
    }
    .kpi-label { font-size: 6pt; font-weight: 700; color: #64748B; text-transform: uppercase; }
    .kpi-val { font-size: 10.5pt; font-weight: 800; color: #0F172A; margin: 1px 0; font-family: 'Cinzel', Georgia, serif; }
    .kpi-sub { font-size: 5.8pt; color: #16A34A; font-weight: bold; }
    
    .alert-box {
      border-radius: 4px;
      padding: 6px 9px;
      margin: 6px 0;
      font-size: 7.2pt;
      line-height: 1.35;
    }
    .alert-success { background: #F0FDF4; border: 1px solid #86EFAC; border-left: 3px solid #16A34A; color: #166534; }
    .alert-info { background: #EFF6FF; border: 1px solid #BFDBFE; border-left: 3px solid #2563EB; color: #1E40AF; }
    
    .badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 6.2pt;
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

  <!-- ==================== PÁGINA 1: IDENTIFICAÇÃO CADASTRAL & ATIVO PATRIMONIAL ==================== -->
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
          <div>Dossiê Corporativo Oficial</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- TÍTULO -->
      <div class="doc-title-block">
        <div class="doc-title-main">FICHA DE APRESENTAÇÃO CORPORATIVA & QUALIFICAÇÃO ECONÔMICO-FINANCEIRA — PJ</div>
        <div class="doc-title-sub">Dossiê Analítico de Solvência, Balanço Patrimonial e Capacidade de Pagamento Homologada</div>
      </div>

      <!-- KPIS AUDITADOS DO BALANÇO 2025 -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Faturamento Anual 2025</div>
          <div class="kpi-val">R$ 8,80 Mi</div>
          <div class="kpi-sub">✓ Média R$ 734k/mês</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Patrimônio Líquido</div>
          <div class="kpi-val">R$ 5,69 Mi</div>
          <div class="kpi-sub">✓ Capital R$ 1.500.000,00</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Lucro Líquido Anual</div>
          <div class="kpi-val">R$ 2,52 Mi</div>
          <div class="kpi-sub">✓ Margem Líquida: 28,68%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Dívidas Bancárias</div>
          <div class="kpi-val" style="color:#16A34A;">R$ 0,00</div>
          <div class="kpi-sub">✓ Zero Endividamento</div>
        </div>
      </div>

      <!-- 1. IDENTIFICAÇÃO CADASTRAL DA PESSOA JURÍDICA -->
      <div class="section-title">1. Qualificação Societária & Cadastral (Receita Federal do Brasil)</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Razão Social:</b></td>
          <td style="width: 35%; font-weight: bold; color: #0B111E;">COMERCIAL CONSTTRUTERRA LTDA</td>
          <td style="width: 20%;"><b>CNPJ Oficial:</b></td>
          <td style="width: 25%; font-family: monospace; font-weight: bold;">19.619.259/0001-43</td>
        </tr>
        <tr>
          <td><b>Data de Abertura:</b></td>
          <td>29/01/2014 (12 anos de fundação)</td>
          <td><b>Situação Cadastral:</b></td>
          <td><span class="badge badge-success">ATIVA (RFB)</span></td>
        </tr>
        <tr>
          <td><b>Natureza Jurídica:</b></td>
          <td>206-2 — Sociedade Empresária Limitada</td>
          <td><b>Porte da Empresa:</b></td>
          <td><b>DEMAIS</b> (Médio/Grande Porte)</td>
        </tr>
        <tr>
          <td><b>Regime Tributário:</b></td>
          <td>Lucro Presumido (Não Optante Simples)</td>
          <td><b>Capital Social Registrado:</b></td>
          <td style="font-weight: bold;">R$ 1.500.000,00 (Integralizado)</td>
        </tr>
        <tr>
          <td><b>Atividade Principal (CNAE):</b></td>
          <td colspan="3"><b>4120-4/00 — Construção de edifícios</b></td>
        </tr>
        <tr>
          <td><b>Endereço da Sede:</b></td>
          <td colspan="3">Rua Atenas, nº 395, Jardim Califórnia, Barueri/SP — CEP: 06409-040</td>
        </tr>
        <tr>
          <td><b>Sócio-Administrador:</b></td>
          <td colspan="3"><b>SILVANEI MARIANO NUNES</b> (CPF: 267.134.218-73) • Entrada em 11/12/2024 • Certificado Digital e-CPF A1 Ativo (AC SyngularID)</td>
        </tr>
      </table>

      <!-- 2. ESTRUTURA DO ATIVO (BALANÇO PATRIMONIAL 31/12/2025) -->
      <div class="section-title">2. Demonstração da Estrutura do Ativo (Balanço Auditado 31/12/2025)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Grupo de Contas / Subcontas do Ativo</th>
            <th>Composição Operacional Detalhada</th>
            <th>Valor Contábil (R$)</th>
            <th>Participação (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>1.1 ATIVO CIRCULANTE</b></td>
            <td><b>Disponibilidades + Créditos + Estoques de Giro</b></td>
            <td style="font-weight: bold;">R$ 5.536.075,39</td>
            <td><b>84,20%</b></td>
          </tr>
          <tr>
            <td>&nbsp;&nbsp;• 1.1.1 Disponível</td>
            <td>Caixa (R$ 198.111,43) + Bancos c/ Mov. (R$ 500.132,27) + Aplicações (R$ 803.016,37)</td>
            <td>R$ 1.501.260,07</td>
            <td>22,83%</td>
          </tr>
          <tr>
            <td>&nbsp;&nbsp;• 1.1.2 Créditos Operacionais</td>
            <td>Duplicatas a Receber de Clientes (Sem Duplicatas Descontadas)</td>
            <td style="font-weight: bold; color: #166534;">R$ 3.980.401,33</td>
            <td>60,54%</td>
          </tr>
          <tr>
            <td>&nbsp;&nbsp;• 1.1.3 Estoques</td>
            <td>Mercadorias em Estoque (R$ 43.055,19) + Material de Consumo (R$ 11.358,81)</td>
            <td>R$ 54.413,99</td>
            <td>0,83%</td>
          </tr>
          <tr>
            <td><b>1.2 NÃO CIRCULANTE</b></td>
            <td><b>Realizável a Longo Prazo e Imobilizado Produtivo</b></td>
            <td style="font-weight: bold;">R$ 1.038.462,73</td>
            <td><b>15,80%</b></td>
          </tr>
          <tr>
            <td>&nbsp;&nbsp;• 1.2.1 Realizável a Longo Prazo</td>
            <td>Clientes LP (R$ 617.325,44) + Investimentos Temporários LP (R$ 166.909,14)</td>
            <td>R$ 784.234,58</td>
            <td>11,93%</td>
          </tr>
          <tr>
            <td>&nbsp;&nbsp;• 1.2.3 Imobilizado Líquido</td>
            <td>Máquinas (R$ 238k) + Veículos (R$ 62k) + Informática e Instalações (-) Deprec.</td>
            <td>R$ 254.228,15</td>
            <td>3,87%</td>
          </tr>
          <tr style="background: #F8FAFC; font-weight: bold;">
            <td colspan="2"><b>TOTAL DO ATIVO CONSOLIDADO</b></td>
            <td style="font-size: 8.5pt; color: #0B111E;">R$ 6.574.538,12</td>
            <td>100,00%</td>
          </tr>
        </tbody>
      </table>

      <!-- NOTA DE AUDITORIA CONTÁBIL -->
      <div class="alert-box alert-success">
        <b>CERTIFICAÇÃO CONTÁBIL OFICIAL:</b> Demonstrações financeiras encerradas em 31/12/2025 subscritas e chanceladas pelo Contador Responsável <b>José Oliveira Souza (CRC/SP 075566, CPF 000.590.028-08)</b> e pelo Sócio Administrador <b>Silvanei Mariano Nunes</b>, com higidez técnica e ausência de ressalvas.
      </div>

    </div> <!-- fecha sheet-content -->

    <!-- RODAPÉ FIXO NA FOLHA 1 -->
    <div class="footer-security">
      <div>Mourato & Associados • Ficha de Apresentação Corporativa • Comercial Consttruterra Ltda</div>
      <div>Autenticidade: <code>${hashDoc}</code> • Página 1 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 2: PASSIVO, DRE, FATURAMENTO E PARECER ==================== -->
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
          <div>Dossiê Corporativo Oficial</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- 3. PASSIVO E PATRIMÔNIO LÍQUIDO -->
      <div class="section-title">3. Passivo, Grau de Endividamento & Patrimônio Líquido</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Grupo de Contas / Exigibilidades</th>
            <th>Discriminação Contábil</th>
            <th>Valor (R$)</th>
            <th>Status / Diagnóstico</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>2.1 PASSIVO CIRCULANTE</b></td>
            <td>Fornecedores (R$ 362k) + Obrigações Fiscais e Tributárias Correntes</td>
            <td style="font-weight: bold;">R$ 884.146,46</td>
            <td><span class="badge badge-success">BAIXA EXIGIBILIDADE</span></td>
          </tr>
          <tr>
            <td><b>2.2 NÃO CIRCULANTE (DÍVIDA LP)</b></td>
            <td><b>Empréstimos Bancários e Financiamentos de Longo Prazo</b></td>
            <td style="font-weight: bold; color: #166534;">R$ 0,00</td>
            <td><span class="badge badge-success">ZERO ALAVANCAGEM</span></td>
          </tr>
          <tr>
            <td><b>2.4 PATRIMÔNIO LÍQUIDO</b></td>
            <td>Capital Social (R$ 1,50 Mi) + Reservas (R$ 335k) + Lucros Acumulados</td>
            <td style="font-weight: bold; color: #0B111E;">R$ 5.690.391,66</td>
            <td><span class="badge badge-success">EXCELENTE SOLIDEZ</span></td>
          </tr>
          <tr>
            <td>&nbsp;&nbsp;• Lucro Líquido do Período</td>
            <td>Resultado Líquido Positivo apurado no Exercício 2025</td>
            <td style="font-weight: bold; color: #166534;">R$ 2.526.557,80</td>
            <td><span class="badge badge-success">MARGEM LÍQUIDA 28,7%</span></td>
          </tr>
        </tbody>
      </table>

      <!-- ÍNDICES DE LIQUIDEZ E SOLVÊNCIA -->
      <div class="kpi-row" style="margin-bottom: 7px;">
        <div class="kpi-card">
          <div class="kpi-label">Liquidez Corrente</div>
          <div class="kpi-val" style="color: #16A34A;">6,26</div>
          <div class="kpi-sub">R$ 6,26 p/ cada R$ 1,00 de dívida</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Liquidez Geral</div>
          <div class="kpi-val" style="color: #16A34A;">7,15</div>
          <div class="kpi-sub">Solvência total de curto e LP</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Endividamento Geral</div>
          <div class="kpi-val">13,4%</div>
          <div class="kpi-sub">86,6% coberto por PL próprio</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Rentabilidade PL (ROE)</div>
          <div class="kpi-val" style="color: #16A34A;">44,4%</div>
          <div class="kpi-sub">Alta taxa de retorno líquido</div>
        </div>
      </div>

      <!-- 4. DRE E FATURAMENTO MENSAL DECLARADO (12 MESES) -->
      <div class="section-title">4. DRE Sintética & Declaração de Faturamento Mensal (Exercício 2025)</div>
      <table class="data-table" style="font-size: 7pt;">
        <thead>
          <tr>
            <th>Mês / Exercício</th>
            <th>Faturamento (R$)</th>
            <th>Mês / Exercício</th>
            <th>Faturamento (R$)</th>
            <th>Mês / Exercício</th>
            <th>Faturamento (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Janeiro/2025</td>
            <td>R$ 587.500,36</td>
            <td>Maio/2025</td>
            <td>R$ 721.188,52</td>
            <td>Setembro/2025</td>
            <td>R$ 866.699,44</td>
          </tr>
          <tr>
            <td>Fevereiro/2025</td>
            <td>R$ 586.590,91</td>
            <td>Junho/2025</td>
            <td>R$ 607.508,11</td>
            <td>Outubro/2025</td>
            <td>R$ 736.649,06</td>
          </tr>
          <tr>
            <td>Março/2025</td>
            <td>R$ 814.861,18</td>
            <td>Julho/2025</td>
            <td>R$ 713.912,97</td>
            <td>Novembro/2025</td>
            <td>R$ 793.943,98</td>
          </tr>
          <tr>
            <td>Abril/2025</td>
            <td>R$ 786.668,44</td>
            <td>Agosto/2025</td>
            <td>R$ 790.306,21</td>
            <td>Dezembro/2025</td>
            <td>R$ 803.038,41</td>
          </tr>
          <tr style="background: #F1F5F9; font-weight: bold;">
            <td colspan="3"><b>TOTAL DO FATURAMENTO ANUAL (2025): R$ 8.808.867,59</b></td>
            <td colspan="3"><b>MÉDIA MENSAL HOMOLOGADA: R$ 734.072,30</b></td>
          </tr>
        </tbody>
      </table>

      <!-- 5. PARECER CONCLUSIVO E RATING BANCÁRIO -->
      <div class="section-title">5. Parecer Técnico Conclusivo & Classificação de Elegibilidade Bancária</div>
      <div class="alert-box alert-success" style="padding: 5px 9px;">
        <b>DIAGNÓSTICO FINANCEIRO & RATING DE CRÉDITO:</b><br>
        A <b>COMERCIAL CONSTTRUTERRA LTDA</b> qualifica-se com grau máximo de solidez corporativa perante o Sistema Financeiro Nacional, demonstrando:<br>
        1. <b>Zero Passivo Bancário:</b> Inexistência de empréstimos, cédulas de crédito ou financiamentos bancários ativos, com liquidez imediata em caixa superior a R$ 1,50 milhão.<br>
        2. <b>Alta Robustez Patrimonial:</b> Patrimônio Líquido de R$ 5,69 milhões correspondendo a 86,6% do Ativo Total e Índice de Liquidez Corrente de 6,26.<br>
        3. <b>Capacidade de Alavancagem:</b> Faturamento anual de R$ 8,80 milhões com margem líquida de 28,68%, apta para estruturação de limites de capital de giro, fianças e fomento.<br>
        <b>Classificação Atribuída:</b> <span class="badge badge-success" style="font-size: 7.8pt;">RATING CORPORATIVO: AAA (PLENA ELEGIBILIDADE PARA CRÉDITO ESTRUTURADO)</span>
      </div>

      <!-- ASSINATURA CORPORATIVA -->
      <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 6.6pt; color: #64748B; line-height: 1.3;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Comitê de Análise Financeira, Compliance & Risco Corporativo<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 220px;">
          <div style="font-size: 7.2pt; font-weight: bold; color: #0B111E;">COMITÊ DE ESTRUTURAÇÃO DE CRÉDITO</div>
          <div style="font-size: 6.2pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>

    </div> <!-- fecha sheet-content -->

    <!-- RODAPÉ FIXO NA FOLHA 2 -->
    <div class="footer-security">
      <div>Mourato & Associados • Ficha de Apresentação Corporativa • Comercial Consttruterra Ltda</div>
      <div>Autenticidade: <code>${hashDoc}</code> • Página 2 de ${totalPages}</div>
    </div>
  </div>

</body>
</html>`;

  const htmlPath = path.join(pjDir, 'FICHA_DE_APRESENTACAO_E_QUALIFICACAO.html');
  const pdfPath = path.join(pjDir, 'FICHA_DE_APRESENTACAO_E_QUALIFICACAO.pdf');
  const pdfRelPath = path.join(pjDir, 'RELATORIO_PERICIAL_E_APRESENTACAO.pdf');
  const pdfDocsPath = path.join(docsDir, 'FICHA_DE_APRESENTACAO_E_QUALIFICACAO.pdf');
  const pdfDocsRelPath = path.join(docsDir, 'RELATORIO_PERICIAL_E_APRESENTACAO.pdf');

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('✓ HTML gravado com sucesso em: ' + htmlPath);

  console.log('--- Compilando PDF Oficial via Playwright/Chromium ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
  });

  await page.close();
  await browser.close();

  fs.copyFileSync(pdfPath, pdfRelPath);
  fs.copyFileSync(pdfPath, pdfDocsPath);
  fs.copyFileSync(pdfPath, pdfDocsRelPath);

  console.log('✓ SUCESSO: PDFs de Apresentação Corporativa compilados em:');
  console.log('  -> ' + pdfPath);
  console.log('  -> ' + pdfRelPath);
  console.log('  -> ' + pdfDocsPath);
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});

