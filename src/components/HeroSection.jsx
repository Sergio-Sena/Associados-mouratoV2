import React from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useInView } from '../hooks/useInView';

export const HeroSection = ({ onNavigate, onOpenContact }) => {
  const [heroRef, heroInView] = useInView({ threshold: 0.05 });
  const [cardsRef, cardsInView] = useInView();

  return (
    <section style={{
      position: 'relative',
      padding: '3rem 0 3.5rem',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'radial-gradient(ellipse at 50% 15%, rgba(197, 168, 105, 0.08) 0%, transparent 65%)'
    }}>
      <div className="container-xl">
        <div ref={heroRef} className={`fade-up${heroInView ? ' in-view' : ''}`} style={{ maxWidth: '920px', margin: '0 auto', textAlign: 'center' }}>

          {/* Seal */}
          <div style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{
              position: 'absolute', width: '320px', height: '320px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(197, 168, 105, 0.22) 0%, rgba(197, 168, 105, 0.03) 60%, transparent 80%)',
              filter: 'blur(30px)', pointerEvents: 'none'
            }} />
            <img
              src="/mourato-seal-circle.png"
              alt="Selo Oficial Mourato & Associados"
              loading="lazy"
              width="220"
              height="220"
              style={{
                height: 'clamp(110px, 14vw, 220px)', width: 'auto', objectFit: 'contain',
                position: 'relative', zIndex: 1, borderRadius: '50%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 35px rgba(197,168,105,0.25)',
                transition: 'transform 0.4s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            />
          </div>

          <div style={{ display: 'block', marginBottom: '0.85rem' }}>
            <span className="badge-institutional">MANDATOS RESERVADOS • BY APPOINTMENT ONLY</span>
          </div>

          <h1 style={{ marginBottom: '1.25rem', fontWeight: 800 }}>
            <div>Inteligência Financeira &amp; Governança de Alto Escalão:</div>
            <div className="text-gradient-gold">Da Engenharia de Spread à Reestruturação Societária</div>
          </h1>

          <p className="hero-subtitle">
            Assessoria boutique independente para companhias e grandes grupos econômicos. Desintermediamos o acesso ao capital de atacado para reduzir agressivamente o custo financeiro, integrando a operação com blindagem de governança, contabilidade e reorganização societária.
          </p>

          <div className="hero-actions">
            <button className="btn-primary-gold" onClick={onOpenContact} style={{ padding: '0.95rem 2rem', fontSize: '0.9rem' }}>
              Solicitar Audiência Privada
              <ArrowRight size={15} />
            </button>
            <button className="btn-secondary-subtle" onClick={() => onNavigate('espectro')} style={{ padding: '0.95rem 2rem', fontSize: '0.9rem' }}>
              Estrutura das Práticas
              <ArrowUpRight size={15} />
            </button>
          </div>

        </div>

        {/* 3 Pillars */}
        <div ref={cardsRef} className="grid-3">

          <div className={`advisory-card fade-up${cardsInView ? ' in-view' : ''}`}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gold-light)', marginBottom: '0.6rem', fontWeight: 700 }}>
              01 • Mercado de Capitais
            </div>
            <h3 style={{ marginBottom: '0.6rem', color: '#FFFFFF', fontSize: '1.25rem' }}>Engenharia de Spread &amp; Funding</h3>
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.65 }}>
              Desoneração de taxas bancárias, antecipação estruturada de recebíveis via FIDCs e emissões privadas de dívida corporativa (CRI, CRA, Debêntures) com prazos de atacado.
            </p>
          </div>

          <div className={`advisory-card fade-up fade-up-delay-1${cardsInView ? ' in-view' : ''}`}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gold-light)', marginBottom: '0.6rem', fontWeight: 700 }}>
              02 • Estrutura &amp; Governança
            </div>
            <h3 style={{ marginBottom: '0.6rem', color: '#FFFFFF', fontSize: '1.25rem' }}>Consultoria Societária &amp; Gestão</h3>
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.65 }}>
              Holdings patrimoniais, acordos de acionistas, contabilidade consultiva orientada a rating, otimização fiscal preventiva e assessoria técnica em processos de M&amp;A.
            </p>
          </div>

          <div className={`advisory-card fade-up fade-up-delay-2${cardsInView ? ' in-view' : ''}`}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gold-light)', marginBottom: '0.6rem', fontWeight: 700 }}>
              03 • Padrão de Atendimento
            </div>
            <h3 style={{ marginBottom: '0.6rem', color: '#FFFFFF', fontSize: '1.25rem' }}>Sigilo Absoluto &amp; Independência</h3>
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.65 }}>
              Mandatos conduzidos diretamente com sócios seniores sob estrito protocolo de não divulgação (NDA), com total isenção e lealdade exclusiva aos interesses da companhia.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};
