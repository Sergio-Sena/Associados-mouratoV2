import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const BASE_TEIA = 'C:\\Teia de arranha';
const SEAL_PATH = 'C:\\Teia de arranha\\Mourato.associados\\public\\mourato-seal-circle.png';

async function main() {
  console.log('=== APLICANDO CABEÇALHO PADRÃO E MARCA D\'ÁGUA MOURATO & ASSOCIADOS ===');

  if (!fs.existsSync(SEAL_PATH)) {
    throw new Error('Brasão oficial não encontrado em: ' + SEAL_PATH);
  }

  const sealBase64 = fs.readFileSync(SEAL_PATH).toString('base64');
  const sealDataUri = `data:image/png;base64,${sealBase64}`;

  // Lista todas as pastas de ClientesPJ e ClientesPF
  const targets = [];

  ['ClientesPJ', 'ClientesPF'].forEach(group => {
    const groupDir = path.join(BASE_TEIA, group);
    if (!fs.existsSync(groupDir)) return;

    fs.readdirSync(groupDir, { withFileTypes: true }).forEach(entry => {
      if (entry.isDirectory()) {
        const clientDir = path.join(groupDir, entry.name);
        const htmlFile = path.join(clientDir, 'FICHA_CADASTRAL_E_SENHAS.html');
        const pdfFile = path.join(clientDir, 'FICHA_CADASTRAL_E_SENHAS.pdf');
        if (fs.existsSync(htmlFile)) {
          targets.push({ group, name: entry.name, htmlFile, pdfFile });
        }
      }
    });
  });

  console.log(`Encontradas ${targets.length} fichas de clientes para atualizar.`);

  // Atualiza cada arquivo HTML injetando a marca d'água e o cabeçalho padrão Mourato
  for (const t of targets) {
    let content = fs.readFileSync(t.htmlFile, 'utf8');

    // 1. Injetar CSS da marca d'água se não existir
    if (!content.includes('.watermark-mourato')) {
      const watermarkCss = `
    /* MARCA D'ÁGUA OFICIAL MOURATO & ASSOCIADOS */
    .sheet { position: relative; overflow: hidden; z-index: 1; }
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
      font-size: 14pt;
      font-weight: 800;
      color: #0B111E;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.1;
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
      `;
      content = content.replace('</style>', `${watermarkCss}\n  </style>`);
    }

    // 2. Garantir o elemento da marca d'água no corpo da folha
    if (!content.includes('class="watermark-mourato"')) {
      content = content.replace('<div class="sheet">', '<div class="sheet">\n      <div class="watermark-mourato"></div>\n      <div class="sheet-content">');
      // Fecha a tag sheet-content antes de fechar sheet
      content = content.replace(/<\/div>\s*<\/div>\s*<\/body>/, '</div>\n    </div>\n  </div>\n</body>');
    }

    // 3. Garantir o cabeçalho institucional padrão Mourato com o brasão em base64
    const standardHeader = `
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
            <div>Dossiê Cadastral & Pericial</div>
            <div>Autenticidade ICP-Brasil</div>
          </div>
        </div>`;

    // Substitui o cabeçalho existente pelo cabeçalho padrão
    content = content.replace(/<div class="header">[\s\S]*?<\/div>\s*<\/div>/, `${standardHeader}`);

    fs.writeFileSync(t.htmlFile, content, 'utf8');
    console.log(`✓ HTML atualizado com cabeçalho padrão e marca d'água: [${t.group}] ${t.name}`);
  }

  // 4. Compilar os PDFs oficiais via Playwright em alta definição
  console.log('\n--- Compilando PDFs de Alta Definição com Marca d\'Água ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  for (const t of targets) {
    const page = await browser.newPage();
    const fileUrl = 'file:///' + t.htmlFile.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await page.pdf({
      path: t.pdfFile,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
    });

    await page.close();
    console.log(`✓ PDF gerado com marca d'água: ${t.pdfFile}`);
  }

  await browser.close();
  console.log('\n=== PROCESSO CONCLUÍDO COM SUCESSO! TODOS OS DOCUMENTOS ESTÃO PADRONIZADOS! ===');
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
