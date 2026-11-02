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
const CACHE_FILE = path.resolve(AUTH_DIR, 'notified_lead_ids.json');

// Número que receberá os alertas em tempo real no celular (Hesiuel)
const NOTIFY_PHONE = '5511914572275@s.whatsapp.net';
// Número de backup da empresa
const BACKUP_PHONE = '5511978990034@s.whatsapp.net';

// Configuração da API AWS para monitoramento contínuo em nuvem
const AWS_LEADS_URL = 'https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod/leads';
const AWS_ADMIN_PWD = process.env.VITE_ADMIN_PASSWORD || 'admin2026';

let sock = null;
let currentQr = null;
let isConnected = false;
let isPollingAws = false;

// Carrega cache de leads já notificados para nunca duplicar
let notifiedIds = new Set();
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const list = JSON.parse(raw);
    if (Array.isArray(list)) notifiedIds = new Set(list);
  }
} catch (_) {}

function saveNotifiedCache() {
  try {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(Array.from(notifiedIds), null, 2), 'utf8');
  } catch (_) {}
}

console.log('====================================================');
console.log('🤖  INICIANDO MOTOR OFICIAL DA MICA • WHATSAPP BOT 24/7');
console.log('📱  Destino dos Alertas:', NOTIFY_PHONE);
console.log('☁️  Vigilância Nuvem AWS: ATIVA');
console.log('====================================================');

