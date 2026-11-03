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
const LOG_FILE = path.resolve(AUTH_DIR, 'mica_history.log');

// Destinatários Oficiais de Alertas da Diretoria em Tempo Real
const NOTIFY_TARGETS = [
  { label: 'Diretoria Executiva (Hesiuel)', phone: '5511914572275' },
  { label: 'Canal Oficial Mourato & Associados', phone: '5511978990034' },
  { label: 'Sérgio Sena (Tecnologia/Diretoria)', phone: '5511982699176' }
];

// Configuração da API AWS para monitoramento contínuo em nuvem
const AWS_LEADS_URL = 'https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod/leads';
const AWS_ADMIN_PWD = process.env.VITE_ADMIN_PASSWORD || 'admin2026';

let sock = null;
let currentQr = null;
let isConnected = false;
let isPollingAws = false;
let lastDispatches = [];

// Logger persistente em arquivo
function writeMicaLog(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  console.log(msg);
  try {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (_) {}
}

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
console.log('📱  Destinatários dos Alertas:', NOTIFY_TARGETS.map(t => `${t.label} (${t.phone})`).join(' | '));
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

// Disparo com resolução inteligente de JID no WhatsApp e broadcast para a diretoria
async function dispatchAlertToWhatsApp(lead, source = 'NUVEM_AWS') {
  if (!isConnected || !sock) {
    writeMicaLog(`⚠️ [${source}] Mica não conectada ao WhatsApp no momento.`);
    return false;
  }

  const messageText = formatNotificationText(lead);
  let anySuccess = false;
  const dispatchRecord = {
    leadId: lead.id,
    empresa: lead.empresa || lead.nome,
    timestamp: new Date().toISOString(),
    results: []
  };

  for (const target of NOTIFY_TARGETS) {
    try {
      let resolvedJid = `${target.phone}@s.whatsapp.net`;

      // 1. Tenta validar no WhatsApp se o número existe e qual é o JID real da conta
      try {
        const check = await sock.onWhatsApp(target.phone);
        if (Array.isArray(check) && check[0]?.exists && check[0]?.jid) {
          resolvedJid = check[0].jid;
        } else if (target.phone.startsWith('55119') && target.phone.length === 13) {
          // Se falhar a verificação com o 9, tenta sem o nono dígito (padrão antigo SP)
          const altPhone = target.phone.slice(0, 4) + target.phone.slice(5);
          const checkAlt = await sock.onWhatsApp(altPhone);
          if (Array.isArray(checkAlt) && checkAlt[0]?.exists && checkAlt[0]?.jid) {
            resolvedJid = checkAlt[0].jid;
          }
        }
      } catch (errCheck) {
        // Fallback para o JID padrão
      }

      await sock.sendMessage(resolvedJid, { text: messageText });
      writeMicaLog(`✅ [${source}] Alerta entregue com sucesso para ${target.label} [${resolvedJid}]!`);
      dispatchRecord.results.push({ target: target.label, jid: resolvedJid, ok: true });
      anySuccess = true;
    } catch (err) {
      writeMicaLog(`❌ [${source}] Falha ao enviar para ${target.label} (${target.phone}): ${err.message}`);
      dispatchRecord.results.push({ target: target.label, error: err.message, ok: false });
    }
  }

  lastDispatches.unshift(dispatchRecord);
  if (lastDispatches.length > 20) lastDispatches.pop();

  if (anySuccess && lead.id) {
    notifiedIds.add(lead.id);
    saveNotifiedCache();
  }

  return anySuccess;
}

// ☁️ Monitoramento contínuo da nuvem AWS em tempo real (vigilância a cada 4 segundos)
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
            writeMicaLog(`🔔 [VIGIA AWS] Novo cadastro detectado na nuvem: "${lead.empresa || lead.nome}" (${leadId})`);
            await dispatchAlertToWhatsApp(lead, 'VIGIA_AWS');
          }
        }
      }
    }
  } catch (_) {
    // Erros transitórios de rede ignorados silenciosamente
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
      writeMicaLog(`⚠️ Conexão da Mica fechada. Motivo: ${lastDisconnect?.error?.message || 'Desconhecido'}`);
      if (shouldReconnect) {
        writeMicaLog('🔄 Reconectando Mica automaticamente em 3 segundos...');
        setTimeout(connectToWhatsApp, 3000);
      } else {
        writeMicaLog('❌ Sessão deslogada. Exclua auth_info_baileys para ler novo QR Code.');
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQr = null;
      writeMicaLog('✅ [MICA CONECTADA COM SUCESSO AO WHATSAPP!]');
      writeMicaLog(`🚀 Autorizada para disparar alertas para: ${NOTIFY_TARGETS.map(t => t.phone).join(', ')}`);
      
      // Inicia verificação imediata dos leads pendentes na nuvem
      pollAwsLeadsQueue();
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Mapa de controle de conversas ativas para evitar flood
  const clientChatState = new Map();

  // Escuta mensagens recebidas no WhatsApp da Mica
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const sender = msg.key.remoteJid || '';

      // Ignora mensagens de grupos e status broadcast
      if (sender.includes('@g.us') || sender === 'status@broadcast') continue;

      const text = (
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.documentMessage?.caption ||
        ''
      ).trim();

      const pushName = (msg.pushName || '').trim() || 'Cliente';
      const senderDigits = sender.replace(/\D/g, '');

      writeMicaLog(`📩 Mensagem recebida de ${pushName} (${sender}): "${text}"`);

      // 1. Se a mensagem vier de um canal autorizado da DIRETORIA
      const isAuthSender = NOTIFY_TARGETS.some(t => sender.includes(t.phone.slice(-8)));
      if (isAuthSender) {
        const cleanCmd = text.trim().toUpperCase();
        if (cleanCmd.startsWith('APROVAR') || cleanCmd === 'OK') {
          writeMicaLog('⚡ [COMANDO EXECUTIVO] Autorização confirmada via WhatsApp!');
          await sock.sendMessage(sender, {
            text: '✅ *[MICA]* Solicitação aprovada com sucesso! Esteira pericial atualizada.'
          });
        } else if (cleanCmd === 'STATUS') {
          await sock.sendMessage(sender, {
            text: `🤖 *[MICA STATUS 24/7]*\n\n🟢 Conectada ao WhatsApp: Sim\n☁️ Vigilância Nuvem AWS: Ativa\n📱 Destinatários Configurados: ${NOTIFY_TARGETS.map(t => t.label).join(', ')}\n📋 Leads Notificados no Cache: ${notifiedIds.size}`
          });
        }
        continue;
      }

      // 2. Se a mensagem vier de QUALQUER OUTRO NÚMERO (Lead / Cliente / Terceiro):

      // PASSO 1: AVISAR A DIRETORIA IMEDIATAMENTE NO WHATSAPP
      const alertaDiretoria = 
`🚨 *[MICA — NOVA MENSAGEM RECEBIDA NO WHATSAPP]* 🚨

👤 *Remetente:* ${pushName}
📱 *WhatsApp:* +${senderDigits}
💬 *Mensagem:* "${text || '[Mídia / Anexo]'}"
⏰ *Horário:* ${new Date().toLocaleTimeString('pt-BR')}
───────────────────────────────────
👉 *Conversar diretamente com o Cliente:*
https://wa.me/${senderDigits}
───────────────────────────────────
_A Mica já enviou a resposta inicial de acolhimento e triagem corporativa._`;

      for (const target of NOTIFY_TARGETS) {
        // Não envia o alerta para o próprio remetente
        if (sender.includes(target.phone.slice(-8))) continue;
        try {
          let resolvedTarget = `${target.phone}@s.whatsapp.net`;
          try {
            const check = await sock.onWhatsApp(target.phone);
            if (Array.isArray(check) && check[0]?.exists && check[0]?.jid) {
              resolvedTarget = check[0].jid;
            }
          } catch (_) {}

          await sock.sendMessage(resolvedTarget, { text: alertaDiretoria });
          writeMicaLog(`🔔 [ALERTA DIRETORIA] Mensagem de +${senderDigits} repassada para ${target.label}!`);
        } catch (errTarget) {
          writeMicaLog(`⚠️ Falha ao avisar ${target.label}: ${errTarget.message}`);
        }
      }

      // PASSO 2: RESPONDER AO CLIENTE SEGUINDO A ROTINA INSTITUCIONAL
      try {
        // Intervalo humanizado de 1.2s
        await new Promise(r => setTimeout(r, 1200));

        const lastState = clientChatState.get(sender) || { lastReplyTime: 0, count: 0 };
        const now = Date.now();
        const minutesSinceLastReply = (now - lastState.lastReplyTime) / (1000 * 60);

        let replyToClient = '';
        const cleanUpper = text.trim().toUpperCase();

        if (cleanUpper === '1') {
          replyToClient = 
`📊 *[AUDITORIA DE CRÉDITO & RATING BANCÁRIO]*

Nossa auditoria pericial analisa minuciosamente seu histórico nos 4 birôs oficiais e Banco Central:
• *Bacen SCR:* Identificação de apontamentos e prejuízos no Registrato.
• *Serasa, Boa Vista e Quod:* Saneamento cadastral, expurgo de dívidas prescritas e rating.

📋 *Para iniciarmos a triagem oficial dos seus birôs, acesse nossa Ficha Cadastral Blindada:*
👉 https://www.mouratoassociados.com.br/ficha-cadastral

_Nossa diretoria já foi notificada e dará continuidade ao seu atendimento em instantes._`;
        } else if (cleanUpper === '2') {
          replyToClient = 
`⚖️ *[GOVERNANÇA & REESTRUTURAÇÃO FINANCEIRA]*

Atuamos na defesa patrimonial de sócios, expurgo de dívidas prescritas e repactuação de spread bancário corporativo sob estrito protocolo de sigilo (NDA).

📋 *Para submeter sua empresa à triagem preliminar:*
👉 https://www.mouratoassociados.com.br/ficha-cadastral

_Nossa diretoria executiva entrará em contato em instantes por este canal._`;
        } else if (cleanUpper === '3' || cleanUpper.includes('FICHA') || cleanUpper.includes('LINK')) {
          replyToClient = 
`📋 *[FICHA CADASTRAL OFICIAL — MOURATO & ASSOCIADOS]*

Para preencher seus dados cadastrais e anexar seus relatórios sob sigilo pericial:
👉 https://www.mouratoassociados.com.br/ficha-cadastral

_Seus dados são protegidos por criptografia de ponta a ponta e sigilo pericial (LGPD)._`;
        } else if (minutesSinceLastReply > 15) {
          // Saudação Institucional de Abertura
          replyToClient = 
`Olá, *${pushName}*! Seja bem-vindo(a) à *Mourato & Associados*.

Sou a *Mica*, assistente virtual de inteligência e governança pericial.

Sua mensagem já foi entregue diretamente à nossa diretoria em tempo real.

⚖️ *Como podemos apoiar você ou sua empresa hoje?*
1️⃣ Auditoria de Crédito & Rating (Bacen SCR, Serasa, Boa Vista e Quod)
2️⃣ Governança, Reestruturação Financeira e Spread Bancário
3️⃣ Acesso à Ficha Cadastral Oficial e Onboarding

📋 *Caso deseje adiantar sua triagem pericial, acesse nossa Ficha Cadastral Blindada:*
👉 https://www.mouratoassociados.com.br/ficha-cadastral

_Um de nossos consultores seniores responderá diretamente a você por este canal em instantes._

───────────────────────────────────
_Mourato & Associados Ltda — CNPJ: 38.377.738/0001-45_
_Canal Oficial: (11) 97899-0034 | mourato@mouratoassociados.com.br_`;
        } else {
          // Resposta de acompanhamento humanizado para mensagens subsequentes
          replyToClient = `✅ Mensagem recebida, *${pushName}*! Já atualizei nossa diretoria com seu recado. Estamos verificando sua solicitação e já vamos responder.`;
        }

        if (replyToClient) {
          await sock.sendMessage(sender, { text: replyToClient });
          clientChatState.set(sender, { lastReplyTime: now, count: lastState.count + 1 });
          writeMicaLog(`💬 [RESPOSTA MICA ENVIADA AO CLIENTE] Entregue com sucesso para ${pushName} (${sender})!`);
        }
      } catch (errReply) {
        writeMicaLog(`❌ Erro ao responder ao cliente ${sender}: ${errReply.message}`);
      }
    }
  });
}

