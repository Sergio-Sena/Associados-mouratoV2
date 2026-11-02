/**
 * Mourato & Associados — Bot de Notificação de Leads em Tempo Real
 * Notifica a Diretoria via WhatsApp Oficial (11) 97899-0034
 * e entrega o link da Ficha Cadastral com atalho de 1 clique para o cliente.
 */

export const DIRETORIA_PHONE_CLEAN = '5511978990034';
export const DIRETORIA_PHONE_FMT = '(11) 97899-0034';
export const DIRETORIA_EMAIL = 'mourato@mouratoassociados.com.br';

export const PRATICAS_MAP = {
  spread: 'Spread Bancário & Auditoria de Crédito',
  consultoria: 'Consultoria de Gestão & Governança',
  hibrido: 'Solução Integrada (Spread + Gestão)'
};

/**
 * Formata qualquer telefone celular brasileiro para o padrão internacional do WhatsApp (55 + DDD + 9 dígitos)
 */
export function formatPhoneForWhatsApp(phoneRaw) {
  if (!phoneRaw) return '';
  const digits = String(phoneRaw).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  if (digits.length >= 8) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Constrói o pacote completo de notificação do lead para a Diretoria e o cliente
 */
export function buildLeadNotification(lead) {
  if (!lead) return null;

  const baseUrl = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://www.mouratoassociados.com.br';

  const leadId = lead.id || `lead-${Date.now()}`;
  const leadNome = (lead.nome || 'Cliente').trim();
  const leadEmpresa = (lead.empresa || 'Empresa').trim();
  const leadTelefone = (lead.telefone || '').trim();
  const leadEmail = (lead.email || '').trim().toLowerCase();
  const leadPratica = PRATICAS_MAP[lead.pratica] || lead.pratica || 'Assessoria Corporativa & Rating';
  const leadContexto = (lead.contexto || '').trim();

  // 1. Link oficial exclusivo da Ficha Cadastral para este Lead
  const linkFicha = `${baseUrl}/ficha-cadastral?nome=${encodeURIComponent(leadNome)}&empresa=${encodeURIComponent(leadEmpresa)}&telefone=${encodeURIComponent(leadTelefone)}&email=${encodeURIComponent(leadEmail)}&leadId=${encodeURIComponent(leadId)}&token=${encodeURIComponent(leadId)}&origem=lead_bot_notificacao`;

  // 2. Telefone internacional do cliente
  const clientPhoneClean = formatPhoneForWhatsApp(leadTelefone);

  // 3. Mensagem formal pronta que a diretoria pode enviar ao cliente com 1 toque
  const msgProntaParaCliente = 
`Olá, *${leadNome}*!

Confirmamos o recebimento da sua solicitação de assessoria na *Mourato & Associados* para a empresa *${leadEmpresa}*.

Para darmos início imediato à auditoria pericial preliminar e análise dos birôs (Banco Central SCR, Serasa, Boa Vista e Quod), por favor preencha sua Ficha Cadastral no link oficial abaixo:

📋 *Acesse sua Ficha Cadastral:*
${linkFicha}

_Atenciosamente,_
*Diretoria Executiva — Mourato & Associados Ltda*
CNPJ: 38.377.738/0001-45 | Atendimento: ${DIRETORIA_PHONE_FMT}
${DIRETORIA_EMAIL} | www.mouratoassociados.com.br`;

  // 4. Link direto que abre a conversa com o CLIENTE com a mensagem e o link já digitados
  const linkDisparoClienteWhatsApp = clientPhoneClean 
    ? `https://wa.me/${clientPhoneClean}?text=${encodeURIComponent(msgProntaParaCliente)}`
    : `https://wa.me/?text=${encodeURIComponent(msgProntaParaCliente)}`;

  const linkDisparoClienteApp = clientPhoneClean 
    ? `whatsapp://send?phone=${clientPhoneClean}&text=${encodeURIComponent(msgProntaParaCliente)}`
    : `whatsapp://send?text=${encodeURIComponent(msgProntaParaCliente)}`;

  const linkDisparoClienteWeb = clientPhoneClean 
    ? `https://web.whatsapp.com/send?phone=${clientPhoneClean}&text=${encodeURIComponent(msgProntaParaCliente)}`
    : `https://web.whatsapp.com/send?text=${encodeURIComponent(msgProntaParaCliente)}`;

  // 5. Mensagem de Alerta para o WhatsApp da Diretoria (11 97899-0034)
  const msgParaDiretoria = 
`🚨 *[NOVO LEAD RECEBIDO NO PORTAL]* 🚨

Uma nova solicitação de Audiência Privada / Assessoria acaba de ser registrada no site:

👤 *Titular:* ${leadNome}
🏢 *Empresa:* ${leadEmpresa}
📱 *WhatsApp Cliente:* ${leadTelefone || 'Não informado'}
✉️ *E-mail:* ${leadEmail || 'Não informado'}
⚖️ *Prática:* ${leadPratica}
${leadContexto ? `📝 *Contexto:* ${leadContexto}\n` : ''}
───────────────────────────────────
📋 *Link da Ficha Cadastral Gerado:*
${linkFicha}

📲 *ENVIAR FICHA DIRETO AO WHATSAPP DO CLIENTE:*
${linkDisparoClienteWhatsApp}
───────────────────────────────────
_Bot de Monitoramento da Esteira — Mourato & Associados_`;

  // 6. Links de acionamento para o WhatsApp da Diretoria (5511978990034)
  const urlDiretoriaUniversal = `https://wa.me/${DIRETORIA_PHONE_CLEAN}?text=${encodeURIComponent(msgParaDiretoria)}`;
  const urlDiretoriaApp = `whatsapp://send?phone=${DIRETORIA_PHONE_CLEAN}&text=${encodeURIComponent(msgParaDiretoria)}`;
  const urlDiretoriaWeb = `https://web.whatsapp.com/send?phone=${DIRETORIA_PHONE_CLEAN}&text=${encodeURIComponent(msgParaDiretoria)}`;

  return {
    leadId,
    leadNome,
    leadEmpresa,
    leadTelefone,
    leadEmail,
    leadPratica,
    linkFicha,
    clientPhoneClean,
    msgProntaParaCliente,
    linkDisparoClienteWhatsApp,
    linkDisparoClienteApp,
    linkDisparoClienteWeb,
    msgParaDiretoria,
    urlDiretoriaUniversal,
    urlDiretoriaApp,
    urlDiretoriaWeb,
    criadoEm: new Date().toISOString()
  };
}

/**
 * Dispara o registro do lead e notifica a diretoria
 */
export function dispatchLeadNotification(lead, options = { autoOpen: false }) {
  const notification = buildLeadNotification(lead);
  if (!notification) return null;

  // Persiste no histórico de notificações do bot
  try {
    if (typeof localStorage !== 'undefined') {
      const historyRaw = localStorage.getItem('mourato_lead_bot_history');
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      history.unshift(notification);
      // Mantém os últimos 50 registros
      localStorage.setItem('mourato_lead_bot_history', JSON.stringify(history.slice(0, 50)));
      localStorage.setItem('mourato_latest_lead_notification', JSON.stringify(notification));
    }
  } catch (err) {
    console.warn('Erro ao salvar histórico de notificações do bot:', err);
  }

  // Notifica componentes em tempo real via CustomEvent
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('mourato_lead_bot_notified', { detail: notification }));
    } catch (_) {}
  }

  // Se autoOpen habilitado (ex: disparado por ação explícita)
  if (options && options.autoOpen && typeof window !== 'undefined') {
    try {
      window.open(notification.urlDiretoriaUniversal, '_blank', 'noopener,noreferrer');
    } catch (_) {}
  }

  return notification;
}
