import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'O Espectro',               id: 'espectro'   },
  { label: 'Mercado de Capitais',       id: 'spread'     },
  { label: 'Consultoria Estratégica',   id: 'consultoria'},
  { label: 'Simulador de Capital',      id: 'simulador'  },
  { label: 'Governança & Sigilo',       id: 'governanca' },
];

export const Header = ({ onNavigate, onOpenContact, onOpenLogin }) => {
  const [scrolled,   setScrolled]   = useState(false);
  const [activeId,   setActiveId]   = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const ids = ['hero', ...NAV_ITEMS.map(n => n.id)];
    const targets = ids.map(id => document.getElementById(id)).filter(Boolean);
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach(entry => { if (entry.isIntersecting) setActiveId(entry.target.id); }),
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    targets.forEach(el => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 1024) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNav = (id) => { onNavigate(id); setMobileOpen(false); };

  return (
    <>
      <header className={`header-institutional${scrolled ? ' header-scrolled' : ''}`}>

        {!scrolled && (
          <div className="header-topbar">
            <div className="header-topbar-left">
              <span>MANDATOS RESERVADOS</span>
              <span className="topbar-dot">•</span>
              <span>CNPJ: <strong>38.377.738/0001-45</strong></span>
              <span className="topbar-dot">•</span>
              <span>SÃO PAULO — ATUAÇÃO NACIONAL</span>
            </div>
            <div className="header-topbar-right">
              QUALIDADE • CONFIANÇA • EXCELÊNCIA
            </div>
          </div>
        )}

        <div className="header-inner">

          <div className="header-brand" onClick={() => handleNav('hero')}>
            <img
              src="/mourato-seal-circle.png"
              alt="Mourato & Associados"
              className={`header-seal${scrolled ? ' header-seal-sm' : ''}`}
            />
            <div className="header-brand-text">
              <div className="header-brand-name">
                MOURATO <span className="gold">&amp;</span> ASSOCIADOS
              </div>
              <div className="header-brand-sub">QUALIDADE • CONFIANÇA • EXCELÊNCIA</div>
            </div>
          </div>

          <nav className="nav-links">
            {NAV_ITEMS.map(({ label, id }) => (
              <button
                key={id}
                className={`nav-link-btn${activeId === id ? ' active' : ''}`}
                onClick={() => handleNav(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="header-actions">
            <button className="btn-secondary-subtle btn-sm" onClick={onOpenLogin}>
              Login
            </button>
            <button className="btn-primary-gold btn-sm" onClick={onOpenContact}>
              Audiência Privada
              <ArrowUpRight size={13} />
            </button>
            <button
              className="btn-hamburger"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-drawer" onClick={() => setMobileOpen(false)}>
          <div className="mobile-drawer-inner" onClick={e => e.stopPropagation()}>
            <button
              className="mobile-drawer-close"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
            {NAV_ITEMS.map(({ label, id }) => (
              <button
                key={id}
                className={`mobile-nav-btn${activeId === id ? ' active' : ''}`}
                onClick={() => handleNav(id)}
              >
                {label}
              </button>
            ))}
            <div className="mobile-drawer-actions">
              <button className="btn-secondary-subtle" onClick={() => { onOpenLogin(); setMobileOpen(false); }}>
                Login
              </button>
              <button className="btn-primary-gold" onClick={() => { onOpenContact(); setMobileOpen(false); }}>
                Audiência Privada <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
