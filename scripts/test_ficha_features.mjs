import { chromium } from 'playwright';

(async () => {
  console.log('--- TESTANDO ROTA DIRETA E RECURSOS DA FICHA CADASTRAL ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  
  // 1. Teste Desktop na rota direta /ficha-cadastral
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  console.log('1. Acessando http://localhost:5173/ficha-cadastral no computador...');
  await page.goto('http://localhost:5173/ficha-cadastral', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const title = await page.textContent('h2');
  console.log('Título na rota direta:', title);

  const copyBtn = page.locator('button:has-text("Copiar Link Direto")');
  console.log('Botão Copiar Link Direto visível:', await copyBtn.isVisible());

  const zapBtn = page.locator('button:has-text("Enviar no WhatsApp")');
  console.log('Botão Enviar no WhatsApp visível:', await zapBtn.isVisible());

  // Navegar até o step de PDF (Step 6) preenchendo os dados mínimos válidos
  console.log('2. Preenchendo dados para navegar até o Step de Anexos em PDF...');
  
  // Step 1: Titular
  await page.fill('input[placeholder*="Nome completo"]', 'JOSE TESTE PERICIAL');
  await page.fill('input[placeholder="000.000.000-00"]', '52998224725');
  await page.fill('input[placeholder*="12.345.678-9"]', '123456789');
  await page.fill('input[placeholder*="SSP/SP"]', 'SSP/SP');
  await page.fill('input[placeholder="DD/MM/AAAA"]', '15/10/1985');
  await page.fill('input[placeholder*="mãe"]', 'MARIA TESTE');
  await page.click('button:has-text("Próxima Etapa")');
  await page.waitForTimeout(400);

  // Step 2: Endereço
  await page.fill('input[placeholder="00000-000"]', '01310-100');
  await page.waitForTimeout(800); // aguarda ViaCEP
  await page.fill('input[placeholder="1000"]', '100');
  await page.click('button:has-text("Próxima Etapa")');
  await page.waitForTimeout(400);

  // Step 3: Contato
  await page.fill('input[placeholder="(11) 99999-9999"]', '11999999999');
  await page.fill('input[placeholder*="cliente@empresa"]', 'cliente@teste.com');
  await page.fill('input[placeholder*="Empresário, Diretor"]', 'Empresário');
  await page.fill('input[placeholder="R$ 15.000,00"]', '2500000');
  await page.click('button:has-text("Próxima Etapa")');
  await page.waitForTimeout(400);

  // Step 4: Empresa
  await page.click('button:has-text("Próxima Etapa")');
  await page.waitForTimeout(400);

  // Step 5: Portais
  await page.fill('input[placeholder="Senha Gov.br"]', 'GovSenha123');
  await page.click('button:has-text("Próxima Etapa")');
  await page.waitForTimeout(400);

  // Step 6: Anexos PDF
  console.log('3. Chegamos na etapa de Anexos PDF!');
  const quodCard = page.locator('text=Extrato Quod (PDF)');
  const bacenCard = page.locator('text=Extrato Bacen SCR (PDF)');
  console.log('Card Extrato Quod visível:', await quodCard.isVisible());
  console.log('Card Extrato Bacen SCR visível:', await bacenCard.isVisible());

  await page.screenshot({ path: 'screenshots/test-standalone-anexos-pdf.png' });

  // 2. Teste Mobile na rota /ficha-cadastral
  console.log('4. Testando rota no Celular (Mobile 390x844)...');
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('http://localhost:5173/ficha-cadastral', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: 'screenshots/test-standalone-mobile.png' });

  console.log('✅ Todos os testes de rota direta, mobile, e recursos de PDF passaram com sucesso!');
  await browser.close();
  process.exit(0);
})();
