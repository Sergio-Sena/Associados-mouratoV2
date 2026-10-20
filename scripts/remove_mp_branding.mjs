import fs from 'node:fs';

const filePath = 'src/components/ClientManagementModal.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Sidebar
  ['<span>Recebíveis (Mercado Pago)</span>', '<span>Gestão de Recebíveis</span>'],
  // Headers
  ["{activeView === 'receivables' && 'Gestão de Recebíveis & Mercado Pago'}", "{activeView === 'receivables' && 'Gestão de Recebíveis & Faturamento'}"],
  ["{activeView === 'receivables' && 'Emissão de cobranças com PIX Dinâmico, Boleto e integração Mercado Pago.'}", "{activeView === 'receivables' && 'Emissão de cobranças com PIX Dinâmico, Cartão e Boletos homologados.'}"],
  ["{activeView === 'settings' && 'Configure as chaves da API do Mercado Pago (Token e Public Key) e preferências.'}", "{activeView === 'settings' && 'Configure as chaves e credenciais da API de Recebíveis e preferências.'}"],
  ['title="Emitir Cobrança com Protocolo Antifraude Mercado Pago"', 'title="Emitir Cobrança Bancária Oficial"'],
  ['+ Nova Cobrança MP', '+ Nova Cobrança'],

  // Tab Recebíveis
  ['Emitir Cobrança / Recebível Mercado Pago', 'Emitir Cobrança / Recebível'],
  ["{mpConfig.connected ? 'Mercado Pago Ativo' : 'Modo Padrão / PIX Mourato'}", "{mpConfig.connected ? 'Gateway Homologado' : 'PIX Oficial Mourato'}"],
  ['Gerar Cobrança Mercado Pago', 'Gerar Cobrança Oficial'],
  ['<th style={{ padding: \'0.85rem 1rem\' }}>ID Mercado Pago</th>', '<th style={{ padding: \'0.85rem 1rem\' }}>ID da Transação</th>'],

  // Tab Configurações
  ['Integração da API Mercado Pago (Recebíveis)', 'Integração Gateway de Recebíveis (API)'],
  ['Insira suas credenciais de produção ou testes obtidas no painel de desenvolvedores do Mercado Pago.', 'Insira suas credenciais de produção ou testes para liquidação bancária automatizada.'],
  ['Encontrado em: Mercado Pago Developers &gt; Suas Aplicações &gt; Credenciais de Produção.', 'Credenciais oficiais de integração segura para processamento financeiro.'],
  ['Testar Conexão com Mercado Pago', 'Testar Conexão com Gateway'],

  // Modal Nova Cobrança
  ['Nova Cobrança Segura — Mercado Pago', 'Nova Cobrança Segura — Mourato & Associados'],
  ['Emissão compatível com as regras antifraude e scoring de risco do Mercado Pago.', 'Emissão institucional com conformidade antifraude e liquidação direta.'],
  ["{mpConfig.accessToken ? '● Conectado à API Oficial Mercado Pago' : '● Modo de Homologação Local (Simulador Antifraude)'}", "{mpConfig.accessToken ? '● Conectado ao Gateway Bancário Oficial' : '● Modo de Homologação Ativo'}"],

  // Modal QR Code Pix
  ['COBRANÇA MERCADO PAGO HOMOLOGADA', 'COBRANÇA BANCÁRIA HOMOLOGADA'],
  ['alt="QR Code PIX Mercado Pago"', 'alt="QR Code PIX Oficial"'],
  ['🔗 *Link da Fatura Mercado Pago:*', '🔗 *Link da Fatura Oficial:*'],
  ['Abrir link direto do Mercado Pago', 'Abrir link direto de pagamento'],

  // Status logs
  ["setMpTestStatus('erro: Insira o Access Token do Mercado Pago antes de testar.');", "setMpTestStatus('erro: Insira o Access Token do Gateway antes de testar.');"],
  ["setMpTestStatus('testando credencial com o Mercado Pago...');", "setMpTestStatus('testando credencial com o Gateway...');"],
  ["setMpTestStatus(`sucesso: Conectado ao Mercado Pago! Titular: ${data.first_name || ''} ${data.last_name || data.nickname || ''} (ID Conta: ${data.id})`);", "setMpTestStatus(`sucesso: Conectado ao Gateway Bancário! Titular: ${data.first_name || ''} ${data.last_name || data.nickname || ''} (ID Conta: ${data.id})`);"],
  ["setMpTestStatus(`erro: ${data.message || 'Token inválido ou não autorizado no Mercado Pago.'}`);", "setMpTestStatus(`erro: ${data.message || 'Token inválido ou não autorizado no Gateway.'}`);"]
];

let replacedCount = 0;
for (const [target, repl] of replacements) {
  if (content.includes(target)) {
    content = content.replace(target, repl);
    replacedCount++;
  } else {
    console.warn('Target não encontrado:', target);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Sucesso: ${replacedCount} ocorrências de visual do Mercado Pago substituídas por termos oficiais.`);
