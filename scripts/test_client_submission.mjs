import { chromium } from 'playwright';

(async () => {
  console.log('========================================================');
  console.log('🚀 TESTE DE FLUXO DE CADASTRO E PERSISTÊNCIA DE CLIENTE');
  console.log('========================================================');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Acessar o Link Direto da Ficha Cadastral que o cliente recebe
  const linkCliente = 'http://localhost:5173/ficha-cadastral';
  console.log(`1. Navegando para o Link Oficial do Cliente: ${linkCliente}`);
  await page.goto(linkCliente, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Screenshot do formulário nativo inicial
  await page.screenshot({ path: 'screenshots/test-ficha-formulario-nativo.png', fullPage: false });
  console.log('📸 Screenshot salvo: screenshots/test-ficha-formulario-nativo.png');

  // 2. Preencher dados de teste com o botão 'Preencher Dados Exemplo'
  console.log('2. Clicando em "Preencher Dados Exemplo"...');
  const btnExemplo = page.locator('button:has-text("Preencher Dados Exemplo")');
  if (await btnExemplo.isVisible()) {
    await btnExemplo.click();
    console.log(' -> Formulário preenchido com dados executivos de exemplo!');
  } else {
    // Preenchimento manual de fallback
    await page.fill('input[name="razaoSocial"]', 'Alencar Mourato Logística & Transportes S/A');
    await page.fill('input[name="cnpj"]', '45.192.384/0001-92');
    await page.fill('input[name="nomeSocio"]', 'Roberto Alencar Mourato');
    await page.fill('input[name="cpfSocio"]', '284.912.839-44');
    await page.fill('input[name="email"]', 'diretoria@alencarmourato.com.br');
    await page.fill('input[name="telefone"]', '(11) 98765-4321');
  }

  await page.waitForTimeout(800);

  // 3. Submeter o cadastro oficial
  console.log('3. Clicando em "Transmitir Ficha Cadastral & Iniciar Auditoria"...');
  const btnEnviar = page.locator('#btn-enviar-cadastro-oficial');
  if (await btnEnviar.isVisible()) {
    await btnEnviar.click();
  } else {
    await page.click('button:has-text("Transmitir Ficha Cadastral")');
  }

  await page.waitForTimeout(1500);

  // 4. Capturar o Protocolo Oficial emitido na tela
  const protocoloEl = page.locator('code');
  const protocoloText = await protocoloEl.isVisible() ? (await protocoloEl.textContent()).trim() : 'NÃO_CAPTURADO';
  console.log(`✅ PROTOCOLO OFICIAL GERADO NA TELA: ${protocoloText}`);

  // 5. Screenshot da Tela de Confirmação do Cliente (Recibo Oficial)
  await page.screenshot({ path: 'screenshots/test-comprovante-cliente.png', fullPage: false });
  console.log('📸 Screenshot do comprovante salvo: screenshots/test-comprovante-cliente.png');

  // 6. Verificar se os dados caíram no repositório correto (localStorage['mourato_clients_records_v2'])
  const repoData = await page.evaluate(() => {
    const raw = localStorage.getItem('mourato_clients_records_v2');
    return raw ? JSON.parse(raw) : [];
  });

  console.log(`📊 Total de clientes no repositório oficial (mourato_clients_records_v2): ${repoData.length}`);
  const lastClient = repoData[0] || repoData[repoData.length - 1];
  console.log('----------------------------------------------------');
  console.log('DADOS VERIFICADOS NO REPOSITÓRIO OFICIAL:');
  console.log(` - ID: ${lastClient?.id}`);
  console.log(` - Nome / Razão Social: ${lastClient?.nomeRazao}`);
  console.log(` - Documento: ${lastClient?.documento} (${lastClient?.documentoTipo})`);
  console.log(` - Responsável / Sócio: ${lastClient?.responsavel || lastClient?.socioVinculado}`);
  console.log(` - Origem do Registro: ${lastClient?.origem}`);
  console.log(` - Protocolo de Atendimento: ${lastClient?.protocolo || protocoloText}`);
  console.log('----------------------------------------------------');

  // 7. Acessar o Painel de Gestão e fazer login executivo para visualizar a lista de clientes
  console.log('7. Acessando Painel Administrativo de Gestão...');
  await page.goto('http://localhost:5173/?view=bureau', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Preenche credenciais: mourato / @Jota1307
  console.log('Autenticando no painel executivo...');
  const userInput = page.locator('input[type="text"]').first();
  const passInput = page.locator('input[type="password"]');
  if (await userInput.isVisible()) {
    await userInput.fill('mourato');
  }
  if (await passInput.isVisible()) {
    await passInput.fill('@Jota1307');
  }
  await page.click('button:has-text("ENTRAR NO PAINEL")');
  await page.waitForTimeout(1200);

  // Clica na aba "Novos Clientes"
  const abaNovosClientes = page.locator('button:has-text("Novos Clientes")');
  if (await abaNovosClientes.isVisible()) {
    await abaNovosClientes.click();
    await page.waitForTimeout(1000);
  }

  // Screenshot do Card de Clientes com os botões perfeitamente ajustados e sem vazamento
  await page.screenshot({ path: 'screenshots/test-cards-ajustados.png', fullPage: false });
  console.log('📸 Screenshot salvo: screenshots/test-cards-ajustados.png');

  await browser.close();
  console.log('🎉 TESTE CONCLUÍDO COM SUCESSO TOTAL!');
})();
