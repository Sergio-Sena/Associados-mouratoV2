import { chromium } from 'playwright';

(async () => {
  console.log('Capturando telas da Ficha Cadastral como o cliente visualiza...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Visão Desktop
  const contextDesktop = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const pageDesktop = await contextDesktop.newPage();
  await pageDesktop.goto('http://localhost:5173/ficha-cadastral', { waitUntil: 'networkidle' });
  await pageDesktop.waitForTimeout(1000);
  await pageDesktop.screenshot({ path: 'screenshots/cliente_visao_desktop.png', fullPage: true });
  console.log('📸 Salvo: screenshots/cliente_visao_desktop.png');

  // 2. Visão Mobile (Smartphone do Cliente - ex: abrindo pelo WhatsApp)
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true
  });
  const pageMobile = await contextMobile.newPage();
  await pageMobile.goto('http://localhost:5173/ficha-cadastral', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(1000);
  await pageMobile.screenshot({ path: 'screenshots/cliente_visao_mobile.png', fullPage: true });
  console.log('📸 Salvo: screenshots/cliente_visao_mobile.png');

  await browser.close();
  console.log('Finalizado com sucesso!');
})();
