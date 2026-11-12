import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const TARGETS = [
  {
    tipo: 'PJ - LIMA GÁS',
    html: 'C:\\Teia de arranha\\ClientesPJ\\ADILSON_DE_ANDRADE_LIMA_LIMA_GAS_15204314000183\\FICHA_CADASTRAL_E_SENHAS.html',
    pdf: 'C:\\Teia de arranha\\ClientesPJ\\ADILSON_DE_ANDRADE_LIMA_LIMA_GAS_15204314000183\\FICHA_CADASTRAL_E_SENHAS.pdf'
  },
  {
    tipo: 'PF - ADILSON LIMA',
    html: 'C:\\Teia de arranha\\ClientesPF\\ADILSON_DE_ANDRADE_LIMA_12829477880\\FICHA_CADASTRAL_E_SENHAS.html',
    pdf: 'C:\\Teia de arranha\\ClientesPF\\ADILSON_DE_ANDRADE_LIMA_12829477880\\FICHA_CADASTRAL_E_SENHAS.pdf'
  },
  {
    tipo: 'PJ - MOURATO & ASSOCIADOS',
    html: 'C:\\Teia de arranha\\ClientesPJ\\MOURATO_E_ASSOCIADOS_LTDA_38377738000145\\FICHA_CADASTRAL_E_SENHAS.html',
    pdf: 'C:\\Teia de arranha\\ClientesPJ\\MOURATO_E_ASSOCIADOS_LTDA_38377738000145\\FICHA_CADASTRAL_E_SENHAS.pdf'
  },
  {
    tipo: 'PF - JOSÉ JAILSON MOURATO',
    html: 'C:\\Teia de arranha\\ClientesPF\\JOSE_JAILSON_MOURATO_DA_SILVA_31776959892\\FICHA_CADASTRAL_E_SENHAS.html',
    pdf: 'C:\\Teia de arranha\\ClientesPF\\JOSE_JAILSON_MOURATO_DA_SILVA_31776959892\\FICHA_CADASTRAL_E_SENHAS.pdf'
  }
];

async function generateAll() {
  console.log('=== GERANDO PDFS OFICIAIS PF E PJ PARA AVALIAÇÃO DO USUÁRIO ===');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  for (const t of TARGETS) {
    if (!fs.existsSync(t.html)) {
      console.log(`Pular: HTML não encontrado para ${t.tipo}`);
      continue;
    }

    const page = await browser.newPage();
    const url = 'file:///' + t.html.replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    await page.pdf({
      path: t.pdf,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
    });

    await page.close();
    console.log(`✓ [${t.tipo}] PDF gerado: ${t.pdf}`);
  }

  await browser.close();
  console.log('=== TODOS OS PDFS FORAM GERADOS COM SUCESSO! ===');
}

generateAll().catch(err => {
  console.error('Erro na geração dos PDFs:', err);
  process.exit(1);
});

