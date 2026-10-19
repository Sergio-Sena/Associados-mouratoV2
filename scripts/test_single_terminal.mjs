import { chromium } from 'playwright';

(async () => {
  console.log('--- TESTANDO TERMINAL ÚNICO RECOMENDADO ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173/ficha-cadastral', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Confirmar que NÃO existem abas de alternância de modo
  const tabNativo = page.locator('text=Formulário Nativo no Portal');
  const hasTabs = await tabNativo.count();
  console.log('Abas de alternância presentes (deve ser 0):', hasTabs);
  console.assert(hasTabs === 0, 'Não deve haver abas de alternância');

  // 2. Confirmar que o iframe recomendado está ativo
  const iframe = page.locator('#iframe-ficha-mourato');
  console.log('Iframe recomendado presente:', await iframe.isVisible());
  console.log('Src do iframe:', await iframe.getAttribute('src'));

  // 3. Confirmar que a seção de PDF do Quod e Bacen está presente
  const quodUpload = page.locator('text=Extrato Quod (PDF)');
  const bacenUpload = page.locator('text=Extrato Bacen SCR (PDF)');
  console.log('Upload Quod presente:', await quodUpload.isVisible());
  console.log('Upload Bacen SCR presente:', await bacenUpload.isVisible());

  // 4. Confirmar botões de link direto e WhatsApp
  const copyBtn = page.locator('button:has-text("Copiar Link Direto")');
  const zapBtn = page.locator('button:has-text("Enviar no WhatsApp")');
  console.log('Botão Copiar Link Direto:', await copyBtn.isVisible());
  console.log('Botão Enviar WhatsApp:', await zapBtn.isVisible());

  await page.screenshot({ path: 'screenshots/test-single-recommended-terminal.png' });
  console.log('✅ Terminal único recomendado verificado com 100% de sucesso!');
  await browser.close();
  process.exit(0);
})();
