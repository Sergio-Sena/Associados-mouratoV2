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

// Número oficial da Diretoria que recebe os alertas e autoriza as aprovações
const DIRECTOR_PHONE = '5511914572275';

// Destinatários de monitoramento (Alerta prioritário para Diretoria Hesiuel com cópia para Sérgio)
const NOTIFY_TARGETS = [
  { label: 'Diretoria Executiva (Hesiuel)', phone: DIRECTOR_PHONE },
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
let pendingLeadsMap = new Map(); // id -> lead data
let latestPendingLead = null;

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

// Carrega cache de leads já notificados para nunca duplicar alertas
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
console.log(`📱  Alerta Prioritário da Diretoria: ${DIRECTOR_PHONE}`);
console.log('☁️  Vigilância Nuvem AWS: ATIVA');
console.log('🔇  Regra de Ouro: Silêncio com o cliente até a aprovação');
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
🔒 *APROVAR NO CELULAR (1 TOQUE):*
👉 ${linkAprovacaoMobile}

Ou responda esta mensagem com:
*APROVAR*
───────────────────────────────────
_Mica • Atendimento Corporativo — Mourato & Associados Ltda_
_CNPJ: 38.377.738/0001-45 | Atendimento Oficial: (11) 97899-0034_`
  );
}

// Disparo de alerta exclusivo para a Diretoria solicitando aprovação (Cliente NUNCA recebe nada aqui)
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

  // Salva no mapa de pendentes para permitir aprovação via WhatsApp "APROVAR"
  if (lead.id) {
    pendingLeadsMap.set(String(lead.id), lead);
  }
  latestPendingLead = lead;

  for (const target of NOTIFY_TARGETS) {
    try {
      let resolvedJid = `${target.phone}@s.whatsapp.net`;

      try {
        const check = await sock.onWhatsApp(target.phone);
        if (Array.isArray(check) && check[0]?.exists && check[0]?.jid) {
          resolvedJid = check[0].jid;
        } else if (target.phone.startsWith('55119') && target.phone.length === 13) {
          const altPhone = target.phone.slice(0, 4) + target.phone.slice(5);
          const checkAlt = await sock.onWhatsApp(altPhone);
          if (Array.isArray(checkAlt) && checkAlt[0]?.exists && checkAlt[0]?.jid) {
            resolvedJid = checkAlt[0].jid;
          }
        }
      } catch (_) {}

      await sock.sendMessage(resolvedJid, { text: messageText });
      writeMicaLog(`✅ [${source}] Alerta entregue para ${target.label} [${resolvedJid}]!`);
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
          if (leadId && !notifiedIds.has(leadId) && lead.status !== 'aprovado') {
            writeMicaLog(`🔔 [VIGIA AWS] Nova solicitação detectada: "${lead.empresa || lead.nome}" (${leadId})`);
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

// -------------------------------------------------------------
// FUNÇÃO DE OURO: APROVAÇÃO E ABERTURA DE CONVERSA COM O CLIENTE
// -------------------------------------------------------------
async function approveAndSendFichaToClient(lead, customLinkFicha = '') {
  if (!lead) return { ok: false, error: 'Lead não especificado' };

  const leadNome = (lead.nome || 'Cliente').trim();
  const leadEmpresa = (lead.empresa || 'Empresa').trim();
  const leadProto = lead.protocolo || `MA-${(lead.id || Date.now()).toString().slice(0, 8).toUpperCase()}`;
  const leadTel = (lead.telefone || '').replace(/\D/g, '');
  const leadEmail = (lead.email || '').toLowerCase().trim();
  const leadId = lead.id || `lead-${Date.now()}`;

  const baseUrl = 'https://www.mouratoassociados.com.br';
  const leadToken = lead.token || leadId;
  const linkFicha = customLinkFicha || `${baseUrl}/ficha-cadastral?nome=${encodeURIComponent(leadNome)}&empresa=${encodeURIComponent(leadEmpresa)}&telefone=${encodeURIComponent(leadTel)}&email=${encodeURIComponent(leadEmail)}&token=${encodeURIComponent(leadToken)}&leadId=${encodeURIComponent(leadId)}&protocolo=${encodeURIComponent(leadProto)}&origem=audiencia_aprovada`;

  writeMicaLog(`⚡ [APROVAÇÃO] Processando liberação de Ficha para ${leadNome} (${leadEmpresa})...`);

  // Mensagem oficial institucional para o cliente (enviada pelo WhatsApp conectado da empresa 11 97899-0034)
  const msgCliente = 
`Prezado(a) *${leadNome}* (${leadEmpresa}),

Sua solicitação de atendimento corporativo foi formalmente *aprovada pela diretoria da Mourato & Associados*.

Para darmos início à estruturação pericial e análise cadastral, acesse sua Ficha Cadastral Blindada pelo link oficial abaixo:
👉 ${linkFicha}

📋 *Protocolo Oficial:* ${leadProto}
🔒 *Sigilo Pericial:* Seus dados e relatórios são protegidos por criptografia de ponta a ponta e estrito sigilo pericial.

Permanecemos à sua inteira disposição.

Atenciosamente,
*Mica • Diretoria Executiva*
*Mourato & Associados Ltda*
Canal Oficial: (11) 97899-0034`;

  let clientSent = false;
  let targetClientJid = '';

  if (isConnected && sock && leadTel && leadTel.length >= 8) {
    let clientDigits = leadTel;
    if (!clientDigits.startsWith('55')) clientDigits = '55' + clientDigits;
    targetClientJid = `${clientDigits}@s.whatsapp.net`;

    try {
      const check = await sock.onWhatsApp(clientDigits);
      if (Array.isArray(check) && check[0]?.exists && check[0]?.jid) {
        targetClientJid = check[0].jid;
      }
    } catch (_) {}

    try {
      await sock.sendMessage(targetClientJid, { text: msgCliente });
      writeMicaLog(`✅ [APROVAÇÃO] Mensagem com Ficha Cadastral entregue com sucesso para o cliente ${leadNome} [${targetClientJid}]!`);
      clientSent = true;
    } catch (err) {
      writeMicaLog(`❌ [APROVAÇÃO] Falha ao enviar para cliente ${targetClientJid}: ${err.message}`);
    }
  }

  // Notifica confirmação de volta para a Diretoria (5511914572275)
  const directorConfirmation = clientSent
    ? `✅ *[MICA — SOLICITAÇÃO APROVADA]*\n\nA solicitação de *${leadNome}* (${leadEmpresa}) foi aprovada com sucesso!\nO link oficial da ficha cadastral já foi enviado para o WhatsApp do cliente (+${leadTel}).\n\n📋 *Protocolo:* ${leadProto}`
    : `⚠️ *[MICA — SOLICITAÇÃO APROVADA]*\n\nA solicitação de *${leadNome}* (${leadEmpresa}) foi aprovada no sistema, porém não foi possível disparar mensagem automática para o WhatsApp (+${leadTel}).\nLink da Ficha:\n👉 ${linkFicha}`;

  try {
    let dirJid = `${DIRECTOR_PHONE}@s.whatsapp.net`;
    try {
      const checkDir = await sock.onWhatsApp(DIRECTOR_PHONE);
      if (Array.isArray(checkDir) && checkDir[0]?.exists && checkDir[0]?.jid) {
        dirJid = checkDir[0].jid;
      }
    } catch (_) {}
    await sock.sendMessage(dirJid, { text: directorConfirmation });
  } catch (_) {}

  // Atualiza banco oficial da Teia de Aranha com par ordenado PJ + PF
  try {
    saveApprovedLeadToTeia(lead, linkFicha);
  } catch (errDb) {
    writeMicaLog(`⚠️ Falha ao salvar no banco Teia: ${errDb.message}`);
  }

  return { ok: true, clientSent, clientJid: targetClientJid, linkFicha };
}

// Helper para salvar o par ordenado (PJ e PF) na base oficial
function saveApprovedLeadToTeia(lead, linkFicha) {
  const dirs = ['C:\\Projetos\\Empreas\\data', path.resolve(__dirname, '../../ClientesPF/data')];
  const leadId = String(lead.id || Date.now());
  const leadNome = (lead.nome || 'Cliente').trim().toUpperCase();
  const leadEmpresa = (lead.empresa || '').trim().toUpperCase();
  const leadTel = (lead.telefone || '').trim();
  const leadEmail = (lead.email || '').toLowerCase().trim();
  const leadProto = lead.protocolo || `MA-${Date.now()}`;
  const leadDoc = (lead.documento || lead.cpf || lead.cnpj || '').trim();

  const fichaRecord = {
    id_alias: lead.id_alias || `lead-${leadId.slice(0, 8)}`,
    id: `cli-lead-${leadId}`,
    lead_id: leadId,
    nome_completo: leadNome,
    cpf_raw: leadDoc.replace(/\D/g, ''),
    cpf_formatado: leadDoc,
    rg: '',
    orgao_expedidor: 'SSP/SP',
    nascimento: '',
    profissao: 'Sócio-Administrador',
    estado_civil: '',
    nacionalidade: 'Brasileira',
    nome_mae: '',
    nome_pai: '',
    email_principal: leadEmail,
    email_secundario: '',
    telefone_principal: leadTel,
    telefones_adicionais: [],
    endereco_principal: 'São Paulo - SP',
    endereco_secundario: '',
    cep: '',
    tipo_perfil: leadEmpresa ? 'Híbrido' : 'PF',
    empresa_solicitada: leadEmpresa,
    empresas_vinculadas: leadEmpresa ? [
      {
        razao_social: leadEmpresa,
        cnpj_formatado: '',
        qualificacao: 'Sócio-Administrador'
      }
    ] : [],
    protocolo: leadProto,
    pratica: lead.pratica || 'Assessoria & Rating',
    origem: 'Mica • Portal Oficial',
    rating_geral: 'Em Auditoria Pericial (Aguardando DRE/Balanço)',
    observacoes: `Lead aprovado pela diretoria. Link da ficha: ${linkFicha}`,
    created_at: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR'),
    updated_at: new Date().toISOString(),
    scores: []
  };

  dirs.forEach(d => {
    if (fs.existsSync(d)) {
      const fPath = path.join(d, 'fichas_cadastrais_db.json');
      if (fs.existsSync(fPath)) {
        try {
          const list = JSON.parse(fs.readFileSync(fPath, 'utf8'));
          const idx = list.findIndex(f => f.lead_id === leadId || f.id === `cli-lead-${leadId}` || (leadEmail && f.email_principal === leadEmail));
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...fichaRecord };
          } else {
            list.push(fichaRecord);
          }
          fs.writeFileSync(fPath, JSON.stringify(list, null, 2), 'utf8');
        } catch (_) {}
      }
    }
  });

  // Executa sync do Teia para gerar os cartões PJ e PF
  try {
    const syncScript = path.resolve(__dirname, 'sync_from_teia.mjs');
    if (fs.existsSync(syncScript)) {
      import(`file://${syncScript}`).catch(() => {});
    }
  } catch (_) {}
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
      writeMicaLog(`🚀 Alerta para a Diretoria: ${DIRECTOR_PHONE}`);
      
      // Inicia verificação imediata dos leads pendentes na nuvem
      pollAwsLeadsQueue();
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Escuta mensagens recebidas no WhatsApp da Mica
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const sender = msg.key.remoteJid || '';

      // Ignora grupos e broadcast
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

      // 1. COMANDOS VINDOS DA DIRETORIA AUTORIZADA
      const isDirector = sender.includes(DIRECTOR_PHONE.slice(-8)) || NOTIFY_TARGETS.some(t => sender.includes(t.phone.slice(-8)));
      if (isDirector) {
        const cleanCmd = text.trim().toUpperCase();

        if (cleanCmd.startsWith('APROVAR') || cleanCmd === 'OK') {
          writeMicaLog('⚡ [COMANDO EXECUTIVO DA DIRETORIA] Autorização confirmada via WhatsApp!');
          
          // Verifica se há ID especificado: "APROVAR <leadId>"
          const parts = text.trim().split(/\s+/);
          let targetLead = null;
          if (parts.length > 1 && pendingLeadsMap.has(parts[1])) {
            targetLead = pendingLeadsMap.get(parts[1]);
          } else {
            targetLead = latestPendingLead;
          }

          if (targetLead) {
            await approveAndSendFichaToClient(targetLead);
          } else {
            await sock.sendMessage(sender, {
              text: '⚠️ *[MICA]* Não encontrei nenhuma solicitação pendente recente para aprovar. Envie "APROVAR <ID>" ou aguarde novo lead.'
            });
          }
        } else if (cleanCmd === 'STATUS') {
          await sock.sendMessage(sender, {
            text: `🤖 *[MICA STATUS 24/7]*\n\n🟢 Conectada: Sim\n☁️ Vigilância Nuvem AWS: Ativa\n📱 Diretoria: ${DIRECTOR_PHONE}\n🔇 Modo Chatbot: Desativado (Zero mensagens invasivas ao cliente)\n📋 Leads Notificados: ${notifiedIds.size}`
          });
        }
        continue;
      }

      // 2. MENSAGEM VINDA DE CLIENTE / TERCEIRO:
      // REGRA DE OURO: A MICA NÃO RESPONDE AO CLIENTE COM MENUS OU MENSAGENS ALEATÓRIAS!
      // Ela apenas avisa a DIRETORIA no 11914572275 para que a equipe humana acompanhe.
      const alertaDiretoria = 
