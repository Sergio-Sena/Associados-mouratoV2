import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.MICA_PORT || 3005;
const AUTH_DIR = path.resolve(__dirname, '../auth_info_baileys');
const DIRETORIA_PHONE = '5511978990034@s.whatsapp.net';

let sock = null;
let currentQr = null;
let isConnected = false;

console.log('====================================================');
console.log('🤖  INICIANDO MOTOR OFICIAL DA MICA • WHATSAPP BOT');
console.log('====================================================');

async function connectToWhatsApp() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Mica Pericial', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      console.log('\n📱 [MICA QR CODE] ESCANEIE COM O WHATSAPP PARA AUTORIZAR A MICA:');
      qrcode.generate(qr, { small: true });
      console.log('💡 Ou acesse pelo navegador: http://localhost:' + PORT + '/qrcode\n');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      isConnected = false;
      console.log('⚠️ Conexão da Mica fechada. Motivo:', lastDisconnect?.error?.message || 'Desconhecido');
      if (shouldReconnect) {
        console.log('🔄 Reconectando Mica automaticamente em 3 segundos...');
        setTimeout(connectToWhatsApp, 3000);
      } else {
        console.log('❌ Sessão deslogada. Por favor, exclua auth_info_baileys e escaneie o QR Code novamente.');
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQr = null;
      console.log('✅ [MICA CONECTADA COM SUCESSO AO WHATSAPP!]');
      console.log('🚀 A Mica agora tem autorização total para enviar e receber mensagens.');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Escuta comandos recebidos no WhatsApp (ex: quando Hesiuel responder "APROVAR" ou "OK")
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const sender = msg.key.remoteJid;

      console.log(`📩 Mensagem recebida de ${sender}: "${text}"`);

      // Se a mensagem vier do Canal Direto autorizado
      if (sender.includes('5511978990034') || sender.includes('11978990034')) {
        const cleanCmd = text.trim().toUpperCase();
        if (cleanCmd.startsWith('APROVAR') || cleanCmd === 'OK') {
          console.log('⚡ [COMANDO EXECUTIVO] Autorização confirmada pelo Canal Direto!');
          await sock.sendMessage(sender, {
            text: '✅ *[MICA]* Solicitação aprovada com sucesso! Disparando Ficha Cadastral e atualizando a esteira.'
          });
        }
      }
    }
  });
}

// Inicia servidor HTTP da Mica para receber chamadas do portal
const server = http.createServer(async (req, res) => {
  // Configuração CORS para o site local e de produção
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Status da Mica
  if (url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      online: true,
      whatsappConnected: isConnected,
      hasQrPending: !!currentQr
    }));
  }

  // Visualizar QR Code no navegador
  if (url.pathname === '/qrcode') {
    if (isConnected) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0B0F19; color: #fff;">
          <h2 style="color: #10B981;">✅ MICA JÁ ESTÁ CONECTADA AO WHATSAPP!</h2>
          <p>O robô já tem autorização e está operando normalmente.</p>
        </div>
      `);
    }

    if (currentQr) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0B0F19; color: #fff;">
          <h2 style="color: #C5A869;">📱 ESCANEIE COM SEU WHATSAPP PARA AUTORIZAR A MICA</h2>
          <p style="color: #94A3B8;">Abra o WhatsApp no celular > Aparelhos Conectados > Conectar Aparelho</p>
          <div id="qrcode" style="display: inline-block; padding: 20px; background: #fff; border-radius: 12px; margin-top: 20px;"></div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            new QRCode(document.getElementById("qrcode"), {
              text: "${currentQr}",
              width: 256,
              height: 256
            });
            setTimeout(() => window.location.reload(), 15000);
          </script>
        </div>
      `);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<p>Gerando QR Code... Aguarde alguns segundos e recarregue a página.</p>');
  }

  // Disparo de novo lead vindo do portal diretamente para o WhatsApp de Hesiuel
  if (url.pathname === '/api/mica/notify-lead' && req.method === 'POST') {
    let bodyRaw = '';
    req.on('data', chunk => { bodyRaw += chunk; });
    req.on('end', async () => {
      try {
        const lead = JSON.parse(bodyRaw || '{}');
        console.log('📥 Novo lead recebido na Mica:', lead.empresa || lead.nome);

        if (!isConnected || !sock) {
          console.warn('⚠️ Mica não está conectada ao WhatsApp no momento.');
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Mica desconectada do WhatsApp. Escaneie o QR Code.' }));
        }

        const leadNome = lead.nome || 'Cliente';
        const leadEmpresa = lead.empresa || 'Empresa';
        const leadProto = lead.protocolo || `MA-${Date.now()}`;
        const leadTel = lead.telefone || 'Não informado';
        const leadEmail = lead.email || 'Não informado';
        const leadPratica = lead.pratica || 'Assessoria & Rating';

        const linkAprovacaoMobile = `https://www.mouratoassociados.com.br/?view=mica-aprovar&leadId=${encodeURIComponent(lead.id || '')}&protocolo=${encodeURIComponent(leadProto)}&nome=${encodeURIComponent(leadNome)}&empresa=${encodeURIComponent(leadEmpresa)}&telefone=${encodeURIComponent(leadTel)}&email=${encodeURIComponent(leadEmail)}&pratica=${encodeURIComponent(leadPratica)}&token=mrt_sec_${(lead.id || 'sec').slice(0, 8)}`;

        const mensagemParaHesiuel = 
`🚨 *[MICA — NOVA SOLICITAÇÃO RECEBIDA]* 🚨

👤 *Titular:* ${leadNome}
🏢 *Empresa:* ${leadEmpresa}
📋 *Protocolo Oficial:* ${leadProto}
📱 *WhatsApp Cliente:* ${leadTel}
✉️ *E-mail:* ${leadEmail}
⚖️ *Prática:* ${leadPratica}
───────────────────────────────────
🔒 *APROVAR OU NEGAR NO CELULAR (1 TOQUE):*
👉 ${linkAprovacaoMobile}
───────────────────────────────────
_Mica • Atendimento Corporativo — Mourato & Associados Ltda_
_CNPJ: 38.377.738/0001-45 | Atendimento: (11) 97899-0034_`;

        await sock.sendMessage(DIRETORIA_PHONE, { text: mensagemParaHesiuel });
        console.log(`✅ [SUCESSO] Notificação enviada diretamente ao WhatsApp (${DIRETORIA_PHONE})!`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, message: 'Notificação enviada diretamente via WhatsApp!' }));
      } catch (err) {
        console.error('❌ Erro ao enviar mensagem pela Mica:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Rota não encontrada.');
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP da Mica ativo em: http://localhost:${PORT}`);
  console.log(`📱 Para autorizar o WhatsApp: http://localhost:${PORT}/qrcode`);
  connectToWhatsApp();
});
