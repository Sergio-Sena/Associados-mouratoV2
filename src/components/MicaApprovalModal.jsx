import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Send, User, Building, Phone, Mail, FileText, Check, AlertCircle } from 'lucide-react';
import { buildLeadNotification, DIRETORIA_PHONE_FMT } from '../services/leadNotificationBot';

const AWS_LEADS_API_URL = 'https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod';
const STORAGE_CLIENTS_KEY = 'mourato_clients_records_v2';
const STORAGE_APPROVED_LEADS = 'mourato_approved_leads_ids';

export const MicaApprovalModal = ({ isOpen, onClose, leadData = null }) => {
  const [lead, setLead] = useState(leadData);
  const [status, setStatus] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [loading, setLoading] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  // Inicializa os dados do lead a partir de props ou parâmetros da URL
  useEffect(() => {
    if (leadData) {
      setLead(leadData);
      return;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const isMicaView = params.get('view') === 'mica-aprovar' || window.location.search.includes('mica-aprovar');
      const leadId = params.get('leadId') || params.get('id') || (isMicaView ? `lead-${Date.now()}` : null);
      if (leadId) {
        setLead({
          id: leadId,
          protocolo: params.get('protocolo') || `MA-${Date.now()}`,
          nome: params.get('nome') || 'Cliente Interessado',
          empresa: params.get('empresa') || 'Empresa Interessada',
          telefone: params.get('telefone') || '',
          email: params.get('email') || '',
          pratica: params.get('pratica') || 'hibrido'
        });
      }
    } catch (_) {}
  }, [leadData]);

  if (!isOpen || !lead) return null;

  const notif = buildLeadNotification(lead);

  const handleApprove = async () => {
    setLoading(true);
    try {
      // 1. Marca como aprovado no banco de clientes local
      try {
        const rawClients = localStorage.getItem(STORAGE_CLIENTS_KEY);
        let clientsList = rawClients ? JSON.parse(rawClients) : [];
        
        const cleanDoc = (lead.documento || lead.cnpj || lead.cpf || '').replace(/\D/g, '');
        const phone = lead.telefone || '';
        const email = (lead.email || '').toLowerCase().trim();
        const leadId = String(lead.id || Date.now());

        // Registro PJ
        const pjRec = {
          id: `cli-pj-${leadId}`,
          leadOriginId: leadId,
          codigoCliente: `CLI-${Math.floor(100 + Math.random() * 900)}`,
          tipo: 'PJ',
          nomeRazao: (lead.empresa || lead.nome || 'EMPRESA').toUpperCase(),
          documento: cleanDoc.length === 14 ? lead.documento : '',
          documentoTipo: 'CNPJ',
          natureza: 'Sociedade Empresária',
          situacao: 'NOVO',
          statusConta: 'Novo Cadastro (Ficha Enviada)',
          dataCadastro: new Date().toISOString().slice(0, 10),
          socioVinculado: (lead.nome || '').toUpperCase(),
          responsavel: (lead.nome || '').toUpperCase(),
          contato: phone,
          email: email,
          origem: 'Mica • Portal Oficial',
          pratica: lead.pratica || 'hibrido',
          linkFicha: notif.linkFicha,
          protocolo: notif.leadProtocolo,
          bacenScr: '',
          serasaScore: '',
          boaVistaScore: '',
          quodScore: '',
          govNivel: 'Pendente'
        };

        // Registro PF (com mesmo email e telefone permitidos)
        const pfRec = {
          id: `cli-pf-${leadId}-socio`,
          leadOriginId: leadId,
          codigoCliente: `CLI-${Math.floor(100 + Math.random() * 900)}`,
          tipo: 'PF',
          nomeRazao: (lead.nome || 'SÓCIO').toUpperCase(),
          documento: cleanDoc.length === 11 ? lead.documento : '',
          documentoTipo: 'CPF',
          natureza: 'Pessoa Física (Sócio Administrador)',
          situacao: 'NOVO',
          statusConta: 'Novo Cadastro (Ficha Enviada)',
          dataCadastro: new Date().toISOString().slice(0, 10),
          empresaVinculada: (lead.empresa || '').toUpperCase(),
          responsavel: (lead.nome || '').toUpperCase(),
          contato: phone, // Mesmo telefone permitido
          email: email,   // Mesmo e-mail permitido
          origem: 'Mica • Portal Oficial',
          pratica: lead.pratica || 'hibrido',
          linkFicha: notif.linkFicha,
          protocolo: notif.leadProtocolo,
          bacenScr: '',
          serasaScore: '',
          boaVistaScore: '',
          quodScore: '',
          govNivel: 'Pendente'
        };

        const updated = [pjRec, pfRec, ...clientsList.filter(c => c.leadOriginId !== leadId)];
        localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updated));

        // Marca no set de aprovados
        const rawApproved = localStorage.getItem(STORAGE_APPROVED_LEADS);
        const approvedSet = new Set(rawApproved ? JSON.parse(rawApproved) : []);
        approvedSet.add(leadId);
        if (lead.email) approvedSet.add(lead.email.toLowerCase().trim());
        localStorage.setItem(STORAGE_APPROVED_LEADS, JSON.stringify(Array.from(approvedSet)));

        window.dispatchEvent(new CustomEvent('mourato_client_saved', { detail: pjRec }));
      } catch (e) {
        console.warn('Erro ao salvar cliente localmente:', e);
      }

      // 2. Remove da fila de leads da AWS
      try {
        const apiUrl = import.meta.env.VITE_API_URL || AWS_LEADS_API_URL;
        const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin2026';
        await fetch(`${apiUrl}/leads/${lead.id}`, {
          method: 'DELETE',
          headers: { 'x-admin-password': adminPassword }
        });
      } catch (_) {}

      // 3. Dispara o envio oficial da Ficha Cadastral pelo robô da Mica no WhatsApp
      try {
        await fetch('http://localhost:3005/api/mica/approve-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead: lead,
            linkFicha: notif?.linkFicha || ''
          })
        });
      } catch (_) {}

      setStatus('approved');

      // 4. Se estiver no celular, também abre a conversa para o diretor se ele desejar
      if (notif?.linkDisparoClienteWhatsApp) {
        setTimeout(() => {
          window.location.href = notif.linkDisparoClienteWhatsApp;
        }, 600);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm(`Deseja recusar a solicitação de "${lead.empresa || lead.nome}"?`)) return;
    setLoading(true);
    try {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || AWS_LEADS_API_URL;
        const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin2026';
        await fetch(`${apiUrl}/leads/${lead.id}`, {
          method: 'DELETE',
          headers: { 'x-admin-password': adminPassword }
        });
      } catch (_) {}

      setStatus('rejected');
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        background: '#0B0F19',
        border: '1px solid rgba(197, 168, 105, 0.4)',
        borderRadius: '12px',
        maxWidth: '460px',
        width: '100%',
        padding: '1.5rem',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        color: '#FFFFFF',
        animation: 'fadeIn 0.25s ease'
      }}>
        {/* Cabeçalho Mica */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.9rem', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #C5A869 0%, #9A7B38 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(197, 168, 105, 0.3)'
            }}>
              <ShieldCheck size={18} color="#000000" />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                MICA • VALIDAÇÃO EXECUTIVA
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Canal Direto de Aprovação Pericial
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '0.2rem 0.5rem'
            }}
          >
            ✕
          </button>
        </div>

        {status === 'pending' && (
          <div>
            {/* Card com os dados do Lead */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Protocolo Oficial
                </span>
                <span style={{ fontSize: '0.85rem', color: '#C5A869', fontFamily: 'monospace', fontWeight: 700 }}>
                  {notif?.leadProtocolo}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#E2E8F0' }}>
                  <Building size={15} color="#C5A869" />
                  <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{lead.empresa || 'Empresa não informada'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#CBD5E1' }}>
                  <User size={15} color="#94A3B8" />
                  <span>{lead.nome || 'Titular'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#CBD5E1' }}>
                  <Phone size={15} color="#25D366" />
                  <span>{lead.telefone || 'Telefone não informado'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#CBD5E1' }}>
                  <Mail size={15} color="#94A3B8" />
                  <span>{lead.email || 'E-mail não informado'}</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.5, margin: '0 0 1.25rem', textAlign: 'center' }}>
              Ao aprovar, a <strong>Mica</strong> registrará a entrada do cliente e <strong>abrirá automaticamente a conversa no WhatsApp</strong> com a mensagem pronta e o link da Ficha Cadastral Oficial.
            </p>

            {/* Botões de Ação Executiva */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleReject}
                disabled={loading}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#EF4444',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                <XCircle size={16} />
                <span>Negar Pedido</span>
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? (
                  <span>Aprovando...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Aprovar &amp; Abrir WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {status === 'approved' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <CheckCircle2 size={28} color="#10B981" />
            </div>
            <h4 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: '0 0 0.5rem', fontWeight: 800 }}>
              Solicitação Aprovada com Sucesso!
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              A Mica gerou a Ficha Cadastral Oficial e direcionou para o WhatsApp do cliente.
            </p>

            {notif?.linkDisparoClienteWhatsApp && (
              <a
                href={notif.linkDisparoClienteWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  color: '#FFFFFF',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(37, 211, 102, 0.35)'
                }}
              >
                <Send size={16} />
                <span>Reabrir Conversa no WhatsApp</span>
              </a>
            )}
          </div>
        )}

        {status === 'rejected' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid #EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <XCircle size={28} color="#EF4444" />
            </div>
            <h4 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: '0 0 0.5rem', fontWeight: 800 }}>
              Solicitação Recusada
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0 }}>
              O lead foi removido da esteira com segurança.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MicaApprovalModal;
