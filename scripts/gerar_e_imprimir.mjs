import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function main() {
  const htmlPath = path.resolve('public/imprimir-logo-cartao.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/') + '?theme=theme-white&qty=grid10&crops=1&size=90x50&layout=standard';
  const pdfPath = path.resolve('cartao_visita_mourato_branco.pdf');

  console.log('1. Renderizando folha A4 com Playwright...');
  console.log('URL:', fileUrl);

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  
  // Aguarda fontes Cinzel e Plus Jakarta Sans carregarem
  await page.waitForTimeout(1000);

  console.log('2. Gerando PDF de alta definição (A4 / 10 cartões)...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '15mm',
      right: '15mm'
    }
  });

  await browser.close();
  console.log('✓ PDF gerado com sucesso:', pdfPath);

  console.log('3. Enviando para a impressora Canon G4010 series...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const printCmd = `"${edgePath}" --headless --print-to-printer="Canon G4010 series" "${pdfPath}"`;
  console.log('Comando de spooler:', printCmd);

  try {
    execSync(printCmd, { stdio: 'inherit' });
    console.log('✓ Trabalho de impressão despachado com sucesso para o spooler da Canon G4010!');
  } catch (err) {
    console.error('Tentando comando alternativo via PowerShell PrintTo...');
    const psCmd = `powershell -Command "Start-Process -FilePath '${pdfPath}' -Verb PrintTo -ArgumentList '\"Canon G4010 series\"'"`;
    execSync(psCmd, { stdio: 'inherit' });
    console.log('✓ Trabalho enviado via PowerShell PrintTo.');
  }
}

main().catch(err => {
  console.error('Erro na impressão:', err);
  process.exit(1);
});

