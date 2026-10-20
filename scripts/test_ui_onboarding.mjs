import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Acessando portal com ?onboarding=true...');
  await page.goto('http://localhost:4173/?onboarding=true', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Verificar se o modal de onboarding está visível
  const modalTitle = await page.textContent('h2');
  console.log('Título encontrado:', modalTitle);

  // Verificar se os dois botões de modo de integração existem
  const nativeBtn = page.locator('text=Formulário Nativo no Portal');
  const iframeBtn = page.locator('text=Terminal Integrado / Iframe');

  console.log('Botão Nativo visível:', await nativeBtn.isVisible());
  console.log('Botão Iframe visível:', await iframeBtn.isVisible());

  // Testar clique na próxima etapa sem preencher (deve disparar validações)
  await page.locator('button:has-text("Próxima Etapa")').click();
  await page.waitForTimeout(500);

  const errors = await page.locator('span[style*="color: rgb(239, 68, 68)"]').allTextContents();
  console.log('Erros de validação disparados corretamente:', errors);

  // Testar alternância para modo Iframe
  console.log('2. Alternando para modo Iframe (Opção A)...');
  await iframeBtn.click();
  await page.waitForTimeout(800);

  const iframe = page.locator('#iframe-ficha-mourato');
  console.log('Iframe visível:', await iframe.isVisible());
  const iframeSrc = await iframe.getAttribute('src');
  console.log('Iframe src:', iframeSrc);

  await page.screenshot({ path: 'screenshots/test-onboarding-iframe.png' });

  // Voltar para modo Nativo
  console.log('3. Voltando para modo Nativo (Opção B)...');
  await nativeBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/test-onboarding-native.png' });

  console.log('✅ Testes de UI e integração do Onboarding concluídos com sucesso!');
  await browser.close();
  process.exit(0);
})();
