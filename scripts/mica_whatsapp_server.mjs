import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.MICA_PORT || 3050;
const AUTH_DIR = path.resolve(__dirname, '../auth_info_baileys');
const CACHE_FILE = path.resolve(AUTH_DIR, 'notified_lead_ids.json');
const LOG_FILE = path.resolve(AUTH_DIR, 'mica_history.log');

// Número da Mica conectado (WhatsApp Business):
const MICA_OWN_PHONE = '5511914572275';

// Número do Diretor Mourato (recebe o Dossiê e Briefing oficial):
const DIRECTOR_PHONE = '5511978990034';
const TEST_CLIENT_PHONE = '5511978990034';
const NOTIFY_TARGETS = [];

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
let activeClientStage = 'CONSENT';
const clientStageMap = new Map(); // sender/phone -> 'CONSENT' | 'SERASA' | 'BOAVISTA' | 'QUOD' | 'DONE'

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
  const leadMsg = (lead.contexto || lead.mensagem || lead.msg || lead.observacoes || '').trim();

  const linkAprovacaoMobile = `https://www.mouratoassociados.com.br/?view=mica-aprovar&leadId=${encodeURIComponent(lead.id || '')}&protocolo=${encodeURIComponent(leadProto)}&nome=${encodeURIComponent(leadNome)}&empresa=${encodeURIComponent(leadEmpresa)}&telefone=${encodeURIComponent(leadTel)}&email=${encodeURIComponent(leadEmail)}&pratica=${encodeURIComponent(leadPratica)}&token=mrt_sec_${(lead.id || 'sec').slice(0, 8)}`;

  return (
`🚨 *[MICA — NOVA SOLICITAÇÃO RECEBIDA]* 🚨

👤 *Titular:* ${leadNome}
🏢 *Empresa:* ${leadEmpresa}
📋 *Protocolo Oficial:* ${leadProto}
📱 *WhatsApp Cliente:* ${leadTel}
✉️ *E-mail:* ${leadEmail}
⚖️ *Prática:* ${leadPratica}
💬 *Mensagem Deixada pelo Cliente:*
"${leadMsg || 'Sem mensagem adicional descrita.'}"
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

  // 📲 DISPARO AUTOMÁTICO PARA O WHATSAPP DO CLIENTE (Mica se apresentando e pedindo Consentimento LGPD)
  const clientRaw = lead.telefone || lead.contato || lead.celular || '';
  let clientDigits = clientRaw.replace(/\D/g, '');
  if (clientDigits.length < 10) clientDigits = TEST_CLIENT_PHONE;
  if (!clientDigits.startsWith('55')) clientDigits = '55' + clientDigits;

  const leadProto = lead.protocolo || `MA-${(lead.id || Date.now()).toString().slice(0, 8).toUpperCase()}`;

  // Atualiza lead pendente ativo com protocolo e cnpj para resposta SIM
  lead.protocolo = leadProto;
  lead.telefone = clientDigits;
  latestPendingLead = lead;
  if (lead.id) pendingLeadsMap.set(String(lead.id), lead);
  pendingLeadsMap.set(leadProto, lead);
  clientStageMap.set(clientDigits, 'CONSENT');
  clientStageMap.set('default', 'CONSENT');

  const clientWelcomeMsg = 
`Olá, *${(lead.nome || 'Cliente').trim()}*! Aqui é a *Mica*, secretária executiva da *Mourato & Associados*. 👩‍💼

Recebemos a sua solicitação para a empresa *${(lead.empresa || 'Empresa').trim()}* com sucesso!
📋 *Protocolo Oficial:* ${leadProto}

Para darmos continuidade imediata ao seu atendimento e à estruturação de crédito, você autoriza o nosso departamento pericial a realizar as consultas cadastrais públicas da sua empresa (Receita Federal, certidões e regularidade)?

Responda diretamente com:
👉 *[ SIM ]* para autorizar e avançar
👉 *[ NÃO ]* para encerrar`;

  try {
    let clientJid = `${clientDigits}@s.whatsapp.net`;
    try {
      const checkCli = await sock.onWhatsApp(clientDigits);
      if (Array.isArray(checkCli) && checkCli[0]?.exists && checkCli[0]?.jid) {
        clientJid = checkCli[0].jid;
      }
    } catch (_) {}
    await sock.sendMessage(clientJid, { text: clientWelcomeMsg });
    writeMicaLog(`📲 [DISPARO CLIENTE AUTOMÁTICO] Boas-vindas e protocolo ${leadProto} entregues para o cliente ${clientDigits}!`);
  } catch (errCli) {
    writeMicaLog(`⚠️ Falha ao entregar para cliente ${clientDigits}: ${errCli.message}`);
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
            notifiedIds.add(leadId);
            saveNotifiedCache();
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
  const shortLinkFicha = `${baseUrl}/ficha-cadastral?token=${encodeURIComponent(leadToken)}&id=${encodeURIComponent(leadId)}`;

  writeMicaLog(`⚡ [APROVAÇÃO] Processando liberação de Ficha para ${leadNome} (${leadEmpresa})...`);

  // Mensagem oficial institucional para o cliente (enviada pelo WhatsApp conectado da empresa 11 97899-0034)
  const msgCliente = 
`Prezado(a) *${leadNome}* (${leadEmpresa}),

Sua solicitação de assessoria foi formalmente *aprovada pela diretoria da Mourato & Associados*.

Para preencher sua Ficha Cadastral Blindada, acesse o link oficial abaixo:

👉 *[ CLIQUE AQUI PARA PREENCHER SUA FICHA ]*
${shortLinkFicha}

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

const msgStore = new Map();

async function connectToWhatsApp() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Mica Pericial', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    getMessage: async (key) => {
      return msgStore.get(key.id)?.message || undefined;
    }
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
        writeMicaLog('❌ Sessão deslogada. Limpando credenciais antigas e gerando novo QR Code...');
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch (_) {}
        setTimeout(connectToWhatsApp, 1500);
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

  // Escuta mensagens recebidas no WhatsApp da Mica (suporta notify, append, ephemeral e retries)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      if (msg.key?.id) {
        msgStore.set(msg.key.id, msg);
        if (msgStore.size > 200) {
          const firstKey = msgStore.keys().next().value;
          msgStore.delete(firstKey);
        }
      }

      if (msg.key?.fromMe) continue;
      const sender = msg.key?.remoteJid || '';

      // Ignora grupos e broadcast
      if (!sender || sender.includes('@g.us') || sender === 'status@broadcast') continue;

      const raw = msg.message?.ephemeralMessage?.message ||
                  msg.message?.viewOnceMessage?.message ||
                  msg.message?.viewOnceMessageV2?.message ||
                  msg.message;
      if (!raw) continue;

      const text = (
        raw.conversation ||
        raw.extendedTextMessage?.text ||
        raw.imageMessage?.caption ||
        raw.documentMessage?.caption ||
        raw.buttonsResponseMessage?.selectedButtonId ||
        raw.templateButtonReplyMessage?.selectedId ||
        ''
      ).trim();

      const pushName = (msg.pushName || '').trim() || 'Cliente';
      const senderDigits = sender.replace(/\D/g, '');

      writeMicaLog(`📩 Mensagem recebida [type=${type}] de ${pushName} (${sender}): "${text}"`);
      if (!text) continue;

      // 1. COMANDOS VINDOS DA DIRETORIA AUTORIZADA (Apenas comandos explícitos como APROVAR ou STATUS)
      const cleanCmd = text.trim().toUpperCase();
      const isDirectorCmd = (cleanCmd.startsWith('APROVAR') || cleanCmd === 'STATUS') && 
                            Boolean(DIRECTOR_PHONE && DIRECTOR_PHONE.length >= 8 && sender.includes(DIRECTOR_PHONE.slice(-8)));
      if (isDirectorCmd) {
        if (cleanCmd.startsWith('APROVAR')) {
          writeMicaLog('⚡ [COMANDO EXECUTIVO DA DIRETORIA] Autorização confirmada via WhatsApp!');
          
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
            text: `🤖 *[MICA STATUS 24/7]*\n\n🟢 Conectada: Sim\n☁️ Vigilância Nuvem AWS: Ativa\n📱 Diretor Mourato: ${DIRECTOR_PHONE}\n📋 Leads Notificados: ${notifiedIds.size}`
          });
        }
        continue;
      }

      // 2. MENSAGEM VINDA DE CLIENTE / TERCEIRO (MÁQUINA DE ESTADOS SEQUENCIAL DOS BIRÔS):
      const cleanClientText = text.trim().toUpperCase();
      let currentStage = clientStageMap.get(sender) || clientStageMap.get(senderDigits) || activeClientStage || 'CONSENT';

      writeMicaLog(`📩 [ETAPA CLIENTE: ${currentStage}] ${pushName} (${sender}): "${text}"`);

      const isSim = /^(SIM|S|YES|OK|AUTORIZO|CONFIRMO|CADASTRADO|CONCLUIDO|CONCLUÍDO|PRONTO)$/i.test(cleanClientText) || cleanClientText.startsWith('SIM');
      const isNao = /^(NAO|NÃO|N|NO|RECUSO|CANCELAR)$/i.test(cleanClientText) || cleanClientText.startsWith('NÃO') || cleanClientText.startsWith('NAO');

      // FLUXO ETAPA 0: CONSENTIMENTO INICIAL LGPD
      if (currentStage === 'CONSENT') {
        if (isSim) {
          activeClientStage = 'SERASA';
          clientStageMap.set(sender, 'SERASA');
          clientStageMap.set(senderDigits, 'SERASA');
          clientStageMap.set('default', 'SERASA');
          writeMicaLog(`⚡ [CONSENTIMENTO CLIENTE] ${pushName} autorizou consultas via WhatsApp! Avançando para SERASA.`);

          const serasaMsg = 
`✅ *Autorização Confirmada com Sucesso!*

O departamento pericial da *Mourato & Associados* já iniciou as consultas públicas da sua empresa.

🔷 *Etapa 1 de 3 — Birô SERASA:*
Acesse o portal oficial do Serasa para login ou cadastro:
👉 https://www.serasa.com.br/

Você já possui cadastro ativo ou concluiu o login no Serasa?
Responda diretamente:
👉 *[ SIM ]* para prosseguir
👉 *[ NÃO ]* caso ainda não tenha cadastro`;

          await sock.sendMessage(sender, { text: serasaMsg });

          // Aciona o Agente Questão e o CIO Alfred através da esteira autônoma
          try {
            const currentLead = latestPendingLead || {};
            const proto = currentLead.protocolo || 'MA-TESTE';
            const cnpjToProcess = (currentLead.cnpj || '').replace(/\D/g, '') || '57433630000177';
            fetch('http://127.0.0.1:9000/api/pipeline/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cnpj: cnpjToProcess,
                telefone: senderDigits || currentLead.telefone || '11978990034',
                email: currentLead.email || '',
                nome_contato: pushName || currentLead.nome || 'Cliente',
                simular_consentimento_imediato: true
              })
            }).then(r => r.json()).then(async res => {
              writeMicaLog(`🚀 [ESTEIRA DISPARADA COM SUCESSO] Parecer: ${res?.recomendacao_alfred} | Score: ${res?.score_viabilidade}`);
            }).catch(e => {
              writeMicaLog(`⚠️ Falha ao acionar esteira no Alfred: ${e.message}`);
            });
          } catch (_) {}
          continue;
        } else if (isNao) {
          await sock.sendMessage(sender, { text: 'Agradecemos o seu retorno. Por respeito à sua privacidade e às diretrizes da LGPD, seu protocolo foi encerrado. Tenha um excelente dia!' });
          continue;
        } else {
          // Orientação para responder SIM ou NÃO
          await sock.sendMessage(sender, {
            text: `Por favor, responda diretamente:\n👉 *[ SIM ]* para autorizar as consultas e prosseguir\n👉 *[ NÃO ]* para encerrar o protocolo`
          });
          continue;
        }
      }

      // FLUXO ETAPA 1: BIRÔ SERASA
      if (currentStage === 'SERASA') {
        if (isSim) {
          activeClientStage = 'BOAVISTA';
          clientStageMap.set(sender, 'BOAVISTA');
          clientStageMap.set(senderDigits, 'BOAVISTA');
          clientStageMap.set('default', 'BOAVISTA');
          writeMicaLog(`⚡ [ONBOARDING] Serasa validado por ${pushName}! Avançando para BOA VISTA.`);

          const boaVistaMsg = 
`✅ *Excelente! Serasa confirmado com sucesso.*

🔶 *Etapa 2 de 3 — Birô BOA VISTA (Consumidor Positivo):*
Acesse o link oficial da Boa Vista:
👉 https://app.consumidorpositivo.com.br/inicio

Você já possui cadastro ativo ou concluiu o login na Boa Vista?
Responda diretamente:
👉 *[ SIM ]* para prosseguir
👉 *[ NÃO ]* caso ainda não tenha cadastro`;

          await sock.sendMessage(sender, { text: boaVistaMsg });
          continue;
        } else if (isNao) {
          const orientacaoSerasa = 
`Para dar continuidade ao processo de estruturação de crédito, é fundamental que você realize o seu cadastro no Serasa:
👉 https://www.serasa.com.br/

Assim que concluir o seu cadastro, responda *[ SIM ]* aqui para podermos prosseguir!`;
          await sock.sendMessage(sender, { text: orientacaoSerasa });
          continue;
        } else {
          await sock.sendMessage(sender, {
            text: `Por favor, confirme sobre o Serasa:\n👉 *[ SIM ]* para prosseguir\n👉 *[ NÃO ]* para receber orientações de cadastro`
          });
          continue;
        }
      }

      // FLUXO ETAPA 2: BIRÔ BOA VISTA
      if (currentStage === 'BOAVISTA') {
        if (isSim) {
          activeClientStage = 'QUOD';
          clientStageMap.set(sender, 'QUOD');
          clientStageMap.set(senderDigits, 'QUOD');
          clientStageMap.set('default', 'QUOD');
          writeMicaLog(`⚡ [ONBOARDING] Boa Vista validada por ${pushName}! Avançando para QUOD.`);

          const quodMsg = 
`✅ *Perfeito! Boa Vista confirmada com sucesso.*

🟣 *Etapa 3 de 3 — Birô QUOD:*
Acesse o portal oficial do Consumidor Quod:
👉 https://consumidor.quod.com.br/

Você já possui cadastro ativo ou concluiu o login na Quod?
Responda diretamente:
👉 *[ SIM ]* para prosseguir e finalizar os birôs
👉 *[ NÃO ]* caso ainda não tenha cadastro`;

          await sock.sendMessage(sender, { text: quodMsg });
          continue;
        } else if (isNao) {
          const orientacaoBoaVista = 
`Para dar continuidade ao processo de estruturação de crédito, é fundamental que você realize o seu cadastro na Boa Vista:
👉 https://app.consumidorpositivo.com.br/inicio

Assim que concluir o seu cadastro, responda *[ SIM ]* aqui para podermos prosseguir!`;
          await sock.sendMessage(sender, { text: orientacaoBoaVista });
          continue;
        } else {
          await sock.sendMessage(sender, {
            text: `Por favor, confirme sobre a Boa Vista:\n👉 *[ SIM ]* para prosseguir\n👉 *[ NÃO ]* para receber orientações de cadastro`
          });
          continue;
        }
      }

      // FLUXO ETAPA 3: BIRÔ QUOD -> DISPARO DO 4º PASSO
      if (currentStage === 'QUOD') {
        if (isSim) {
          activeClientStage = 'DONE';
          clientStageMap.set(sender, 'DONE');
          clientStageMap.set(senderDigits, 'DONE');
          clientStageMap.set('default', 'DONE');
          writeMicaLog(`🎉 [ONBOARDING CONCLUÍDO] Todos os 3 birôs validados com sucesso por ${pushName}! Liberando Questão e Alfred.`);

          const conclusaoMsg = 
`Prezado(a) cliente,

Para darmos continuidade ao seu atendimento e prosseguirmos com a estruturação pericial, acesse a nossa Planilha Oficial de Cadastro vinculada ao portal:

👉 *[ PLANILHA DE CADASTRO OFICIAL ]*
https://www.mouratoassociados.com.br/cadastro

🔒 *Segurança Jurídica & Compliance:*
O preenchimento desta planilha é essencial para a formalização cadastral, validação pericial das informações e estrito cumprimento das leis vigentes e das normas de segurança da Mourato & Associados.

🏛️ *Consulta Oficial ao Banco Central (Bacen):*
Informamos que a nossa equipe técnica entrará em contato em breve para agendarmos um horário e realizarmos juntos a consulta oficial do Bacen (Registrato SCR).`;

          await sock.sendMessage(sender, { text: conclusaoMsg });

          // Dispara o Questão com 1000% de autoridade e o Alfred em segundo plano para gerar e salvar o Dossiê em PDF
          try {
            const currentLead = latestPendingLead || {};
            const proto = currentLead.protocolo || 'MA-TESTE';
            const cnpjToProcess = (currentLead.cnpj || '').replace(/\D/g, '') || '57433630000177';
            fetch('http://127.0.0.1:9000/api/pipeline/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cnpj: cnpjToProcess,
                telefone: senderDigits || currentLead.telefone || '11978990034',
                email: currentLead.email || '',
                nome_contato: pushName || currentLead.nome || 'Cliente',
                simular_consentimento_imediato: true
              })
            }).then(r => r.json()).then(async res => {
              writeMicaLog(`🚀 [QUESTÃO & ALFRED - ETAPA 4] Dossiê gerado com 1000% de autoridade! Parecer: ${res?.recomendacao_alfred} | Score: ${res?.score_viabilidade} | Pasta: ${res?.arquivos_gerados?.folder_path}`);

              // 📲 TRANSMISSÃO DO DOSSIÊ E PARECER PARA O DIRETOR MOURATO (11 97899-0034)
              if (res && DIRECTOR_PHONE) {
                let dirJid = `${DIRECTOR_PHONE}@s.whatsapp.net`;
                try {
                  const checkDir = await sock.onWhatsApp(DIRECTOR_PHONE);
                  if (Array.isArray(checkDir) && checkDir[0]?.exists && checkDir[0]?.jid) {
                    dirJid = checkDir[0].jid;
                  }
                } catch (_) {}

                // 1. Envia Briefing Executivo do Alfred para o Diretor
                if (res.briefing_whatsapp_mourato) {
                  await sock.sendMessage(dirJid, { text: res.briefing_whatsapp_mourato });
                  writeMicaLog(`📋 [PARECER ENVIADO] Briefing do Alfred entregue para o Diretor Mourato (${DIRECTOR_PHONE})!`);
                }

                // 2. Anexa e envia o arquivo PDF oficial do Dossiê Pericial
                const pdfPath = res.arquivos_gerados?.dossie_pdf;
                if (pdfPath && fs.existsSync(pdfPath)) {
                  try {
                    const pdfBuffer = fs.readFileSync(pdfPath);
                    await sock.sendMessage(dirJid, {
                      document: pdfBuffer,
                      mimetype: 'application/pdf',
                      fileName: 'DOSSIE_PERICIAL_INVESTIGACAO_QUESTAO.pdf',
                      caption: `📄 *Dossiê Pericial Oficial Mourato & Associados*\nProtocolo: ${res.protocolo}\nScore: ${res.score_viabilidade}/100 — Parecer: ${res.recomendacao_alfred}\nSalvo no servidor em: ${res.arquivos_gerados?.folder_path}`
                    });
                    writeMicaLog(`📎 [PDF TRANSMITIDO] Dossiê Pericial enviado com sucesso para o Diretor Mourato!`);
                  } catch (errPdf) {
                    writeMicaLog(`⚠️ Falha ao transmitir arquivo PDF: ${errPdf.message}`);
                  }
                }
              }
            }).catch(e => {
              writeMicaLog(`⚠️ Falha ao acionar esteira Questão/Alfred: ${e.message}`);
            });
          } catch (_) {}
          continue;
        } else if (isNao) {
          const orientacaoQuod = 
`Para darmos continuidade ao processo e liberar a planilha pericial da 4ª etapa, por favor acesse e realize seu cadastro na Quod:
👉 https://consumidor.quod.com.br/

Assim que concluir o seu cadastro, responda *[ SIM ]* aqui para podermos prosseguir e liberar a planilha de coleta!`;
          await sock.sendMessage(sender, { text: orientacaoQuod });
          continue;
        } else {
          await sock.sendMessage(sender, {
            text: `Por favor, confirme sobre a Quod:\n👉 *[ SIM ]* para finalizar os birôs e avançar para o 4º passo\n👉 *[ NÃO ]* para receber orientações de cadastro`
          });
          continue;
        }
      }

      // FLUXO CONCLUÍDO:
      if (currentStage === 'DONE') {
        await sock.sendMessage(sender, {
          text: `Seu processo de onboarding dos birôs já foi concluído com sucesso e o seu Dossiê Pericial está sendo averiguado pelo CIO Alfred.\n\nLink oficial da planilha de cadastro:\n👉 https://www.mouratoassociados.com.br/cadastro`
        });
        continue;
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

  // Endpoint Oficial: Ficha Cadastral preenchida e concluída pelo cliente
  if (url.pathname === '/api/mica/ficha-completed' && req.method === 'POST') {
    let bodyRaw = '';
    req.on('data', chunk => { bodyRaw += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(bodyRaw || '{}');
        const nome = (data.nome || 'Cliente').trim();
        const empresa = (data.empresa || '').trim();
        const protocolo = data.protocolo || 'MA-OFICIAL';
        const telefone = (data.telefone || '').trim();
        const email = (data.email || '').trim();

        writeMicaLog(`🎉 [FICHA CONCLUÍDA] Cadastro concluído por ${nome} (${empresa}) Protocolo ${protocolo}`);

        // Rotina de envio oficial: 0034 para 2275 avisando que o cadastro foi concluído
        const alertaConclusao = 
`📋 *[MICA — CADASTRO CONCLUÍDO]* 📋

👤 *Titular:* ${nome}
🏢 *Empresa:* ${empresa || 'Não informada'}
📋 *Protocolo:* ${protocolo}
📱 *WhatsApp:* ${telefone || 'Não informado'}
✉️ *E-mail:* ${email || 'Não informado'}
───────────────────────────────────
✅ Ficha cadastral transmitida pelo cliente!
Par ordenado PJ e PF integrado à esteira pericial.
A equipe humana e a Teia já podem iniciar a análise dos birôs.
───────────────────────────────────
_Mica • Atendimento Corporativo — Mourato & Associados_`;

        let ok = false;
        if (isConnected && sock && DIRECTOR_PHONE) {
          try {
            let dirJid = `${DIRECTOR_PHONE}@s.whatsapp.net`;
            try {
              const checkDir = await sock.onWhatsApp(DIRECTOR_PHONE);
              if (Array.isArray(checkDir) && checkDir[0]?.exists && checkDir[0]?.jid) {
                dirJid = checkDir[0].jid;
              }
            } catch (_) {}
            await sock.sendMessage(dirJid, { text: alertaConclusao });
            writeMicaLog(`🔔 [AVISO DIRETORIA] Alerta de cadastro concluído entregue para ${DIRECTOR_PHONE}!`);
            ok = true;
          } catch (errSend) {
            writeMicaLog(`⚠️ Falha ao avisar diretoria: ${errSend.message}`);
          }
        }

        // DISPARO OFICIAL PARA O WHATSAPP DO CLIENTE (Mica solicitando Consentimento LGPD)
        let clientDigits = (telefone || '').replace(/\D/g, '');
        if (clientDigits.length < 10) clientDigits = TEST_CLIENT_PHONE;
        if (!clientDigits.startsWith('55')) clientDigits = '55' + clientDigits;

        const msgCliente = 
`Olá, *${nome}*! Aqui é a *Mica*, secretária executiva da *Mourato & Associados*. 👩‍💼

Confirmamos o recebimento da sua Ficha Cadastral com sucesso!
📋 *Protocolo Oficial:* ${protocolo}
🏢 *Empresa:* ${empresa || 'Pessoa Física'}

Para darmos continuidade ao atendimento e à estruturação do seu crédito, você autoriza o nosso departamento de inteligência pericial a realizar as consultas cadastrais públicas da sua empresa (Receita Federal, certidões e regularidade)?

Responda diretamente com:
👉 *[ SIM ]* para autorizar e avançar
👉 *[ NÃO ]* para encerrar`;

        if (isConnected && sock) {
          try {
            let clientJid = `${clientDigits}@s.whatsapp.net`;
            try {
              const checkCli = await sock.onWhatsApp(clientDigits);
              if (Array.isArray(checkCli) && checkCli[0]?.exists && checkCli[0]?.jid) {
                clientJid = checkCli[0].jid;
              }
            } catch (_) {}
            await sock.sendMessage(clientJid, { text: msgCliente });
            writeMicaLog(`📲 [DISPARO CLIENTE] Mensagem de protocolo e consentimento entregue para ${clientDigits}!`);
          } catch (errCli) {
            writeMicaLog(`⚠️ Falha ao enviar para cliente ${clientDigits}: ${errCli.message}`);
          }
        }

        // Armazena no estado ativo para responder ao consentimento SIM via WhatsApp
        const leadObj = {
          nome,
          empresa,
          protocolo,
          telefone: clientDigits,
          email,
          cnpj: data.cnpj || data.payload?.empresa?.cnpj || data.payload?.documento || '57433630000177',
          cpf: data.cpf || data.payload?.titular?.cpf || '',
          data_criacao: new Date().toISOString()
        };
        latestPendingLead = leadObj;
        pendingLeadsMap.set(protocolo, leadObj);
        clientStageMap.set(clientDigits, 'CONSENT');
        clientStageMap.set('default', 'CONSENT');

        // Atualiza banco oficial da Teia
        try {
          saveApprovedLeadToTeia({
            nome,
            empresa,
            protocolo,
            telefone,
            email,
            documento: data.payload?.documento || data.payload?.titular?.cpf || ''
          }, '');
        } catch (_) {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, sent: ok }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
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
