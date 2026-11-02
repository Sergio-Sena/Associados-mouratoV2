import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('🔥 PAGE ERROR:', err.message, err.stack));

  await page.goto('http://localhost:5173/?view=bureau', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Clica no usuário e digita
  await page.click('input[name="mrt-op-field"]');
  await page.keyboard.type('mourato');
  
  // Clica na senha e digita
  await page.click('input[name="mrt-key-field"]');
  await page.keyboard.type('@Jota1307');

  // Submete
  await page.click('button:has-text("Entrar no Painel")');
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'admin_dashboard_real.png' });
  console.log('✓ Painel logado salvo em admin_dashboard_real.png');

  // 1. Ir para a aba de Leads
  const leadsBtn = page.locator('button:has-text("Leads & Solicitações")').first();
  await leadsBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'admin_leads_list.png' });
  console.log('✓ Aba Leads salva em admin_leads_list.png');

  // 2. Clicar no botão "Aprovar & Enviar Ficha" do primeiro lead
  const approveBtn = page.locator('button:has-text("Aprovar"), button:has-text("Enviar Ficha")').first();
  if (await approveBtn.isVisible()) {
    await approveBtn.click();
    await page.waitForTimeout(1000);
    console.log('✓ Lead aprovado!');

    const storageVal = await page.evaluate(() => {
      return {
        clients_v2: localStorage.getItem('mourato_clients_records_v2'),
        deleted_v2: localStorage.getItem('mourato_deleted_clients_v2'),
        approved_leads: localStorage.getItem('mourato_approved_leads_ids'),
        platform_cleaned: localStorage.getItem('mourato_platform_cleaned_v5')
      };
    });
    console.log('🔍 LOCAL STORAGE DIAGNOSTIC:', JSON.stringify(storageVal, null, 2));

    // Fechar modal de confirmação se abrir
    const closeApprovalModal = page.locator('button:has-text("Fechar Tela"), button:has-text("✕")').first();
    if (await closeApprovalModal.isVisible()) {
      await closeApprovalModal.click();
      await page.waitForTimeout(600);
    }
  }

  // 3. Ir para a aba "Novos Clientes"
  const clientsBtn = page.locator('button:has-text("Novos Clientes")').first();
  await clientsBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'admin_novos_clientes_with_data.png' });
  console.log('✓ Aba Novos Clientes com dados salva em admin_novos_clientes_with_data.png');

  // 4. Verificar se botão de Imprimir existe no card do cliente
  const printBtn = page.locator('button:has-text("Imprimir")').first();
  console.log('✓ Botão Imprimir visível no card:', await printBtn.isVisible());

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
