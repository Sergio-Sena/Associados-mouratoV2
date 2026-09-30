import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'O Espectro', id: 'espectro' },
  { label: 'Mercado de Capitais & Spread', id: 'spread' },
  { label: 'Consultoria Estratégica', id: 'consultoria' },
  { label: 'Simulador de Capital', id: 'simulador' },
  { label: 'Governança & Sigilo', id: 'governanca' },
];

export const Header = ({ onNavigate, onOpenContact, onOpenLogin }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha drawer ao redimensionar para desktop
  useEffect(() => {
    const close = () => window.innerWidth >= 1024 && setMenuOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  // Trava scroll do body quando drawer aberto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleNav = (id) => {
    setMenuOpen(false);
    onNavigate(id);
  };

  return (
    <>
      <header className="header-institutional">
        {/* Top institutional bar — oculta em mobile */}
        <div style={{
          background: '#05070B',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          padding: '0.35rem 2rem',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          color: '#64748B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }} className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span>MANDATOS RESERVADOS</span>
            <span>•</span>
            <span>CNPJ: <strong style={{ color: '#CBD5E1' }}>38.377.738/0001-45</strong></span>
            <span>•</span>
            <span>SÃO PAULO — ATUAÇÃO NACIONAL</span>
          </div>
          <div style={{ letterSpacing: '0.12em', color: 'var(--gold-light)' }}>
            QUALIDADE • CONFIANÇA • EXCELÊNCIA
          </div>
        </div>

        {/* Main bar */}
        <div className="header-inner" style={{ padding: '0.75rem 2rem' }}>

          {/* Brand */}
          <div
            onClick={() => handleNav('hero')}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
          >
            <img
              src="/mourato-seal-circle.png"
              alt="Mourato & Associados"
              loading="lazy"
              width="54"
              height="54"
              style={{
                height: '54px',
                width: '54px',
                objectFit: 'contain',
                borderRadius: '50%',
                boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 12px rgba(197,168,105,0.3)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.06)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            />
            <div>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.1rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: '#FFFFFF',
                whiteSpace: 'nowrap'
              }}>
                MOURATO <span style={{ color: 'var(--gold-primary)', fontWeight: 600 }}>&amp;</span> ASSOCIADOS
              </div>
              <div style={{
                fontSize: '0.6rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--gold-light)',
                fontWeight: 600,
                marginTop: '-2px',
                whiteSpace: 'nowrap'
              }}>
                Assessoria Corporativa &amp; Estruturação
              </div>
            </div>
          </div>

          {/* Nav desktop */}
          <nav className="nav-links">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} className="nav-link-btn" onClick={() => handleNav(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions desktop */}
          <div className="header-actions-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button
              className="btn-secondary-subtle"
              onClick={onOpenLogin}
              style={{ padding: '0.65rem 1.1rem', fontSize: '0.78rem', gap: '0.4rem', display: 'flex', alignItems: 'center' }}
            >
              Login
            </button>
            <button
              className="btn-primary-gold"
              onClick={onOpenContact}
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.78rem' }}
            >
              Audiência Privada
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Hamburguer mobile */}
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            style={{
              display: 'none',
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-subtle)',
              cursor: 'pointer',
              padding: '0.5rem',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </header>

      {/* Drawer mobile */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          pointerEvents: menuOpen ? 'all' : 'none'
        }}
      >
        {/* Overlay */}
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(6, 9, 14, 0.75)',
            backdropFilter: 'blur(4px)',
            opacity: menuOpen ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />

        {/* Painel */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 'min(320px, 85vw)',
          height: '100%',
          background: '#0E131C',
          borderLeft: '1px solid var(--gold-border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          gap: '0.25rem',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto'
        }}>
          {/* Header do drawer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9rem', color: 'var(--gold-light)', letterSpacing: '0.1em' }}>
              MOURATO &amp; ASSOCIADOS
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Links */}
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-subtle)',
                fontSize: '0.9rem',
                fontWeight: 600,
                textAlign: 'left',
                padding: '0.9rem 0',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold-light)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-subtle)'}
            >
              {item.label}
            </button>
          ))}

          {/* CTAs */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1.5rem' }}>
            <button
              className="btn-secondary-subtle"
              onClick={() => { setMenuOpen(false); onOpenLogin(); }}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Login
            </button>
            <button
              className="btn-primary-gold"
              onClick={() => { setMenuOpen(false); onOpenContact(); }}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Audiência Privada
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
