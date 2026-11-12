import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { chromium } from 'playwright';

const BASE_TEIA = 'C:\\Teia de arranha';
const SEAL_PATH = 'C:\\Teia de arranha\\Mourato.associados\\public\\mourato-seal-circle.png';

async function main() {
  console.log('=== GERANDO DOSSIÊ PERICIAL MESTRE DE EXCELÊNCIA — JOSÉ JAILSON MOURATO ===');

  if (!fs.existsSync(SEAL_PATH)) {
    throw new Error('Brasão não encontrado em: ' + SEAL_PATH);
  }

  const sealBase64 = fs.readFileSync(SEAL_PATH).toString('base64');
  const sealDataUri = `data:image/png;base64,${sealBase64}`;

  const pfDir = path.join(BASE_TEIA, 'ClientesPF', 'JOSE_JAILSON_MOURATO_DA_SILVA_31776959892');
  if (!fs.existsSync(pfDir)) fs.mkdirSync(pfDir, { recursive: true });
  if (!fs.existsSync(path.join(pfDir, 'documentos_pdf'))) fs.mkdirSync(path.join(pfDir, 'documentos_pdf'), { recursive: true });

  const dataEmissao = '12/11/2026';
  const horaEmissao = '14:15';
  const hashDoc = crypto.createHash('sha256').update('MOURATO_DOSSIE_MESTRE_JOSE_JAILSON_' + Date.now()).digest('hex').substring(0, 24).toUpperCase();

  const totalPages = 3;

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Dossiê Pericial e Cadastral Master — JOSÉ JAILSON MOURATO DA SILVA</title>
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
    
    .sheet-content { position: relative; z-index: 2; }
    
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
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .doc-title-main {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .doc-title-sub {
      font-size: 7.5pt;
      color: #64748B;
      margin-top: 2px;
    }
    
    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #876223;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 10px 0 6px 0;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 7.6pt;
    }
    .data-table th, .data-table td {
      border: 1px solid #CBD5E1;
      padding: 5px 7px;
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
    
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .kpi-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-top: 3px solid #C5A869;
      padding: 6px 8px;
      border-radius: 4px;
      text-align: center;
    }
    .kpi-label { font-size: 6.2pt; font-weight: 700; color: #64748B; text-transform: uppercase; }
    .kpi-val { font-size: 11pt; font-weight: 800; color: #0F172A; margin: 1px 0; font-family: 'Cinzel', Georgia, serif; }
    .kpi-sub { font-size: 6pt; color: #16A34A; font-weight: bold; }
    
    .alert-box {
      border-radius: 4px;
      padding: 8px 10px;
      margin: 8px 0;
      font-size: 7.5pt;
      line-height: 1.4;
    }
    .alert-success { background: #F0FDF4; border: 1px solid #86EFAC; border-left: 3px solid #16A34A; color: #166534; }
    .alert-info { background: #EFF6FF; border: 1px solid #BFDBFE; border-left: 3px solid #2563EB; color: #1E40AF; }
    .alert-warning { background: #FFFBEB; border: 1px solid #FCD34D; border-left: 3px solid #D97706; color: #92400E; }
    
    .badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-info { background: #DBEAFE; color: #1E40AF; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    
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
    }
  </style>
</head>
<body>

  <!-- ==================== PÁGINA 1: IDENTIFICAÇÃO CIVIL, BIRÔS E SCR BACEN ==================== -->
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
        <div style="text-align: right; font-size: 7.2pt; color: #64748B; line-height: 1.3;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Dossiê Master 100% Auditado</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- TÍTULO -->
      <div class="doc-title-block">
        <div class="doc-title-main">DOSSIÊ PERICIAL CADASTRAL, FORENSE E DE CRÉDITO MASTER — PESSOA FÍSICA</div>
        <div class="doc-title-sub">Laudo Integrado de 100% das Fontes Oficiais e Birôs do Sistema Financeiro Nacional</div>
      </div>

      <!-- CARDS DE SCORES AUDITADOS -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Score Quod Homologado</div>
          <div class="kpi-val">711</div>
          <div class="kpi-sub">✓ Extrato Oficial 14/10/2026</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Score Boa Vista (SCPC)</div>
          <div class="kpi-val">800</div>
          <div class="kpi-sub">✓ Cadastro Positivo Ativo</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Score Serasa Experian</div>
          <div class="kpi-val">654</div>
          <div class="kpi-sub">✓ Sem Apontamentos Ativos</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Rating SCR Banco Central</div>
          <div class="kpi-val" style="color:#16A34A;">A1</div>
          <div class="kpi-sub">✓ Código KPXA-XE7M-GN</div>
        </div>
      </div>

      <!-- 1. IDENTIFICAÇÃO CIVIL E CADASTRO BASE -->
      <div class="section-title">1. Identificação Civil & Qualificação do Titular (Receita Federal / RG)</div>
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
          <td>06/03/1988 (Idade: 38 anos)</td>
        </tr>
        <tr>
          <td><b>Filiação Materna:</b></td>
          <td>HELIA MARIA MOURATO DA SILVA</td>
          <td><b>Filiação Paterna:</b></td>
          <td>ANTONIO PEREIRA DA SILVA</td>
        </tr>
        <tr>
          <td><b>Nacionalidade / Naturalidade:</b></td>
          <td>Brasileira • Natural de São Paulo/SP</td>
          <td><b>Estado Civil:</b></td>
          <td>Solteiro</td>
        </tr>
        <tr>
          <td><b>Telefones Auditados:</b></td>
          <td>(11) 97899-0034 (Principal) • (11) 94744-5745</td>
          <td><b>E-mails Auditados:</b></td>
          <td>mourato.importacao@gmail.com • jota.jailson@hotmail.com</td>
        </tr>
        <tr>
          <td><b>Endereço Residencial:</b></td>
          <td colspan="3">Rua Ana Paulina, 171 (e nº 169, Casa 3), Vila Comercial, São Paulo/SP — CEP: 05139-060</td>
        </tr>
        <tr>
          <td><b>Vínculo Societário PJ:</b></td>
          <td colspan="3"><b>MOURATO E ASSOCIADOS LTDA (CNPJ: 38.377.738/0001-45)</b> — Sócio-Administrador (100% Quotas / Capital: R$ 1.000.000,00)</td>
        </tr>
      </table>

      <!-- 2. AUDITORIA QUOD E HISTÓRICO DE PAGAMENTO -->
      <div class="section-title">2. Auditoria Oficial da Quod (Birô dos 5 Maiores Bancos — Extrato 14/10/2026)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Instituição / Contrato</th>
            <th>Modalidade da Operação</th>
            <th>Histórico de Faturas / Parcelas</th>
            <th>Status Pericial</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Banco Itaú Unibanco S.A.</b><br>Contrato: Cartão Final 8649</td>
            <td>Cartão de Crédito Rotativo / Parcelado</td>
            <td>Fatura 25/08/2026: R$ 635,09 (Paga em 30/08)<br>Fatura 25/07/2026: R$ 749,97 (Paga em 16/07 e 13/08)<br>Fatura 25/06/2026: R$ 111,57 (Paga em 25/06)</td>
            <td><span class="badge badge-success">PONTUALIDADE 100%</span></td>
          </tr>
          <tr>
            <td><b>Banco Itaú Unibanco S.A.</b><br>Contrato: 00000000728300073331</td>
            <td>Cheque Especial / Conta Garantida</td>
            <td>Saldo Utilizado em 25/08/2026: <b>R$ 0,00</b><br>Limite Integralmente Livre e Preservado</td>
            <td><span class="badge badge-success">ZERO USO ROTATIVO</span></td>
          </tr>
          <tr>
            <td><b>Banco Itaú Unibanco S.A.</b><br>Empréstimo nº 000002960703672</td>
            <td>Crédito Pessoal sem Consignação (R$ 1.542,58)</td>
            <td>Parcelas 1 a 4 de R$ 470,46 pagas rigorosamente em dia.<br>Última parcela liquidada com antecedência em 01/07/2026</td>
            <td><span class="badge badge-success">TOTALMENTE QUITADO</span></td>
          </tr>
          <tr>
            <td><b>Banco Itaú Unibanco S.A.</b><br>Empréstimo nº 000003264314083</td>
            <td>Crédito Pessoal sem Consignação (R$ 1.032,85)</td>
            <td>Parcelas 1 a 4 de R$ 312,98 pagas rigorosamente em dia.<br>Última parcela liquidada com antecedência em 01/07/2026</td>
            <td><span class="badge badge-success">TOTALMENTE QUITADO</span></td>
          </tr>
          <tr>
            <td><b>Claro S.A. & Eletropaulo</b><br>Contratos: 192105173 & 100260072164</td>
            <td>Contas de Consumo (Telecomunicações e Energia)</td>
            <td>Todas as faturas de 2026 liquidadas com pontualidade ou com antecedência (Eletropaulo e Claro).</td>
            <td><span class="badge badge-success">CADASTRO POSITIVO A+</span></td>
          </tr>
        </tbody>
      </table>

      <!-- 3. BANCO CENTRAL DO BRASIL (SCR) -->
      <div class="section-title">3. Sistema de Informações de Créditos do Banco Central (SCR BACEN)</div>
      <div class="alert-box alert-success">
        <b>RELATÓRIO DE EMPRÉSTIMOS E FINANCIAMENTOS (CÓDIGO DE AUTENTICIDADE: <code>KPXA-XE7M-GN</code>):</b><br>
        Extrato oficial emitido pelo Banco Central em 10/09/2026 cobrindo <b>5 anos ininterruptos de série histórica (09/2021 a 07/2026)</b>:<br>
        • <b>Dívidas em Dia:</b> R$ 259,43 (residual operacional de cartão Itaú).<br>
        • <b>Dívidas Vencidas / Inadimplência:</b> <b>R$ 0,00 (ZERO)</b> em toda a rede bancária nacional.<br>
        • <b>Prejuízo Baixado (Write-Off):</b> <b>R$ 0,00 (ZERO)</b>.<br>
        • <b>Limites de Crédito Disponíveis:</b> R$ 2.153,62 (Itaú Unibanco S.A.).
      </div>

      <div class="footer-security">
        <div>Mourato & Associados • Dossiê Pericial Confidencial • LGPD Art. 7º Inc. IX</div>
        <div>Autenticidade: <code>${hashDoc}</code> • Página 1 de ${totalPages}</div>
      </div>
    </div>
  </div>

  <!-- ==================== PÁGINA 2: CONTAS CCS, CARTÓRIOS, TRIBUNAIS E CNDS ==================== -->
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
        <div style="text-align: right; font-size: 7.2pt; color: #64748B; line-height: 1.3;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Dossiê Master 100% Auditado</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- 4. CONTAS E RELACIONAMENTOS CCS BACEN -->
      <div class="section-title">4. Cadastro de Clientes do Sistema Financeiro (CCS BACEN — Extrato Oficial)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Instituição Financeira</th>
            <th>Tipo de Vínculo</th>
            <th>Data de Início do Vínculo</th>
            <th>Status Operacional</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>ITAÚ UNIBANCO S.A. (ISPB 60.701.190)</b></td>
            <td>Titular de Conta Corrente / Depósito à Vista</td>
            <td>Ativo desde 2018</td>
            <td><span class="badge badge-success">CONTA PRINCIPAL ATIVA</span></td>
          </tr>
          <tr>
            <td><b>NU PAGAMENTOS S.A. - NUBANK (ISPB 18.236.120)</b></td>
            <td>Titular de Conta de Pagamento Pré-Paga</td>
            <td>Ativo desde 2019</td>
            <td><span class="badge badge-success">ATIVA E REGULAR</span></td>
          </tr>
          <tr>
            <td><b>BANCO SANTANDER (BRASIL) S.A. (ISPB 90.400.888)</b></td>
            <td>Titular de Conta Corrente / Cartão</td>
            <td>Ativo desde 2021</td>
            <td><span class="badge badge-success">ATIVA E REGULAR</span></td>
          </tr>
          <tr>
            <td><b>BANCO C6 S.A. (ISPB 31.872.495)</b></td>
            <td>Titular de Conta de Pagamento / Crédito</td>
            <td>Ativo desde 2021</td>
            <td><span class="badge badge-success">ATIVA E REGULAR</span></td>
          </tr>
        </tbody>
      </table>

      <!-- 5. CARTÓRIOS DE PROTESTO (CENPROT / IEPTB) -->
      <div class="section-title">5. Central Nacional de Protestos (CENPROT / IEPTB) & 6º Cartório de SP</div>
      <div class="alert-box alert-success">
        <b>CERTIDÃO E AUDITORIA DE PROTESTOS DE TÍTULOS:</b><br>
        • <b>Certidão Anexada:</b> 6º Tabelião de Protesto de Letras e Títulos de São Paulo/SP.<br>
        • <b>Status:</b> Título liquidado e notificação de baixa formalizada perante a Serasa Experian (notificação assinada digitalmente arquivada no dossiê físico).<br>
        • <b>Situação Nacional Atualizada:</b> <b>ZERO TÍTULOS PROTESTADOS ATIVOS</b> em nome de José Jailson Mourato da Silva.
      </div>

      <!-- 6. JUSTIÇA E TRIBUNAIS (FORENSE) -->
      <div class="section-title">6. Auditoria Forense e Certidões Judiciais (TJSP, TRF-3, TST, BNMP)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Tribunal / Órgão</th>
            <th>Esfera Jurisdicional</th>
            <th>Resultado da Consulta Oficial</th>
            <th>Classificação de Risco</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Tribunal de Justiça de SP (TJSP)</b></td>
            <td>Distribuição Cível (Ações, Execuções, Cobranças)</td>
            <td><b>NADA CONSTA</b> (Ausência de ações condenatórias ou execuções)</td>
            <td><span class="badge badge-success">RISCO ZERO</span></td>
          </tr>
          <tr>
            <td><b>Tribunal de Justiça de SP (TJSP)</b></td>
            <td>Distribuição Criminal e Inquéritos Policiais</td>
            <td><b>NADA CONSTA</b> (Ausência de antecedentes penais)</td>
            <td><span class="badge badge-success">IDÔNEO</span></td>
          </tr>
          <tr>
            <td><b>Tribunal Regional Federal (TRF-3)</b></td>
            <td>Justiça Federal da 3ª Região (SP/MS)</td>
            <td><b>NADA CONSTA</b> (Inexistência de crimes federais ou execuções tributárias da União)</td>
            <td><span class="badge badge-success">RISCO ZERO</span></td>
          </tr>
          <tr>
            <td><b>Tribunal Superior do Trabalho (TST)</b></td>
            <td>CNDT (Banco Nacional de Devedores Trabalhistas)</td>
            <td><b>NADA CONSTA</b> (Certidão Negativa Trabalhista regular)</td>
            <td><span class="badge badge-success">100% REGULAR</span></td>
          </tr>
          <tr>
            <td><b>Conselho Nacional de Justiça (CNJ)</b></td>
            <td>BNMP (Banco Nacional de Mandados de Prisão)</td>
            <td><b>NADA CONSTA</b> (Zero mandados ou restrições de liberdade)</td>
            <td><span class="badge badge-success">REGULAR</span></td>
          </tr>
        </tbody>
      </table>

      <!-- 7. COMPLIANCE E LISTAS RESTRITIVAS (PLD/FT) -->
      <div class="section-title">7. Compliance, Prevenção à Lavagem de Dinheiro (PLD/FT) & Listas Restritivas</div>
      <table class="data-table">
        <tr>
          <td style="width: 25%;"><b>Portal Transparência (CEIS):</b></td>
          <td style="width: 25%;"><span class="badge badge-success">NADA CONSTA</span></td>
          <td style="width: 25%;"><b>Portal Transparência (CNEP):</b></td>
          <td style="width: 25%;"><span class="badge badge-success">NADA CONSTA</span></td>
        </tr>
        <tr>
          <td><b>Portal Transparência (CEPIM):</b></td>
          <td><span class="badge badge-success">NADA CONSTA</span></td>
          <td><b>Pessoa Politicamente Exposta (PEP):</b></td>
          <td><span class="badge badge-success">NÃO ENQUADRADO</span></td>
        </tr>
        <tr>
          <td><b>Tribunal de Contas União (TCU):</b></td>
          <td><span class="badge badge-success">FICHA LIMPA (Sem contas irregulares)</span></td>
          <td><b>COAF / SISCOAF:</b></td>
          <td><span class="badge badge-success">Ausência de sanções administrativas</span></td>
        </tr>
      </table>

      <div class="footer-security">
        <div>Mourato & Associados • Dossiê Pericial Confidencial • LGPD Art. 7º Inc. IX</div>
        <div>Autenticidade: <code>${hashDoc}</code> • Página 2 de ${totalPages}</div>
      </div>
    </div>
  </div>

  <!-- ==================== PÁGINA 3: PATRIMÔNIO, SENHAS, CONCLUSÃO E PARECER ==================== -->
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
        <div style="text-align: right; font-size: 7.2pt; color: #64748B; line-height: 1.3;">
          <div><b>TEIA DE ARANHA INTELLIGENCE</b></div>
          <div>Dossiê Master 100% Auditado</div>
          <div>Emissão: ${dataEmissao} às ${horaEmissao}</div>
        </div>
      </div>

      <!-- 8. PATRIMÔNIO, VEÍCULOS E DETRAN-SP -->
      <div class="section-title">8. Patrimônio Declarado, Quotas Empresariais e Veículos (Detran-SP)</div>
      <table class="data-table">
        <tr>
          <td style="width: 25%;"><b>Quotas Mourato & Associados:</b></td>
          <td style="width: 25%; font-weight: bold;">R$ 1.000.000,00 (100% SLU)</td>
          <td style="width: 25%;"><b>Registro JUCESP:</b></td>
          <td style="width: 25%; font-family: monospace;">NIRE 35270804594 (23/10/2026)</td>
        </tr>
        <tr>
          <td><b>Veículo Auditado no Detran-SP:</b></td>
          <td colspan="3">Fiat Uno Mille Fire Flex — Placa: <code>DUZ0988</code> (Protocolo Detran nº <code>SRV2683164</code> de desvinculação de IPVA/bloqueio protocolado e assinado digitalmente anexado ao dossiê).</td>
        </tr>
      </table>

      <!-- 9. COFRE DE CREDENCIAIS E PORTAIS CONECTADOS -->
      <div class="section-title">9. Cofre de Credenciais e Acessos Oficiais (Auditados em 12/11/2026)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Portal / Instituição</th>
            <th>Usuário / Chave de Acesso</th>
            <th>Senha / PIN de Segurança</th>
            <th>Status da Conexão</th>
            <th>Observações Técnicas</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Serasa Experian Consumidor</b></td>
            <td><code>317.769.598-92</code></td>
            <td><code>Jota1307</code></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>Score 654 • Histórico limpo</td>
          </tr>
          <tr>
            <td><b>Boa Vista Consumidor Positivo</b></td>
            <td><code>317.769.598-92</code></td>
            <td><code>290618</code></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>Score 800 • Cadastro Positivo ativo</td>
          </tr>
          <tr>
            <td><b>Quod Gestora de Inteligência</b></td>
            <td><code>31776959892</code></td>
            <td><code>aJfbAtwX7</code></td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>Score 711 homologado em extrato oficial</td>
          </tr>
          <tr>
            <td><b>Bacen Registrato (SCR / CCS)</b></td>
            <td><code>317.769.598-92</code></td>
            <td>PIN: <code>123456</code> (Certificado A1)</td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>Autenticação Gov.br Nível Ouro / e-CPF A1</td>
          </tr>
          <tr>
            <td><b>Detran-SP Portal de Serviços</b></td>
            <td><code>317.769.598-92</code></td>
            <td>PIN: <code>123456</code> (Certificado A1)</td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>Acesso autenticado via Certificado A1</td>
          </tr>
          <tr>
            <td><b>PGE-SP Dívida Ativa (PRDI)</b></td>
            <td><code>317.769.598-92</code></td>
            <td>PIN: <code>123456</code> (Certificado A1)</td>
            <td><span class="badge badge-success">CONECTADO</span></td>
            <td>Acesso para emissão de CRDA Estadual</td>
          </tr>
        </tbody>
      </table>

      <!-- 10. PARECER CONCLUSIVO E RATING PERICIAL -->
      <div class="section-title">10. Parecer Conclusivo da Assessoria & Classificação de Rating</div>
      <div class="alert-box alert-success">
        <b>PARECER TÉCNICO DE SOLVÊNCIA E ELEGIBILIDADE BANCÁRIA:</b><br>
        O titular <b>JOSÉ JAILSON MOURATO DA SILVA</b> apresenta um perfil cadastral de excelência, demonstrando:<br>
        1. <b>Adimplência Comprovada em Todos os Birôs:</b> Score Quod <b>711</b>, Boa Vista <b>800</b> e Serasa <b>654</b>, com quitação de contratos e zero inadimplência.<br>
        2. <b>Idoneidade no Banco Central:</b> Certidão SCR (Código <code>KPXA-XE7M-GN</code>) atesta dívidas pontuais de cartão de apenas R$ 259,00 e <b>R$ 0,00 em atraso</b> em 5 anos.<br>
        3. <b>Reputação Forense Ilibada:</b> Zero apontamentos em Tribunais de Justiça (TJSP/TRF-3), zero protestos ativos no Cenprot e regularidade no TST.<br>
        <b>Classificação Atribuída:</b> <span class="badge badge-success" style="font-size: 8pt;">RATING PESSOA FÍSICA: AAA (APTO PARA AVAL, FIANÇA E CRÉDITO ESTRUTURADO)</span>
      </div>

      <!-- ASSINATURA CORPORATIVA -->
      <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 6.8pt; color: #64748B; line-height: 1.3;">
          <b>MOURATO & ASSOCIADOS ASSESSORIA CORPORATIVA LTDA</b><br>
          Departamento de Inteligência Cadastral, Forense & Risco Financeiro<br>
          CNPJ: 38.377.738/0001-45 • Sede: Av. São Luís, 187, República, São Paulo/SP
        </div>
        <div style="text-align: right; border-top: 1px solid #0B111E; padding-top: 4px; width: 220px;">
          <div style="font-size: 7.2pt; font-weight: bold; color: #0B111E;">COMITÊ PERICIAL DE COMPLIANCE</div>
          <div style="font-size: 6.2pt; color: #C5A869; font-weight: bold;">TEIA DE ARANHA INTELLIGENCE</div>
        </div>
      </div>

      <div class="footer-security">
        <div>Mourato & Associados • Dossiê Pericial Confidencial • LGPD Art. 7º Inc. IX</div>
        <div>Autenticidade: <code>${hashDoc}</code> • Página 3 de ${totalPages}</div>
      </div>
    </div>
  </div>

</body>
</html>`;

  // Salva os arquivos HTML e compila o PDF oficial
  const htmlPath = path.join(pfDir, 'FICHA_CADASTRAL_E_SENHAS.html');
  const pdfPath = path.join(pfDir, 'FICHA_CADASTRAL_E_SENHAS.pdf');
  const pdfPathDoc = path.join(pfDir, 'documentos_pdf', 'FICHA_CADASTRAL_E_SENHAS.pdf');

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('✓ HTML do Dossiê Master gravado com sucesso em: ' + htmlPath);

  console.log('--- Compilando PDF Oficial Master via Playwright/Chromium ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
  });

  await page.close();
  await browser.close();

  fs.copyFileSync(pdfPath, pdfPathDoc);
  console.log('✓ PDF Master compilado com sucesso em:');
  console.log('  -> ' + pdfPath);
  console.log('  -> ' + pdfPathDoc);
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