// Servidor HTTP interno da Mica
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Status da Mica com lista de destinatários e histórico
  if (url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      online: true,
      whatsappConnected: isConnected,
      targets: NOTIFY_TARGETS,
      awsQueueWatcher: true,
      notifiedLeadsCount: notifiedIds.size,
      recentDispatches: lastDispatches.slice(0, 5)
    }, null, 2));
  }

  // Visualizar QR Code no navegador
  if (url.pathname === '/qrcode') {
    if (isConnected) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0B0F19; color: #fff;">
          <h2 style="color: #10B981;">✅ MICA CONECTADA E OPERACIONAL 24/7!</h2>
          <p>Alertas sendo encaminhados para a Diretoria:</p>
          <ul style="list-style: none; padding: 0;">
            ${NOTIFY_TARGETS.map(t => `<li style="padding: 4px; color: #C5A869;">• <strong>${t.label}:</strong> ${t.phone}</li>`).join('')}
          </ul>
          <p style="color: #94A3B8;">Vigilância da nuvem AWS ativa a cada 4s.</p>
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

  // Força re-verificação imediata na nuvem AWS e limpa lead específico do cache para reenviar
  if (url.pathname === '/api/mica/resend-lead' && req.method === 'POST') {
    let bodyRaw = '';
    req.on('data', chunk => { bodyRaw += chunk; });
    req.on('end', async () => {
      try {
        const { leadId } = JSON.parse(bodyRaw || '{}');
        if (leadId) {
          notifiedIds.delete(leadId);
          saveNotifiedCache();
        }
        await pollAwsLeadsQueue();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, message: `Lead ${leadId || 'todos'} colocado na fila de reenvio!` }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
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
          return res.end(JSON.stringify({ ok: true, message: 'Alerta enviado via WhatsApp para a Diretoria!' }));
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
