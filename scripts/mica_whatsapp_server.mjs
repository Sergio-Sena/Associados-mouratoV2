import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.MICA_PORT || 3050;
const AUTH_DIR = path.resolve(__dirname, '../auth_info_baileys');
const DATA_DIR = path.resolve(__dirname, '../mica_data');
const CACHE_FILE = path.resolve(DATA_DIR, 'notified_lead_ids.json');
const SESSIONS_FILE = path.resolve(DATA_DIR, 'mica_sessions.json');
const QUESTAO_HANDOFF_FILE = path.resolve(DATA_DIR, 'mica_questao_handoff.json');
const LOG_FILE = path.resolve(DATA_DIR, 'mica_history.log');
const ALFRED_CIO_URL = process.env.ALFRED_CIO_URL || 'http://127.0.0.1:9000';

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
let isConnecting = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let lastDisconnectReason = '';
let isPollingAws = false;
let lastDispatches = [];
let pendingLeadsMap = new Map(); // id -> lead data
let latestPendingLead = null;
const clientStageMap = new Map(); // sender/phone -> 'CONSENT' | 'SERASA' | 'BOAVISTA' | 'QUOD' | 'PLANILHA' | 'DONE'
const questaoHandoffQueue = []; // Pacotes estruturados coletados pela Mica prontos para o Questão

// Garante diretórios separados (AUTH_DIR isolado de DATA_DIR para nunca perder histórico/cache em relogin)
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

// Blindagem Anti-Crash 24/7: nenhum erro transitório de rede pode derrubar o processo da Mica
process.on('uncaughtException', (err) => {
  writeMicaLog(`🛡️ [ANTI-CRASH uncaughtException] ${err?.stack || err?.message || err}`);
});
process.on('unhandledRejection', (reason) => {
  writeMicaLog(`🛡️ [ANTI-CRASH unhandledRejection] ${reason?.stack || reason?.message || reason}`);
});

// Logger persistente em arquivo
function writeMicaLog(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  console.log(msg);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (_) {}
}

// Carrega cache de leads já notificados (migra do AUTH_DIR legado se existir)
let notifiedIds = new Set();
try {
  const legacyCache = path.resolve(AUTH_DIR, 'notified_lead_ids.json');
  const sourceCache = fs.existsSync(CACHE_FILE) ? CACHE_FILE : (fs.existsSync(legacyCache) ? legacyCache : null);
  if (sourceCache) {
    const raw = fs.readFileSync(sourceCache, 'utf8');
    const list = JSON.parse(raw);
    if (Array.isArray(list)) notifiedIds = new Set(list);
  }
} catch (_) {}

// Carrega sessões de clientes persistidas (evita perder estágio após restart do PM2)
try {
  if (fs.existsSync(SESSIONS_FILE)) {
    const savedSessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    if (savedSessions && typeof savedSessions === 'object') {
      for (const [k, v] of Object.entries(savedSessions)) {
        clientStageMap.set(k, v);
      }
    }
  }
} catch (_) {}

// Carrega fila de handoff pronta para o Questão
try {
  if (fs.existsSync(QUESTAO_HANDOFF_FILE)) {
    const savedQueue = JSON.parse(fs.readFileSync(QUESTAO_HANDOFF_FILE, 'utf8'));
    if (Array.isArray(savedQueue)) questaoHandoffQueue.push(...savedQueue);
  }
} catch (_) {}

function saveNotifiedCache() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(Array.from(notifiedIds), null, 2), 'utf8');
  } catch (_) {}
}

function saveSessionsCache() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(clientStageMap.entries()), null, 2), 'utf8');
  } catch (_) {}
}

function enqueueForQuestao(payload) {
  try {
    const key = payload.protocolo || payload.cnpj || payload.telefone || `pkg-${Date.now()}`;
    const idx = questaoHandoffQueue.findIndex(item => (item.protocolo && item.protocolo === payload.protocolo) || (payload.cnpj && item.cnpj === payload.cnpj));
    const entry = {
      ...payload,
      updated_at: new Date().toISOString(),
      status_questao: payload.status_questao || 'PRONTO_PARA_QUESTAO'
    };
    if (idx >= 0) {
      questaoHandoffQueue[idx] = { ...questaoHandoffQueue[idx], ...entry };
    } else {
      questaoHandoffQueue.unshift(entry);
      if (questaoHandoffQueue.length > 200) questaoHandoffQueue.pop();
    }
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(QUESTAO_HANDOFF_FILE, JSON.stringify(questaoHandoffQueue, null, 2), 'utf8');
    writeMicaLog(`📦 [HANDOFF QUESTÃO] Pacote salvo e disponível em /api/mica/questao-ready (${key})`);
  } catch (e) {
    writeMicaLog(`⚠️ [HANDOFF QUESTÃO] Falha ao salvar pacote: ${e.message}`);
  }
}

