import React, { useState, useEffect } from 'react';
import { X, ArrowRight, CheckCircle2, Shield, Loader2, Copy, Check, MessageSquare, ExternalLink } from 'lucide-react';

const inputStyle = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--border-subtle)',
  padding: '0.75rem',
  borderRadius: 'var(--radius-xs)',
  color: '#FFFFFF',
  fontSize: '0.88rem',
  outline: 'none',
  transition: 'border-color 0.2s'
};

export const AdvisoryOnboardingModal = ({ isOpen, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    empresa: '', nome: '', email: '', telefone: '', pratica: 'hibrido', contexto: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Controla animação de entrada/saída
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      // Aguarda animação de saída antes de desmontar
      const t = setTimeout(() => {
        setVisible(false);
        setSubmitted(false);
        setFormData({ empresa: '', nome: '', email: '', telefone: '', pratica: 'hibrido', contexto: '' });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  const phoneValid = (v) => v.replace(/\D/g, '').length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneValid(formData.telefone)) {
      alert('Informe um WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }
    setLoading(true);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api') + '/leads';
      const leadPayload = {
        ...formData,
        id: 'lead-' + Date.now(),
        status: 'novo',
        criadoEm: new Date().toISOString()
      };

      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload)
        });
      } catch (netErr) {
        console.warn('Backend offline no momento, gravando lead no storage:', netErr);
      }

      // Garante persistência imediata para o painel de Leads
      try {
        const savedLeads = JSON.parse(localStorage.getItem('mourato_leads_solicitacoes') || '[]');
        savedLeads.unshift(leadPayload);
        localStorage.setItem('mourato_leads_solicitacoes', JSON.stringify(savedLeads));
      } catch (storErr) {
        console.warn('Erro ao salvar lead no localStorage:', storErr);
      }

      setSubmitted(true);
    } catch (err) {
      alert('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const animating = isOpen ? 'modal-enter' : 'modal-exit';

  return (
    <div
      className={`modal-backdrop ${animating}`}
      style={{ opacity: isOpen ? 1 : 0, transition: 'opacity 0.3s ease' }}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          opacity: isOpen ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease'
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Fechar modal"
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: 'none', border: 'none', color: '#64748B', cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {!submitted ? (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="badge-institutional" style={{ marginBottom: '0.6rem' }}>
                CONTATO RESERVADO
              </span>
              <h3 style={{ fontSize: '1.45rem', color: '#FFFFFF', marginTop: '0.3rem' }}>
                Agendamento de Advisory Executivo
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                Atendimento direto com a diretoria da Mourato &amp; Associados.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Prática */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Prática de Interesse:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'spread', label: 'Spread & Crédito' },
                    { id: 'consultoria', label: 'Consultoria Gestão' },
                    { id: 'hibrido', label: 'Solução Integrada' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, pratica: p.id })}
                      style={{
                        padding: '0.6rem 0.5rem',
                        borderRadius: 'var(--radius-xs)',
                        border: formData.pratica === p.id ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                        background: formData.pratica === p.id ? 'var(--gold-muted)' : 'transparent',
                        color: formData.pratica === p.id ? 'var(--gold-light)' : 'var(--text-body)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Empresa */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '0.25rem' }}>
                  Razão Social / Nome da Empresa:
                </label>
                <input
                  required type="text" value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  placeholder="Nome da sua companhia"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--gold-border-focus)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                />
              </div>

              {/* Nome + Telefone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '0.25rem' }}>
                    Nome do Responsável:
                  </label>
                  <input
                    required type="text" value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Seu nome"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = 'var(--gold-border-focus)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '0.25rem' }}>
                    WhatsApp Corporativo:
                  </label>
                  <input
                    required type="tel" value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 90000-0000"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = 'var(--gold-border-focus)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '0.25rem' }}>
                  E-mail Institucional:
                </label>
                <input
                  required type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="diretoria@empresa.com.br"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--gold-border-focus)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                />
              </div>

              {/* Contexto */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '0.25rem' }}>
                  Breve Resumo da Demanda (Opcional):
                </label>
                <textarea
                  rows="3" value={formData.contexto}
                  onChange={(e) => setFormData({ ...formData, contexto: e.target.value })}
                  placeholder="Ex: Repactuação de spread bancário e reorganização societária holding..."
                  style={{ ...inputStyle, resize: 'none' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--gold-border-focus)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn-primary-gold"
                disabled={loading}
                style={{
                  width: '100%', padding: '0.85rem', marginTop: '0.5rem',
                  opacity: loading ? 0.75 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar Solicitação Reservada
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#64748B' }}>
                <Shield size={12} color="var(--gold-primary)" />
                <span>Tratamento confidencial amparado por NDA.</span>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(197, 168, 105, 0.1)',
              border: '1px solid var(--gold-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold-light)', margin: '0 auto 1.25rem'
            }}>
              <CheckCircle2 size={30} />
            </div>
            <h3 style={{ fontSize: '1.5rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>
              Solicitação Registrada
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              Agradecemos pelo contato, <strong style={{ color: '#FFFFFF' }}>{formData.nome}</strong>. Nossos sócios entrarão em contato no WhatsApp informado para coordenar a reunião executiva.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', maxWidth: '420px', margin: '0 auto 1rem', width: '100%' }}>
              {(() => {
                const sheetUrl = typeof window !== 'undefined' 
                  ? `${window.location.origin}/ficha-cadastral?nome=${encodeURIComponent(formData.nome)}&empresa=${encodeURIComponent(formData.empresa)}&telefone=${encodeURIComponent(formData.telefone)}`
                  : `/ficha-cadastral?nome=${encodeURIComponent(formData.nome)}`;
                const cleanPhone = formData.telefone.replace(/\D/g, '');
                const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${formData.nome}! Segue o link para preenchimento da sua Planilha / Ficha Cadastral da Mourato & Associados: ${sheetUrl}`)}`;

                return (
                  <>
                    <div style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      wordBreak: 'break-all',
                      textAlign: 'left'
                    }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--gold-light)', display: 'block', fontWeight: 700, marginBottom: '4px' }}>
                        LINK DA PLANILHA ONLINE GERADO:
                      </span>
                      {sheetUrl}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(sheetUrl);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 3000);
                          }
                        }}
                        className="btn-secondary-subtle"
                        style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', justifyContent: 'center', gap: '6px' }}
                      >
                        {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                      </button>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary-subtle"
                        style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', justifyContent: 'center', gap: '6px', textDecoration: 'none', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.35)' }}
                      >
                        <MessageSquare size={14} />
                        <span>Encaminhar WhatsApp</span>
                      </a>
                    </div>

                    <a
                      href={sheetUrl}
                      className="btn-primary-gold"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.88rem', textDecoration: 'none', gap: '8px' }}
                    >
                      <span>Preencher Planilha Online Agora</span>
                      <ArrowRight size={15} />
                    </a>

                    <button 
                      type="button" 
                      className="btn-secondary-subtle" 
                      onClick={onClose}
                      style={{ width: '100%', padding: '0.75rem', fontSize: '0.82rem', marginTop: '4px' }}
                    >
                      Concluir &amp; Fechar
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