`🚨 *[MICA — RECADO RECEBIDO DE CLIENTE]* 🚨

👤 *Remetente:* ${pushName}
📱 *WhatsApp:* +${senderDigits}
💬 *Mensagem:* "${text || '[Mídia / Anexo]'}"
⏰ *Horário:* ${new Date().toLocaleTimeString('pt-BR')}
───────────────────────────────────
👉 *Conversar diretamente com o Cliente:*
https://wa.me/${senderDigits}
───────────────────────────────────
_A Mica manteve silêncio e repassou o recado para a equipe humana._`;

      try {
        let dirJid = `${DIRECTOR_PHONE}@s.whatsapp.net`;
        try {
          const checkDir = await sock.onWhatsApp(DIRECTOR_PHONE);
          if (Array.isArray(checkDir) && checkDir[0]?.exists && checkDir[0]?.jid) {
            dirJid = checkDir[0].jid;
          }
        } catch (_) {}
        await sock.sendMessage(dirJid, { text: alertaDiretoria });
        writeMicaLog(`🔔 [RECADO REPASSADO] Mensagem de +${senderDigits} entregue para a Diretoria!`);
      } catch (errTarget) {
        writeMicaLog(`⚠️ Falha ao repassar recado para Diretoria: ${errTarget.message}`);
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

  // Status da Mica
  if (url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      online: true,
      whatsappConnected: isConnected,
      directorPhone: DIRECTOR_PHONE,
      awsQueueWatcher: true,
      notifiedLeadsCount: notifiedIds.size,
      pendingCount: pendingLeadsMap.size,
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
          <p>Alertas direcionados para a Diretoria: <strong style="color: #C5A869;">${DIRECTOR_PHONE}</strong></p>
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

  // Endpoint Oficial: Aprovação de Lead disparada pelo Painel / Modal Web
  if (url.pathname === '/api/mica/approve-lead' && req.method === 'POST') {
    let bodyRaw = '';
    req.on('data', chunk => { bodyRaw += chunk; });
    req.on('end', async () => {
      try {
        const { lead, linkFicha } = JSON.parse(bodyRaw || '{}');
        const result = await approveAndSendFichaToClient(lead, linkFicha);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Disparo manual de alerta para novo lead
  if (url.pathname === '/api/mica/notify-lead' && req.method === 'POST') {
    let bodyRaw = '';
    req.on('data', chunk => { bodyRaw += chunk; });
    req.on('end', async () => {
      try {
        const lead = JSON.parse(bodyRaw || '{}');
        const ok = await dispatchAlertToWhatsApp(lead, 'WEBHOOK_LOCAL');
        res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok }));
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