function getClientStage(sender, senderDigits) {
  if (clientStageMap.has(sender)) return clientStageMap.get(sender);
  if (senderDigits && clientStageMap.has(senderDigits)) return clientStageMap.get(senderDigits);
  const last8 = (senderDigits || '').slice(-8);
  if (last8.length === 8) {
    for (const [k, v] of clientStageMap.entries()) {
      if (k.includes(last8)) return v;
    }
  }
  return 'CONSENT';
}

function setClientStage(sender, senderDigits, stage) {
  if (sender) clientStageMap.set(sender, stage);
  if (senderDigits) {
    clientStageMap.set(senderDigits, stage);
    clientStageMap.set(`${senderDigits}@s.whatsapp.net`, stage);
  }
  saveSessionsCache();
}

function resetClientStageForPhone(digits) {
  const clean = (digits || '').replace(/\D/g, '');
  const last8 = clean.slice(-8);
  for (const key of Array.from(clientStageMap.keys())) {
    if ((last8 && key.includes(last8)) || key === 'default' || key.endsWith('@lid')) {
      clientStageMap.delete(key);
    }
  }
  if (clean) {
    clientStageMap.set(clean, 'CONSENT');
    clientStageMap.set(`${clean}@s.whatsapp.net`, 'CONSENT');
  }
  saveSessionsCache();
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

  // CRÍTICO: Limpa qualquer estágio antigo (inclusive @s.whatsapp.net / @lid) para reiniciar do CONSENT
  resetClientStageForPhone(clientDigits);

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
    clientStageMap.set(clientJid, 'CONSENT');
    await sock.sendMessage(clientJid, { text: clientWelcomeMsg });
    anySuccess = true;
    dispatchRecord.results.push({ target: clientDigits, jid: clientJid, status: 'sent_welcome' });
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
            if (!isConnected || !sock) {
              // Não marca como notificado enquanto WhatsApp estiver offline; reprocessa assim que reconectar!
              continue;
            }
            writeMicaLog(`🔔 [VIGIA AWS] Nova solicitação detectada: "${lead.empresa || lead.nome}" (${leadId})`);

            // ⚡ GATILHO PRÓPRIO DO AGENTE QUESTÃO: NOVO CLIENTE DETECTADO NA NUVEM!
            const rawContext = typeof lead.contexto === 'string' ? lead.contexto : JSON.stringify(lead.contexto || {});
            const cnpjMatch = rawContext.match(/\d{14}/) || (lead.empresa && lead.empresa.match(/\d{14}/)) || (lead.cnpj && lead.cnpj.replace(/\D/g, '').match(/^\d{14}$/));
            const cnpjToScan = cnpjMatch ? cnpjMatch[0] : '';

            enqueueForQuestao({
              lead_id: leadId,
              protocolo: lead.protocolo || `MA-${String(leadId).slice(0, 8).toUpperCase()}`,
              nome: lead.nome || 'Cliente',
              empresa: lead.empresa || '',
              cnpj: cnpjToScan,
              telefone: lead.telefone || '',
              email: lead.email || '',
              etapa_mica: 'CONSENT',
              origem: 'VIGIA_AWS'
            });

            if (cnpjToScan && cnpjToScan.length === 14) {
              writeMicaLog(`⚡ [GATILHO QUESTÃO 4.0] Disparando investigação pericial automática para CNPJ: ${cnpjToScan}...`);
              try {
                fetch(`${ALFRED_CIO_URL}/api/pipeline/process`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cnpj: cnpjToScan,
                    telefone: lead.telefone || '',
                    email: lead.email || '',
                    nome_contato: lead.nome || lead.empresa || 'Cliente',
                    simular_consentimento_imediato: true
                  })
                }).then(r => r.json()).then(qRes => {
                  writeMicaLog(`✅ [QUESTÃO CONCLUÍDO NOVO CLIENTE] ${qRes.empresa} | Score: ${qRes.score_viabilidade}/100 | Parecer: ${qRes.recomendacao_alfred}`);
                }).catch(errQ => {
                  writeMicaLog(`ℹ️ [GATILHO QUESTÃO] Motor remoto/local aguardando coleta via /api/mica/questao-ready (${errQ.message})`);
                });
              } catch (_) {}
            }

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
  const linkFicha = customLinkFicha || shortLinkFicha;

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
const processedMsgIds = new Set(); // Deduplicação estrita: impede que a mesma mensagem avance 2+ etapas
const lastSenderReplyTs = new Map(); // Anti-bounce (1.5s por remetente)

