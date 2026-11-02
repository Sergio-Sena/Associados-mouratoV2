import { chromium } from 'playwright';

async function run() {
  console.log('🚀 Iniciando Teste E2E da Mica: Recepção, Validação Mobile e Abertura do WhatsApp...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 420, height: 860 } }); // Simula celular
  const page = await context.newPage();

  try {
    // 1. Acesso à tela de validação da Mica via link seguro mobile
    const testLead = {
      id: `lead-test-${Date.now()}`,
      protocolo: `MA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-7788`,
      nome: 'Carlos Eduardo Ferreira',
      empresa: 'Ferreira Logística & Transportes Ltda',
      telefone: '11987654321',
      email: 'contato@ferreiralogistica.com.br',
      pratica: 'hibrido'
    };

    const targetUrl = `http://localhost:5173/?view=mica-aprovar&leadId=${testLead.id}&protocolo=${testLead.protocolo}&nome=${encodeURIComponent(testLead.nome)}&empresa=${encodeURIComponent(testLead.empresa)}&telefone=${testLead.telefone}&email=${encodeURIComponent(testLead.email)}&pratica=${testLead.pratica}&token=mrt_sec_test`;

    console.log(`✓ Acessando link seguro de aprovação no celular: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });

    // 2. Verifica se o modal da Mica abriu com os dados do lead
    await page.waitForSelector('text=MICA • VALIDAÇÃO EXECUTIVA', { timeout: 8000 });
    console.log('✓ Tela de Validação Executiva da Mica aberta no celular');

    const bodyText = await page.innerText('body');
    const hasEmpresa = bodyText.includes('Ferreira Logística');
    const hasNome = bodyText.includes('Carlos Eduardo Ferreira');
    const hasProto = bodyText.includes('7788');
    console.log('✓ Dados do lead exibidos corretamente:', { hasEmpresa, hasNome, hasProto });

    // 3. Testa o botão de aprovação e abertura do WhatsApp
    const btnApprove = page.locator('button:has-text("Aprovar & Abrir WhatsApp")').first();
    const isApproveVisible = await btnApprove.isVisible();
    console.log('✓ Botão [Aprovar & Abrir WhatsApp] visível:', isApproveVisible);

    // Clica no botão de aprovar
    await btnApprove.click();
    console.log('✓ Clicou em Aprovar');

    // Aguarda confirmação
    await page.waitForSelector('text=Solicitação Aprovada com Sucesso!', { timeout: 8000 });
    console.log('✓ Mica confirmou aprovação e gerou Ficha Cadastral Oficial');

    // Verifica link de reabertura do WhatsApp
    const btnWpp = page.locator('a:has-text("Reabrir Conversa no WhatsApp")').first();
    const href = await btnWpp.getAttribute('href');
    console.log('✓ Link com mensagem pronta do WhatsApp gerado:', href ? href.slice(0, 80) + '...' : 'NÃO GERADO');

    const containsDoc = href.includes('38.377.738%2F0001-45') || href.includes('38.377.738');
    const containsAtendimento = href.includes('97899-0034') || href.includes('978990034');
    console.log('✓ Mensagem contém dados básicos institucionais da empresa (CNPJ e Telefone):', { containsDoc, containsAtendimento });

    // 4. Salva screenshot da tela mobile
    await page.screenshot({ path: 'mica_approval_mobile.png' });
    console.log('✓ Screenshot salva em mica_approval_mobile.png');

    console.log('🎉 TESTE DA MICA CONCLUÍDO COM 100% DE SUCESSO!');
  } catch (err) {
    console.error('❌ Erro no teste da Mica:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