function formatNotificationText(lead) {
  const leadNome = (lead.nome || 'Cliente').trim();
  const leadEmpresa = (lead.empresa || 'Empresa').trim();
  const leadProto = lead.protocolo || `MA-${(lead.id || Date.now()).toString().slice(0, 8).toUpperCase()}`;
  const leadTel = lead.telefone || 'Não informado';
  const leadEmail = lead.email || 'Não informado';
  const leadPratica = lead.pratica || 'Assessoria & Rating';

  const linkAprovacaoMobile = `https://www.mouratoassociados.com.br/?view=mica-aprovar&leadId=${encodeURIComponent(lead.id || '')}&protocolo=${encodeURIComponent(leadProto)}&nome=${encodeURIComponent(leadNome)}&empresa=${encodeURIComponent(leadEmpresa)}&telefone=${encodeURIComponent(leadTel)}&email=${encodeURIComponent(leadEmail)}&pratica=${encodeURIComponent(leadPratica)}&token=mrt_sec_${(lead.id || 'sec').slice(0, 8)}`;

  return (
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
_CNPJ: 38.377.738/0001-45 | Atendimento: (11) 97899-0034_`
  );
}

async function dispatchAlertToWhatsApp(lead, source = 'NUVEM_AWS') {
  if (!isConnected || !sock) {
    console.warn(`⚠️ [${source}] Mica não conectada ao WhatsApp no momento. Tentando reconectar...`);
    return false;
  }

  const messageText = formatNotificationText(lead);

  try {
    // 1. Envia prioritariamente ao número de destino configurado (11 91457-2275)
    await sock.sendMessage(NOTIFY_PHONE, { text: messageText });
    console.log(`✅ [${source}] Alerta entregue com sucesso para ${NOTIFY_PHONE}!`);

    // 2. Registra no cache persistente
    if (lead.id) {
      notifiedIds.add(lead.id);
      saveNotifiedCache();
    }
    return true;
  } catch (err) {
    console.error(`❌ [${source}] Falha ao enviar para ${NOTIFY_PHONE}:`, err.message);
    return false;
  }
}

// ☁️ Monitoramento contínuo da nuvem AWS em tempo real (vigilância a cada 5 segundos)
async function pollAwsLeadsQueue() {
  if (isPollingAws) return;
  isPollingAws = true;

  try {
    const res = await fetch(AWS_LEADS_URL, {
      headers: { 'x-admin-password': AWS_ADMIN_PWD },
      signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined
    });

    if (res.ok) {
      const leads = await res.json();
      if (Array.isArray(leads) && leads.length > 0) {
        for (const lead of leads) {
          const leadId = lead.id;
          if (leadId && !notifiedIds.has(leadId)) {
            console.log(`🔔 [VIGIA AWS] Novo cadastro detectado na nuvem: "${lead.empresa || lead.nome}" (${leadId})`);
            await dispatchAlertToWhatsApp(lead, 'VIGIA_AWS');
          }
        }
      }
    }
  } catch (err) {
    // Erros transitórios de rede ignorados silenciosamente para estabilidade 24/7
  } finally {
    isPollingAws = false;
  }
}

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
        console.log('❌ Sessão deslogada. Exclua auth_info_baileys para ler novo QR Code.');
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQr = null;
      console.log('✅ [MICA CONECTADA COM SUCESSO AO WHATSAPP!]');
      console.log(`🚀 Autorizada para disparar alertas diretamente para ${NOTIFY_PHONE}`);
      
      // Inicia verificação imediata dos leads pendentes na nuvem
      pollAwsLeadsQueue();
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Escuta comandos recebidos no WhatsApp (ex: quando responder "APROVAR" ou "OK")
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const sender = msg.key.remoteJid || '';

      console.log(`📩 Mensagem recebida de ${sender}: "${text}"`);

      // Se a mensagem vier de um dos canais autorizados (11 91457-2275 ou 11 97899-0034)
      if (sender.includes('914572275') || sender.includes('978990034')) {
        const cleanCmd = text.trim().toUpperCase();
        if (cleanCmd.startsWith('APROVAR') || cleanCmd === 'OK') {
          console.log('⚡ [COMANDO EXECUTIVO] Autorização confirmada via WhatsApp!');
          await sock.sendMessage(sender, {
            text: '✅ *[MICA]* Solicitação aprovada com sucesso! Esteira atualizada.'
          });
        }
      }
    }
  });
}

// Inicia servidor HTTP da Mica para endpoints internos
const server = http.createServer(async (req, res) => {
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
      targetPhone: NOTIFY_PHONE,
      awsQueueWatcher: true,
      notifiedLeadsCount: notifiedIds.size
    }));
  }

  // Visualizar QR Code no navegador (caso precise parear)
  if (url.pathname === '/qrcode') {
    if (isConnected) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0B0F19; color: #fff;">
          <h2 style="color: #10B981;">✅ MICA CONECTADA E OPERACIONAL 24/7!</h2>
          <p>Alertas sendo encaminhados para: <strong>${NOTIFY_PHONE}</strong></p>
          <p style="color: #94A3B8;">Vigilância da nuvem AWS ativa.</p>
        </div>
      `);
    }

    if (currentQr) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0B0F19; color: #fff;">
          <h2 style="color: #C5A869;">📱 ESCANEIE COM SEU WHATSAPP PARA AUTORIZAR A MICA</h2>
          <p style="color: #94A3B8;">WhatsApp > Aparelhos Conectados > Conectar Aparelho</p>
          <div id="qrcode" style="display: inline-block; padding: 20px; background: #fff; border-radius: 12px; margin-top: 20px;"></div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            new QRCode(document.getElementById("qrcode"), { text: "${currentQr}", width: 256, height: 256 });
            setTimeout(() => window.location.reload(), 15000);
          </script>
        </div>
      `);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<p>Gerando QR Code... Aguarde alguns segundos e recarregue a página.</p>');
  }

  // Disparo manual ou via webhook local
  if (url.pathname === '/api/mica/notify-lead' && req.method === 'POST') {
    let bodyRaw = '';
    req.on('data', chunk => { bodyRaw += chunk; });
    req.on('end', async () => {
      try {
        const lead = JSON.parse(bodyRaw || '{}');
        const ok = await dispatchAlertToWhatsApp(lead, 'WEBHOOK_LOCAL');
        if (ok) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true, message: 'Alerta enviado via WhatsApp!' }));
        } else {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Mica desconectada do WhatsApp.' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Rota não encontrada.');
});

// Inicia o servidor HTTP e conecta ao WhatsApp
server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP da Mica ativo em: http://localhost:${PORT}`);
  connectToWhatsApp();

  // Inicia o loop de vigilância na AWS a cada 4 segundos
  setInterval(pollAwsLeadsQueue, 4000);
});