function scheduleReconnect(delayMs) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToWhatsApp();
  }, delayMs);
}

async function connectToWhatsApp() {
  if (isConnecting) {
    writeMicaLog('⏳ [MICA] Conexão já em andamento — ignorando chamada duplicada.');
    return;
  }
  isConnecting = true;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let version;
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest?.version;
      writeMicaLog(`📡 [MICA] Versão WhatsApp Web sincronizada: ${Array.isArray(version) ? version.join('.') : 'padrão'}`);
    } catch (_) {}

    sock = makeWASocket({
      auth: state,
      ...(version ? { version } : {}),
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      keepAliveIntervalMs: 25000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 2000,
      getMessage: async (key) => {
        return msgStore.get(key.id)?.message || undefined;
      }
    });
  } catch (initErr) {
    isConnecting = false;
    reconnectAttempts += 1;
    const waitMs = Math.min(45000, 3000 * Math.pow(2, Math.min(reconnectAttempts - 1, 4)));
    writeMicaLog(`❌ [MICA] Erro ao iniciar socket Baileys: ${initErr.message}. Tentando novamente em ${Math.round(waitMs / 1000)}s...`);
    scheduleReconnect(waitMs);
    return;
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      isConnecting = false;
      console.log('\n📱 [MICA QR CODE] ESCANEIE COM O WHATSAPP PARA AUTORIZAR A MICA:');
      qrcode.generate(qr, { small: true });
      console.log('💡 Ou acesse pelo navegador: http://localhost:' + PORT + '/qrcode\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reasonMsg = lastDisconnect?.error?.message || `statusCode=${statusCode || 'Desconhecido'}`;
      lastDisconnectReason = `${reasonMsg} (code=${statusCode || 'N/A'})`;
      isConnected = false;
      isConnecting = false;
      writeMicaLog(`⚠️ Conexão da Mica fechada. Motivo: ${lastDisconnectReason}`);

      if (statusCode === DisconnectReason.loggedOut) {
        reconnectAttempts = 0;
        writeMicaLog('❌ Sessão deslogada pelo WhatsApp (401). Limpando APENAS auth_info_baileys (mica_data preservado) e gerando novo QR Code...');
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch (_) {}
        scheduleReconnect(2000);
      } else if (statusCode === DisconnectReason.restartRequired) {
        reconnectAttempts = 0;
        writeMicaLog('🔄 Restart normal solicitado pelo WhatsApp (515 pós-pareamento). Reconectando em 1.5s...');
        scheduleReconnect(1500);
      } else if (statusCode === DisconnectReason.connectionReplaced) {
        reconnectAttempts += 1;
        writeMicaLog('⚠️ Conflito de sessão (440 connectionReplaced): outra instância conectou no mesmo número! Aguardando 30s antes de reconectar.');
        scheduleReconnect(30000);
      } else {
        reconnectAttempts += 1;
        const waitMs = Math.min(45000, 3000 * Math.pow(2, Math.min(reconnectAttempts - 1, 4)));
        writeMicaLog(`🔄 Reconectando Mica automaticamente em ${Math.round(waitMs / 1000)}s (tentativa #${reconnectAttempts}, credenciais preservadas)...`);
        scheduleReconnect(waitMs);
      }
    } else if (connection === 'open') {
      isConnected = true;
      isConnecting = false;
      reconnectAttempts = 0;
      lastDisconnectReason = '';
      currentQr = null;
      writeMicaLog('✅ [MICA CONECTADA COM SUCESSO AO WHATSAPP 24/7!]');
      writeMicaLog(`🚀 Alerta para a Diretoria: ${DIRECTOR_PHONE}`);
      
      // Inicia verificação imediata dos leads pendentes na nuvem
      pollAwsLeadsQueue();
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Escuta mensagens recebidas no WhatsApp da Mica (somente tempo real notify + deduplicação anti-pulo de etapa)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return; // Ignora replays históricos (append) que faziam pular etapas

    for (const msg of messages) {
      const msgId = msg.key?.id;
      if (msgId) {
        if (processedMsgIds.has(msgId)) continue; // Nunca processar o mesmo ID duas vezes
        processedMsgIds.add(msgId);
        if (processedMsgIds.size > 1000) {
          const oldest = processedMsgIds.values().next().value;
          processedMsgIds.delete(oldest);
        }
        msgStore.set(msgId, msg);
        if (msgStore.size > 200) {
          const firstKey = msgStore.keys().next().value;
          msgStore.delete(firstKey);
        }
      }

      if (msg.key?.fromMe) continue;

      // Ignora mensagens antigas (> 2 min) entregues após reconexão
      const msgTsSec = Number(msg.messageTimestamp || 0);
      if (msgTsSec > 0 && (Date.now() / 1000 - msgTsSec) > 120) continue;

      const sender = msg.key?.remoteJid || '';
      const altJid = msg.key?.remoteJidAlt || msg.key?.participantAlt || '';

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
      // Prioriza remoteJidAlt (telefone real) quando remoteJid vier como @lid no Baileys v7
      const phoneSource = (altJid && altJid.includes('@s.whatsapp.net')) ? altJid : sender;
      const senderDigits = phoneSource.replace(/\D/g, '');

      // Anti-bounce de 1.5s para evitar avanço duplo em rajada
      const nowMs = Date.now();
      const bounceKey = senderDigits || sender;
      if (nowMs - (lastSenderReplyTs.get(bounceKey) || 0) < 1500) continue;
      lastSenderReplyTs.set(bounceKey, nowMs);

      writeMicaLog(`📩 Mensagem recebida [type=${type}] de ${pushName} (${sender}${altJid ? ' / alt=' + altJid : ''}): "${text}"`);
      if (!text) continue;

      // 1. COMANDOS VINDOS DA DIRETORIA AUTORIZADA (APROVAR, STATUS ou RESET)
      const cleanCmd = text.trim().toUpperCase();
      const isDirectorCmd = (cleanCmd.startsWith('APROVAR') || cleanCmd === 'STATUS' || cleanCmd === 'RESET' || cleanCmd === 'REINICIAR') && 
                            Boolean(DIRECTOR_PHONE && DIRECTOR_PHONE.length >= 8 && (sender.includes(DIRECTOR_PHONE.slice(-8)) || senderDigits.includes(DIRECTOR_PHONE.slice(-8))));
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
        } else if (cleanCmd === 'RESET' || cleanCmd === 'REINICIAR') {
          resetClientStageForPhone(senderDigits || DIRECTOR_PHONE);
          await sock.sendMessage(sender, {
            text: '🔄 *[MICA]* Estágio de atendimento reiniciado para *CONSENT* (Etapa 0). Pronto para novo teste!'
          });
        } else if (cleanCmd === 'STATUS') {
          await sock.sendMessage(sender, {
            text: `🤖 *[MICA STATUS 24/7 — v3.0]*\n\n🟢 Conectada: Sim\n☁️ Vigilância Nuvem AWS: Ativa\n📱 Diretor Mourato: ${DIRECTOR_PHONE}\n📋 Leads Notificados: ${notifiedIds.size}\n📦 Pacotes Prontos p/ Questão: ${questaoHandoffQueue.length}`
          });
        }
        continue;
      }

      // 2. EXTRAÇÃO AUTOMÁTICA DE DADOS REAIS (CNPJ / CPF / E-MAIL) PARA O QUESTÃO
      const digitsOnly = text.replace(/\D/g, '');
      const foundCnpj = (text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/) || [])[0]?.replace(/\D/g, '') || (digitsOnly.length === 14 ? digitsOnly : '');
      const foundCpf = (!foundCnpj && (text.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/) || [])[0]?.replace(/\D/g, '')) || (digitsOnly.length === 11 ? digitsOnly : '');
      const foundEmail = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || '';
      if (foundCnpj || foundCpf || foundEmail) {
        if (latestPendingLead) {
          if (foundCnpj) latestPendingLead.cnpj = foundCnpj;
          if (foundCpf) latestPendingLead.cpf = foundCpf;
          if (foundEmail) latestPendingLead.email = foundEmail;
        }
        enqueueForQuestao({
          protocolo: latestPendingLead?.protocolo || `MA-WA-${senderDigits.slice(-6)}`,
          nome: pushName || latestPendingLead?.nome || 'Cliente',
          empresa: latestPendingLead?.empresa || '',
          cnpj: foundCnpj || (latestPendingLead?.cnpj || '').replace(/\D/g, ''),
          cpf: foundCpf || (latestPendingLead?.cpf || '').replace(/\D/g, ''),
          email: foundEmail || latestPendingLead?.email || '',
          telefone: senderDigits,
          etapa_mica: getClientStage(sender, senderDigits),
          origem: 'WHATSAPP_COLETA_DIRETA'
        });
      }

      // 3. MENSAGEM VINDA DE CLIENTE / TERCEIRO (MÁQUINA DE ESTADOS SEQUENCIAL DOS BIRÔS):
      const cleanClientText = text.trim().toUpperCase();
      let currentStage = getClientStage(sender, senderDigits);

      writeMicaLog(`📩 [ETAPA CLIENTE: ${currentStage}] ${pushName} (${sender}): "${text}"`);

      const isSim = /^(SIM|S|YES|OK|AUTORIZO|CONFIRMO|CADASTRADO|CONCLUIDO|CONCLUÍDO|PRONTO)$/i.test(cleanClientText) || cleanClientText.startsWith('SIM');
      const isNao = /^(NAO|NÃO|N|NO|RECUSO|CANCELAR)$/i.test(cleanClientText) || cleanClientText.startsWith('NÃO') || cleanClientText.startsWith('NAO');

      // FLUXO ETAPA 0: CONSENTIMENTO INICIAL LGPD -> AVISO DE CUSTO PERICIAL (R$ 800,00 PÓS-AVALIAÇÃO)
      if (currentStage === 'CONSENT') {
        if (isSim) {
          setClientStage(sender, senderDigits, 'TAXA_DOSSIE');
          writeMicaLog(`⚡ [CONSENTIMENTO CLIENTE] ${pushName} autorizou o primeiro contato! Enviando ciência do custo pericial (R$ 800,00 pós-avaliação).`);

          const taxaDossieMsg =
`✅ *Autorização Recebida!*

Antes de iniciarmos o envio dos links oficiais dos birôs e a abertura do dossiê, informamos com total transparência:

💼 *Honorário Técnico de Perícia & Dossiê Completo:*
As consultas periciais aprofundadas e a emissão do *Dossiê Pericial Completo (PF/PJ)* possuem um custo técnico de *R$ 800,00 (oitocentos reais)*.

🛡️ *Garantia de Transparência (Zero Pagamento Antecipado):*
Este valor é pago *SOMENTE após a conclusão integral de todas as avaliações e da perícia completa* — nada é cobrado antecipadamente.

Você confirma estar ciente e de acordo para iniciarmos o envio dos links oficiais?
Responda diretamente:
👉 *[ SIM ]* para confirmar e receber os links
👉 *[ NÃO ]* para encerrar o atendimento`;

          await sock.sendMessage(sender, { text: taxaDossieMsg });
          continue;
        } else if (isNao) {
          await sock.sendMessage(sender, { text: 'Agradecemos o seu retorno. Por respeito à sua privacidade e às diretrizes da LGPD, seu protocolo foi encerrado. Tenha um excelente dia!' });
          continue;
        } else {
          await sock.sendMessage(sender, {
            text: `Por favor, responda diretamente:\n👉 *[ SIM ]* para autorizar e prosseguir\n👉 *[ NÃO ]* para encerrar o protocolo`
          });
          continue;
        }
      }

      // FLUXO ETAPA 0.5: CONFIRMAÇÃO DA CIÊNCIA DO CUSTO PERICIAL (R$ 800,00 PÓS-AVALIAÇÃO) -> INÍCIO DOS LINKS (SERASA)
      if (currentStage === 'TAXA_DOSSIE') {
        if (isSim) {
          setClientStage(sender, senderDigits, 'SERASA');
          writeMicaLog(`✅ [CIÊNCIA R$ 800,00 CONFIRMADA] ${pushName} concordou com o custo pericial pós-avaliação! Iniciando envio dos links (SERASA).`);

          const serasaMsg = 
`✅ *Ciência e Concordância Confirmadas com Sucesso!*

O departamento pericial da *Mourato & Associados* já iniciou o seu dossiê. Vamos aos links oficiais:

🔷 *Etapa 1 de 3 — Birô SERASA:*
Acesse o portal oficial do Serasa para login ou cadastro:
👉 https://www.serasa.com.br/

Você já possui cadastro ativo ou concluiu o login no Serasa?
Responda diretamente:
👉 *[ SIM ]* para prosseguir
👉 *[ NÃO ]* caso ainda não tenha cadastro`;

          await sock.sendMessage(sender, { text: serasaMsg });

          // Salva pacote com consentimento + aceite da taxa de R$ 800,00 para o Questão e aciona Alfred se houver CNPJ real
          try {
            const currentLead = latestPendingLead || {};
            const proto = currentLead.protocolo || `MA-WA-${senderDigits.slice(-6)}`;
            const cnpjToProcess = (currentLead.cnpj || '').replace(/\D/g, '');
            enqueueForQuestao({
              protocolo: proto,
              nome: pushName || currentLead.nome || 'Cliente',
              empresa: currentLead.empresa || '',
              cnpj: cnpjToProcess.length === 14 ? cnpjToProcess : '',
              cpf: (currentLead.cpf || '').replace(/\D/g, ''),
              telefone: senderDigits || currentLead.telefone || '',
              email: currentLead.email || '',
              consentimento_lgpd: true,
              aceite_taxa_pericia_800: true,
              condicao_pagamento_taxa: 'PAGO_SOMENTE_APOS_AVALIACOES_COMPLETAS',
              etapa_mica: 'SERASA',
              origem: 'WHATSAPP_ACEITE_TAXA_800'
            });
            if (cnpjToProcess.length === 14) {
              fetch(`${ALFRED_CIO_URL}/api/pipeline/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cnpj: cnpjToProcess,
                  telefone: senderDigits || currentLead.telefone || '',
                  email: currentLead.email || '',
                  nome_contato: pushName || currentLead.nome || 'Cliente',
                  simular_consentimento_imediato: true
                })
              }).then(r => r.json()).then(async res => {
                writeMicaLog(`🚀 [ESTEIRA DISPARADA COM SUCESSO] Parecer: ${res?.recomendacao_alfred} | Score: ${res?.score_viabilidade}`);
              }).catch(e => {
                writeMicaLog(`ℹ️ [HANDOFF] Pacote salvo em /api/mica/questao-ready (Alfred local: ${e.message})`);
              });
            }
          } catch (_) {}
          continue;
        } else if (isNao) {
          setClientStage(sender, senderDigits, 'CONSENT');
          writeMicaLog(`🚫 [TAXA R$ 800,00 RECUSADA] ${pushName} optou por encerrar antes do envio dos links.`);
          await sock.sendMessage(sender, { text: 'Compreendemos perfeitamente. Seu protocolo foi encerrado sem nenhum custo ou compromisso. Caso decida retomar futuramente, a *Mourato & Associados* estará à disposição!' });
          continue;
        } else {
          await sock.sendMessage(sender, {
            text: `Por favor, confirme se está de acordo com o custo técnico de *R$ 800,00* (pago somente após a conclusão completa das avaliações) para iniciarmos o envio dos links:\n👉 *[ SIM ]* para confirmar e iniciar\n👉 *[ NÃO ]* para encerrar`
          });
          continue;
        }
      }

      // FLUXO ETAPA 1: BIRÔ SERASA
      if (currentStage === 'SERASA') {
        if (isSim) {
          setClientStage(sender, senderDigits, 'BOAVISTA');
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
          setClientStage(sender, senderDigits, 'QUOD');
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

      // FLUXO ETAPA 3: BIRÔ QUOD -> ENVIO DA PLANILHA OFICIAL (ETAPA 4)
      if (currentStage === 'QUOD') {
        if (isSim) {
          setClientStage(sender, senderDigits, 'PLANILHA');
          writeMicaLog(`🎉 [BIRÔS CONCLUÍDOS] Todos os 3 birôs validados por ${pushName}! Enviando Etapa 4 (Planilha Oficial).`);

          const planilhaMsg = 
`✅ *Perfeito! Os 3 birôs (Serasa, Boa Vista e Quod) foram confirmados com sucesso.*

📊 *Etapa 4 de 4 — Planilha Oficial de Cadastro & Compliance:*
Para formalizarmos o seu dossiê e darmos prosseguimento à estruturação pericial, acesse e preencha a nossa Planilha Oficial vinculada ao portal:

👉 *[ PLANILHA DE CADASTRO OFICIAL ]*
https://www.mouratoassociados.com.br/cadastro

🔒 *Segurança Jurídica & Validação das Leis:*
O preenchimento desta planilha é obrigatório para a formalização das garantias, qualificação cadastral e estrito cumprimento das normas vigentes de compliance da Mourato & Associados.

Assim que você concluir o preenchimento da planilha no link acima, responda diretamente aqui:
👉 *[ SIM ]* para confirmar a finalização do seu cadastro!`;

          await sock.sendMessage(sender, { text: planilhaMsg });
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
            text: `Por favor, confirme sobre a Quod:
👉 *[ SIM ]* para confirmar e avançar para a Planilha Oficial de Cadastro
👉 *[ NÃO ]* para receber orientações de cadastro`
          });
          continue;
        }
      }

      // FLUXO ETAPA 4: CONFIRMAÇÃO DA PLANILHA OFICIAL DE CADASTRO
      if (currentStage === 'PLANILHA') {
        if (isSim) {
          setClientStage(sender, senderDigits, 'DONE');
          writeMicaLog(`🎉 [TODAS AS 4 ETAPAS CONFIRMADAS] ${pushName} confirmou os 3 birôs e a Planilha Oficial!`);

          const encerramentoMsg = 
`🎉 *Excelente! Todas as 4 confirmações foram concluídas com sucesso!*

🏛️ *Consulta Oficial do Banco Central (Bacen SCR):*
Informamos que a nossa equipe técnica entrará em contato em breve para agendarmos um horário e realizarmos juntos o levantamento do seu relatório oficial SCR do Registrato Bacen.

🤝 *Agradecimento:*
A *Mourato & Associados* agradece imensamente o seu contato e a sua confiança em nosso trabalho pericial. Tenha um excelente dia e estamos à sua inteira disposição!`;

          await sock.sendMessage(sender, { text: encerramentoMsg });

          // Enfileira pacote 100% pronto para o Questão e dispara Alfred se houver CNPJ real de 14 dígitos
          try {
            const currentLead = latestPendingLead || {};
            const proto = currentLead.protocolo || `MA-WA-${senderDigits.slice(-6)}`;
            const cnpjToProcess = (currentLead.cnpj || '').replace(/\D/g, '');

            enqueueForQuestao({
              protocolo: proto,
              nome: pushName || currentLead.nome || 'Cliente',
              empresa: currentLead.empresa || '',
              cnpj: cnpjToProcess.length === 14 ? cnpjToProcess : '',
              cpf: (currentLead.cpf || '').replace(/\D/g, ''),
              telefone: senderDigits || currentLead.telefone || '',
              email: currentLead.email || '',
              consentimento_lgpd: true,
              biros_confirmados: { serasa: true, boavista: true, quod: true, planilha: true },
              etapa_mica: 'DONE',
              status_questao: cnpjToProcess.length === 14 ? 'PRONTO_INVESTIGACAO_75_25' : 'AGUARDANDO_CNPJ_PLANILHA',
              origem: 'WHATSAPP_ETAPA_4_CONCLUIDA'
            });

            if (cnpjToProcess.length === 14) {
              fetch(`${ALFRED_CIO_URL}/api/pipeline/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cnpj: cnpjToProcess,
                  telefone: senderDigits || currentLead.telefone || '',
                  email: currentLead.email || '',
                  nome_contato: pushName || currentLead.nome || 'Cliente',
                  simular_consentimento_imediato: true
                })
              }).then(r => r.json()).then(async res => {
                writeMicaLog(`🚀 [QUESTÃO & ALFRED - ETAPA 4] Dossiê gerado! Parecer: ${res?.recomendacao_alfred} | Score: ${res?.score_viabilidade} | Pasta: ${res?.arquivos_gerados?.folder_path}`);

                if (res && DIRECTOR_PHONE) {
                  let dirJid = `${DIRECTOR_PHONE}@s.whatsapp.net`;
                  try {
                    const checkDir = await sock.onWhatsApp(DIRECTOR_PHONE);
                    if (Array.isArray(checkDir) && checkDir[0]?.exists && checkDir[0]?.jid) {
                      dirJid = checkDir[0].jid;
                    }
                  } catch (_) {}

                  if (res.briefing_whatsapp_mourato) {
                    await sock.sendMessage(dirJid, { text: res.briefing_whatsapp_mourato });
                    writeMicaLog(`📋 [PARECER ENVIADO] Briefing do Alfred entregue para o Diretor Mourato (${DIRECTOR_PHONE})!`);
                  }

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
                writeMicaLog(`ℹ️ [HANDOFF QUESTÃO] Salvo em /api/mica/questao-ready (Alfred local: ${e.message})`);
              });
            }
          } catch (_) {}
          continue;
        } else if (isNao) {
          const orientacaoPlanilha = 
`Para finalizarmos a Etapa 4 e encaminharmos seu dossiê ao departamento pericial, por favor acesse e preencha a Planilha Oficial de Cadastro:
👉 https://www.mouratoassociados.com.br/cadastro

Assim que concluir o preenchimento da planilha, responda *[ SIM ]* aqui para confirmarmos!`;
          await sock.sendMessage(sender, { text: orientacaoPlanilha });
          continue;
        } else {
          await sock.sendMessage(sender, {
            text: `Por favor, confirme sobre a Planilha Oficial de Cadastro:\n👉 *[ SIM ]* se já preencheu a planilha e deseja finalizar\n👉 *[ NÃO ]* para receber o link novamente`
          });
          continue;
        }
      }

      // FLUXO CONCLUÍDO:
      if (currentStage === 'DONE') {
        await sock.sendMessage(sender, {
          text: `Prezado(a) cliente, o seu cadastro e as 4 etapas de onboarding já foram confirmados com sucesso!\n\nNossa equipe técnica já está com o seu protocolo e entrará em contato para agendarmos o seu relatório oficial SCR do Banco Central (Registrato).\n\nA Mourato & Associados agradece novamente o seu contato!`
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
      version: '3.1.0-24x7',
      whatsappConnected: isConnected,
      isConnecting,
      hasQrPending: Boolean(currentQr),
      reconnectAttempts,
      lastDisconnectReason: lastDisconnectReason || null,
      uptimeSeconds: Math.round(process.uptime()),
      directorPhone: DIRECTOR_PHONE,
      awsQueueWatcher: true,
      notifiedLeadsCount: notifiedIds.size,
      pendingCount: pendingLeadsMap.size,
      questaoReadyCount: questaoHandoffQueue.length,
      recentDispatches: lastDispatches.slice(0, 5)
    }, null, 2));
  }

  // Endpoint Oficial: Pacotes coletados pela Mica prontos para o Agente Questão puxar
  if (url.pathname === '/api/mica/questao-ready' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      total: questaoHandoffQueue.length,
      items: questaoHandoffQueue
    }, null, 2));
  }

  // Endpoint Oficial: Resetar estágio de um telefone para CONSENT (útil para testes e reatendimentos)
  if (url.pathname === '/api/mica/reset-stage' && req.method === 'POST') {
    let bodyRaw = '';
    req.on('data', chunk => { bodyRaw += chunk; });
    req.on('end', () => {
      try {
        const { telefone } = JSON.parse(bodyRaw || '{}');
        resetClientStageForPhone(telefone || DIRECTOR_PHONE);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, stage: 'CONSENT', telefone: telefone || DIRECTOR_PHONE }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
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

        // Armazena no estado ativo para responder ao consentimento SIM via WhatsApp (Zero CNPJ inventado)
        const cnpjReal = String(data.cnpj || data.payload?.empresa?.cnpj || '').replace(/\D/g, '');
        const cpfReal = String(data.cpf || data.payload?.titular?.cpf || '').replace(/\D/g, '');
        const leadObj = {
          nome,
          empresa,
          protocolo,
          telefone: clientDigits,
          email,
          cnpj: cnpjReal.length === 14 ? cnpjReal : '',
          cpf: cpfReal.length === 11 ? cpfReal : '',
          data_criacao: new Date().toISOString()
        };
        latestPendingLead = leadObj;
        pendingLeadsMap.set(protocolo, leadObj);
        resetClientStageForPhone(clientDigits);
        enqueueForQuestao({
          ...leadObj,
          etapa_mica: 'CONSENT',
          status_questao: leadObj.cnpj ? 'PRONTO_INVESTIGACAO_75_25' : 'AGUARDANDO_CNPJ',
          origem: 'FICHA_WEB_CONCLUIDA'
        });

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
  console.log(`🚀 Servidor HTTP da Mica v3.0-24x7 ativo em: http://localhost:${PORT}`);
  connectToWhatsApp();

  // Inicia o loop de vigilância na AWS a cada 4 segundos
  setInterval(pollAwsLeadsQueue, 4000);

  // Watchdog 24/7: garante reconexão automática se a sessão cair silenciosamente sem disparar evento close
  setInterval(() => {
    if (!isConnected && !isConnecting && !currentQr && !reconnectTimer) {
      writeMicaLog('🩺 [WATCHDOG 24/7] Sessão WhatsApp desconectada sem reconexão agendada — disparando reconexão automática...');
      connectToWhatsApp();
    }
  }, 60000);
});

// Encerramento limpo (evita socket zumbi 440 ao reiniciar no PM2)
function gracefulShutdown(signal) {
  writeMicaLog(`🛑 [MICA] Sinal ${signal} recebido. Encerrando socket e HTTP com segurança...`);
  try { if (reconnectTimer) clearTimeout(reconnectTimer); } catch (_) {}
  try { sock?.end?.(undefined); } catch (_) {}
  try { server.close(() => process.exit(0)); } catch (_) { process.exit(0); }
  setTimeout(() => process.exit(0), 3000);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
