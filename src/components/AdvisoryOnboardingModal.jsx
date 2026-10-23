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

const AWS_LEADS_API_URL = 'https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod';

export const AdvisoryOnboardingModal = ({ isOpen, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    empresa: '', nome: '', email: '', telefone: '', pratica: 'hibrido', contexto: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Controla animação de entrada/saída
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      // Aguarda animação de saída antes de desmontar
      const t = setTimeout(() => {
        setVisible(false);
        setSubmitted(false);
        setIsDuplicate(false);
        setFormData({ empresa: '', nome: '', email: '', telefone: '', pratica: 'hibrido', contexto: '' });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  const phoneValid = (v) => v.replace(/\D/g, '').length >= 10;
  const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!phoneValid(formData.telefone)) newErrors.telefone = 'WhatsApp inválido — informe DDD + número (mín. 10 dígitos).';
    if (!emailValid(formData.email)) newErrors.email = 'E-mail inválido.';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setLoading(true);
    setIsDuplicate(false);

    try {
      const leadPayload = {
        ...formData,
        id: 'lead-' + Date.now(),
        status: 'novo',
        criadoEm: new Date().toISOString()
      };

      // 1. Garante persistência imediata no navegador
      try {
        const savedLeads = JSON.parse(localStorage.getItem('mourato_leads_solicitacoes') || '[]');
        savedLeads.unshift(leadPayload);
        localStorage.setItem('mourato_leads_solicitacoes', JSON.stringify(savedLeads));
      } catch (storErr) {
        console.warn('Erro ao salvar lead localmente:', storErr);
      }

      // 2. Conecta à API oficial da AWS (DynamoDB na nuvem) com fallback configurado
      const remoteUrl = `${import.meta.env.VITE_API_URL || AWS_LEADS_API_URL}/leads`;
      try {
        const res = await fetch(remoteUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload)
        });
        if (res.status === 409) {
          setIsDuplicate(true);
        }
      } catch (netErr) {
        console.warn('Sincronização em nuvem em segundo plano:', netErr.message);
      }

      // 3. Fallback servidor local se ativo
      try {
        await fetch('http://localhost:3000/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload)
        });
      } catch (_) {}

      // Dispara evento local para o painel administrativo recarregar caso esteja aberto
      window.dispatchEvent(new CustomEvent('mourato_new_lead_received', { detail: leadPayload }));

      setSubmitted(true);
    } catch (err) {
      setSubmitted(true);
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
                    onChange={(e) => { setFormData({ ...formData, telefone: e.target.value }); setErrors(p => ({ ...p, telefone: '' })); }}
                    placeholder="(11) 90000-0000"
                    style={{ ...inputStyle, borderColor: errors.telefone ? '#EF4444' : 'var(--border-subtle)' }}
                    onFocus={(e) => e.target.style.borderColor = errors.telefone ? '#EF4444' : 'var(--gold-border-focus)'}
                    onBlur={(e) => e.target.style.borderColor = errors.telefone ? '#EF4444' : 'var(--border-subtle)'}
                  />
                  {errors.telefone && <span style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '0.2rem', display: 'block' }}>{errors.telefone}</span>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '0.25rem' }}>
                  E-mail Institucional:
                </label>
                <input
                  required type="email" value={formData.email}
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors(p => ({ ...p, email: '' })); }}
                  placeholder="diretoria@empresa.com.br"
                  style={{ ...inputStyle, borderColor: errors.email ? '#EF4444' : 'var(--border-subtle)' }}
                  onFocus={(e) => e.target.style.borderColor = errors.email ? '#EF4444' : 'var(--gold-border-focus)'}
                  onBlur={(e) => e.target.style.borderColor = errors.email ? '#EF4444' : 'var(--border-subtle)'}
                />
                {errors.email && <span style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '0.2rem', display: 'block' }}>{errors.email}</span>}
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

              {errors.submit && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#FCA5A5', textAlign: 'center' }}>
                  {errors.submit}
                </div>
              )}
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.75rem 0.5rem' }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(197, 168, 105, 0.22) 0%, rgba(197, 168, 105, 0.05) 100%)',
              border: '2px solid var(--gold-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold-light)', margin: '0 auto 1.5rem',
              boxShadow: '0 0 25px rgba(197, 168, 105, 0.3)'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <span className="badge-institutional" style={{ marginBottom: '0.65rem' }}>
              SOLICITAÇÃO RECEBIDA COM SUCESSO
            </span>

            <h3 style={{ fontSize: '1.45rem', color: '#FFFFFF', margin: '0.5rem 0 0.75rem' }}>
              {isDuplicate ? 'Solicitação Já Registrada' : 'Solicitação Registrada'}
            </h3>

            <p style={{ color: '#CBD5E1', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto 1.25rem', lineHeight: 1.65 }}>
              Prezado(a) <strong style={{ color: '#FFFFFF' }}>{formData.nome || 'Cliente'}</strong>, sua solicitação de assessoria estratégica para a empresa <strong style={{ color: 'var(--gold-light)' }}>{formData.empresa || 'sua empresa'}</strong> foi formalmente recebida pela Diretoria Executiva da <strong>Mourato &amp; Associados</strong>.
            </p>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem 1.25rem',
              maxWidth: '460px',
              margin: '0 auto 1.75rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              fontSize: '0.8rem',
              color: '#94A3B8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-light)', fontWeight: 700 }}>
                <Shield size={14} color="var(--gold-primary)" />
                <span>Atendimento Sob Sigilo Absoluto (NDA &amp; LGPD)</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                Nossa equipe pericial analisará os dados da demanda preliminar e entrará em contato diretamente via WhatsApp corporativo informado ({formData.telefone}) ou e-mail ({formData.email}).
              </p>
              <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                ✓ Nenhuma ação adicional é necessária no momento.
              </span>
            </div>

            <button 
              type="button" 
              className="btn-primary-gold" 
              onClick={onClose}
              style={{ padding: '0.85rem 2.5rem', fontSize: '0.88rem', margin: '0 auto', gap: '0.5rem' }}
            >
              <span>Concluir &amp; Fechar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
