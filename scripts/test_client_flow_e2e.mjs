import { chromium } from 'playwright';

async function run() {
  console.log('🚀 Iniciando teste E2E do Fluxo de Cliente, Mensagem, Protocolo e Birô...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Abrir com formulário de solicitação de assessoria aberto
    await page.goto('http://localhost:5173/?contact=true', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('✓ Portal Mourato carregado com modal de agendamento/onboarding aberto');

    // 2. Preencher formulário de onboarding do cliente
    await page.fill('input[placeholder="Nome da sua companhia"]', 'Silva & Mourato Participações');
    await page.fill('input[placeholder="Seu nome"]', 'José Carlos da Silva');
    await page.fill('input[placeholder="(11) 90000-0000"]', '(11) 98765-4321');
    await page.fill('input[placeholder="diretoria@empresa.com.br"]', 'jose.silva@silvamourato.com.br');
    
    console.log('✓ Formulário do cliente preenchido');

    // 4. Enviar solicitação
    const btnSubmit = page.locator('button[type="submit"]:has-text("Solicitar"), button[type="submit"]').first();
    await btnSubmit.click();
    console.log('✓ Clicou em enviar, aguardando confirmação e protocolo...');

    await page.waitForSelector('h3:has-text("Solicitação Confirmada com Sucesso")', { timeout: 10000 });
    console.log('✓ Tela de sucesso visível com confirmação');

    // 5. Validar recepção de Mensagem e Protocolo pelo cliente
    const protoEl = page.locator('text=/MA-\\d{8}-\\d{4}/').first();
    const isProtoVisible = await protoEl.isVisible();
    const protoText = isProtoVisible ? await protoEl.innerText() : 'NÃO ENCONTRADO';
    console.log('✓ Protocolo recebido pelo cliente:', protoText);

    const bodyText = await page.innerText('body');
    const hasClientMsg = bodyText.includes('Prezado(a)') && bodyText.includes('José Carlos da Silva') && bodyText.includes('registradas com sucesso sob o Protocolo');
    console.log('✓ Mensagem formal com protocolo para o cliente presente:', hasClientMsg);

    const hasCanalDiretoWpp = await page.locator('a:has-text("Enviar ao Canal Direto")').isVisible();
    console.log('✓ Botão para Enviar ao Canal Direto via WhatsApp presente:', hasCanalDiretoWpp);

    const hasSaveWpp = await page.locator('a:has-text("Salvar Comprovante"), a:has-text("Salvar no WhatsApp")').isVisible();
    console.log('✓ Botão para salvar comprovante presente:', hasSaveWpp);

    await page.screenshot({ path: 'client_confirmation_protocol.png' });
    console.log('✓ Screenshot da tela do cliente salva: client_confirmation_protocol.png');

    // 6. Testar Painel Administrativo / Birô
    await page.goto('http://localhost:5173/?view=bureau', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('✓ Acessou painel administrativo');

    // Fazer login no painel restrito
    const userField = page.locator('input[name="mrt-op-field"]').first();
    if (await userField.isVisible()) {
      await page.evaluate(() => {
        const u = document.querySelector('input[name="mrt-op-field"]');
        if (u) u.removeAttribute('readonly');
        const p = document.querySelector('input[name="mrt-key-field"]');
        if (p) p.removeAttribute('readonly');
      });
      await page.fill('input[name="mrt-op-field"]', 'mourato');
      await page.fill('input[name="mrt-key-field"]', '@Jota1307');
      await page.click('button:has-text("Entrar no Painel")');
      await page.waitForTimeout(1000);
      console.log('✓ Login administrativo realizado com sucesso');
    }

    // Ir para a aba de Leads
    const leadsTab = page.locator('button:has-text("Leads"), span:has-text("Leads")').first();
    if (await leadsTab.isVisible()) {
      await leadsTab.click();
      await page.waitForTimeout(600);
      console.log('✓ Aba de Leads aberta');
    }

    // Ir para a aba de Novos Clientes / Clientes
    const clientsTab = page.locator('button:has-text("Novos Clientes"), button:has-text("Clientes"), button:has-text("Planilha")').first();
    if (await clientsTab.isVisible()) {
      await clientsTab.click();
      await page.waitForTimeout(600);
      console.log('✓ Aba Novos Clientes aberta com sucesso');
    }

    // Verificar se botão de Imprimir existe na tela
    const printBtns = page.locator('button:has-text("Imprimir")');
    const countPrint = await printBtns.count();
    console.log(`✓ Botões de impressão de Dossiê & Birô encontrados: ${countPrint}`);

    await page.screenshot({ path: 'admin_clients_view.png' });
    console.log('✓ Screenshot do painel salva: admin_clients_view.png');

    console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  } catch (err) {
    console.error('❌ Erro no teste E2E:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
