import React from 'react';
import { ArrowUpRight, MapPin, Shield } from 'lucide-react';

const ColTitle = ({ children }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <div style={{
      fontFamily: 'var(--font-serif)',
      fontSize: '0.78rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: '#FFFFFF',
      marginBottom: '0.5rem'
    }}>
      {children}
    </div>
    <div style={{ height: '1px', background: 'linear-gradient(90deg, var(--gold-primary) 0%, transparent 100%)', width: '2.5rem' }} />
  </div>
);

const FooterLink = ({ onClick, children }) => (
  <li>
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: '#94A3B8',
        cursor: 'pointer',
        padding: 0,
        fontSize: '0.85rem',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        transition: 'color 0.2s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--gold-light)';
        const arrow = e.currentTarget.querySelector('span');
        if (arrow) { arrow.style.opacity = '1'; arrow.style.transform = 'translateX(0)'; }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = '#94A3B8';
        const arrow = e.currentTarget.querySelector('span');
        if (arrow) { arrow.style.opacity = '0'; arrow.style.transform = 'translateX(-4px)'; }
      }}
    >
      <span style={{ opacity: 0, transform: 'translateX(-4px)', transition: 'all 0.2s', color: 'var(--gold-primary)', fontSize: '0.7rem' }}>→</span>
      {children}
    </button>
  </li>
);

export const Footer = ({ onNavigate, onOpenContact }) => {
  return (
    <footer style={{ background: '#05070B', borderTop: '1px solid var(--border-subtle)', padding: '4.5rem 0 0' }}>
      <div className="container-xl">

        {/* Main Grid */}
        <div className="footer-grid">

          {/* Col 1: Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <img
                src="/mourato-seal-circle.png"
                alt="Mourato & Associados"
                style={{ height: '48px', width: '48px', objectFit: 'contain', borderRadius: '50%', boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 16px rgba(197,168,105,0.2)', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.06em', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  MOURATO <span style={{ color: 'var(--gold-primary)' }}>&</span> ASSOCIADOS
                </div>
                <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--gold-light)', marginTop: '0.25rem', fontWeight: 600 }}>
                  QUALIDADE • CONFIANÇA • EXCELÊNCIA
                </div>
              </div>
            </div>

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Boutique independente de inteligência financeira e corporativa. Atuação reservada na convergência entre mercado de capitais, desintermediação de spread bancário e governança de sócios.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.55rem',
                fontSize: '0.82rem', color: '#94A3B8',
                fontFamily: 'var(--font-sans)',
                fontVariantNumeric: 'lining-nums tabular-nums',
                letterSpacing: '0.01em'
              }}>
                <MapPin size={13} style={{ color: 'var(--gold-primary)', flexShrink: 0 }} />
                <span>Av. São Luís, 187 — República, São Paulo/SP</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.55rem',
                fontSize: '0.82rem', color: '#94A3B8',
                fontFamily: 'var(--font-sans)',
                fontVariantNumeric: 'lining-nums tabular-nums',
                letterSpacing: '0.01em'
              }}>
                <Shield size={13} style={{ color: 'var(--gold-primary)', flexShrink: 0 }} />
                <span>CNPJ: 38.377.738/0001-45</span>
              </div>
            </div>
          </div>

          {/* Col 2: Mercado de Capitais */}
          <div>
            <ColTitle>Mercado de Capitais</ColTitle>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0, margin: 0 }}>
              <FooterLink onClick={() => onNavigate('spread')}>Otimização de Spread Bancário</FooterLink>
              <FooterLink onClick={() => onNavigate('spread')}>Antecipação & FIDCs de Atacado</FooterLink>
              <FooterLink onClick={() => onNavigate('spread')}>Emissões Privadas (CRI, CRA, Debêntures)</FooterLink>
              <FooterLink onClick={() => onNavigate('spread')}>Câmbio Comercial & Hedge</FooterLink>
            </ul>
          </div>

          {/* Col 3: Consultoria */}
          <div>
            <ColTitle>Consultoria & Societário</ColTitle>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0, margin: 0 }}>
              <FooterLink onClick={() => onNavigate('consultoria')}>Reorganização Societária & Holdings</FooterLink>
              <FooterLink onClick={() => onNavigate('consultoria')}>Contabilidade Consultiva & Covenants</FooterLink>
              <FooterLink onClick={() => onNavigate('consultoria')}>Planejamento Tributário Estratégico</FooterLink>
              <FooterLink onClick={() => onNavigate('consultoria')}>Valuation & Assessoria em M&A</FooterLink>
            </ul>
          </div>

          {/* Col 4: Audiência Privada */}
          <div>
            <ColTitle>Audiência Privada</ColTitle>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Atendimento exclusivo para conselhos de administração, fundadores e CFOs sob protocolo estrito de não divulgação (NDA).
            </p>
            <button
              onClick={onOpenContact}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '0.85rem 1.15rem',
                background: 'transparent',
                border: '1px solid var(--gold-border)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--gold-light)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(197,168,105,0.08)'; e.currentTarget.style.borderColor = 'var(--gold-primary)'; e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.color = 'var(--gold-light)'; }}
            >
              Solicitar Contato Reservado
              <ArrowUpRight size={14} />
            </button>
          </div>

        </div>

        {/* Bottom Legal Bar */}
        <div className="footer-bottom" style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.5rem 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.78rem',
          fontFamily: 'var(--font-sans)',
          color: '#64748B',
          letterSpacing: '0.01em'
        }}>
          <div>© {new Date().getFullYear()} Mourato e Associados Ltda. · Todos os direitos reservados.</div>
          <div style={{ color: '#64748B' }}>São Paulo — SP · Atuação em Todo o Território Nacional</div>
        </div>

      </div>
    </footer>
  );
};
