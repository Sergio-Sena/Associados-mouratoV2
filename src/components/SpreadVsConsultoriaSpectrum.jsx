import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { ADVISORY_PRACTICES } from '../data/modulesData';
import { useInView } from '../hooks/useInView';

export const SpreadVsConsultoriaSpectrum = ({ onNavigateToSimulator, onOpenContact }) => {
  const [activeTab, setActiveTab] = useState('synergy');
  const [headerRef, headerInView] = useInView();

  return (
    <section id="espectro" style={{ padding: '5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="container-xl">
        
        {/* Header */}
        <div ref={headerRef} className={`fade-up${headerInView ? ' in-view' : ''}`} style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3rem' }}>
          <span className="badge-institutional" style={{ marginBottom: '0.8rem' }}>
            ESPECTRO DE ATUAÇÃO ESTRATÉGICA
          </span>
          <h2 style={{ marginBottom: '1rem' }}>
            Da Engenharia de Spread à Consultoria Empresarial
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '1.02rem', lineHeight: 1.65 }}>
            Rejeitamos o modelo fragmentado. Não atuamos como meros intermediadores de empréstimos caros nem como consultorias acadêmicas distantes da liquidez. Integramos o <strong>corte de spread bancário</strong> com a <strong>organização societária e contábil de longo prazo</strong>.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          maxWidth: '680px',
          margin: '0 auto 3rem',
          background: 'var(--bg-surface)',
          padding: '0.4rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveTab('spread')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'spread' ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === 'spread' ? '#0A0D14' : 'var(--text-body)',
              fontWeight: 700,
              fontSize: '0.82rem',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'var(--transition-slow)'
            }}
          >
            I. Ponta do Spread &amp; Liquidez
          </button>

          <button
            onClick={() => setActiveTab('synergy')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'synergy' ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === 'synergy' ? '#0A0D14' : 'var(--text-body)',
              fontWeight: 700,
              fontSize: '0.82rem',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'var(--transition-slow)'
            }}
          >
            ★ O Elo de Sinergia
          </button>

          <button
            onClick={() => setActiveTab('consultoria')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'consultoria' ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === 'consultoria' ? '#0A0D14' : 'var(--text-body)',
              fontWeight: 700,
              fontSize: '0.82rem',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'var(--transition-slow)'
            }}
          >
            II. Ponta da Consultoria &amp; Gestão
          </button>
        </div>

        {/* Tab 1: Spread */}
        {activeTab === 'spread' && (
          <div className="advisory-card-active" style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <span className="badge-outline">MERCADO DE CAPITAIS &amp; LIQUIDEZ</span>
                <h3 style={{ fontSize: '1.6rem', marginTop: '0.5rem', color: '#FFFFFF' }}>
                  {ADVISORY_PRACTICES.spread.title}
                </h3>
                <p style={{ color: '#CBD5E1', fontSize: '0.95rem', marginTop: '0.3rem', maxWidth: '750px' }}>
                  {ADVISORY_PRACTICES.spread.lead}
                </p>
              </div>

              <button className="btn-secondary-subtle" onClick={onNavigateToSimulator}>
                Simular Economia de Spread
                <ArrowRight size={14} />
              </button>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '0.92rem', lineHeight: 1.65, marginBottom: '2rem' }}>
              {ADVISORY_PRACTICES.spread.overview}
            </p>

            {/* Indicators */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
              {ADVISORY_PRACTICES.spread.indicators.map((ind, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ind.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold-light)', marginTop: '0.3rem' }}>{ind.value}</div>
                </div>
              ))}
            </div>

            {/* Capabilities */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFFFFF', marginBottom: '1rem' }}>
                Capacidades de Execução na Ponta do Spread:
              </div>
              <div className="grid-2">
                {ADVISORY_PRACTICES.spread.capabilities.map((cap, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                    <div style={{ color: 'var(--gold-primary)', marginTop: '2px', flexShrink: 0 }}>
                      <Check size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>{cap.title}</div>
                      <div style={{ fontSize: '0.86rem', color: '#94A3B8', marginTop: '0.2rem' }}>{cap.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Synergy */}
        {activeTab === 'synergy' && (
          <div className="advisory-card-active" style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 2.5rem' }}>
              <span className="badge-institutional">O EFEITO MULTIPLICADOR DA SINERGIA</span>
              <h3 style={{ fontSize: '1.7rem', marginTop: '0.5rem', color: '#FFFFFF' }}>
                {ADVISORY_PRACTICES.synergy.title}
              </h3>
              <p style={{ color: '#CBD5E1', fontSize: '0.95rem', marginTop: '0.4rem' }}>
                {ADVISORY_PRACTICES.synergy.lead}
              </p>
            </div>

            {/* 4 Steps */}
            <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
              {ADVISORY_PRACTICES.synergy.steps.map((st) => (
                <div 
                  key={st.phase}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '1.5rem',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: 'var(--gold-primary)',
                    fontFamily: 'var(--font-serif)',
                    marginBottom: '0.6rem'
                  }}>
                    ETAPA {st.phase}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                    {st.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.55 }}>
                    {st.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Callout */}
            <div style={{
              background: 'rgba(197, 168, 105, 0.05)',
              border: '1px solid var(--gold-border)',
              borderRadius: 'var(--radius-xs)',
              padding: '1.5rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem'
            }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
                  A sua empresa demanda liquidez imediata, reorganização societária ou ambas?
                </div>
                <div style={{ fontSize: '0.86rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                  Avaliamos sua estrutura de capital e balanço sob estrito acordo de confidencialidade.
                </div>
              </div>

              <button className="btn-primary-gold" onClick={onOpenContact}>
                Solicitar Diagnóstico Preliminar
                <ArrowRight size={14} />
              </button>
            </div>

          </div>
        )}

        {/* Tab 3: Consultoria */}
        {activeTab === 'consultoria' && (
          <div className="advisory-card-active" style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <span className="badge-outline">GOVERNANÇA &amp; ESTRUTURAÇÃO CORPORATIVA</span>
                <h3 style={{ fontSize: '1.6rem', marginTop: '0.5rem', color: '#FFFFFF' }}>
                  {ADVISORY_PRACTICES.consultoria.title}
                </h3>
                <p style={{ color: '#CBD5E1', fontSize: '0.95rem', marginTop: '0.3rem', maxWidth: '750px' }}>
                  {ADVISORY_PRACTICES.consultoria.lead}
                </p>
              </div>

              <button className="btn-secondary-subtle" onClick={onOpenContact}>
                Falar com Sócio de Prática
                <ArrowRight size={14} />
              </button>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '0.92rem', lineHeight: 1.65, marginBottom: '2rem' }}>
              {ADVISORY_PRACTICES.consultoria.overview}
            </p>

            {/* Indicators */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
              {ADVISORY_PRACTICES.consultoria.indicators.map((ind, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ind.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold-light)', marginTop: '0.3rem' }}>{ind.value}</div>
                </div>
              ))}
            </div>

            {/* Capabilities */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFFFFF', marginBottom: '1rem' }}>
                Capacidades de Execução na Ponta da Consultoria:
              </div>
              <div className="grid-2">
                {ADVISORY_PRACTICES.consultoria.capabilities.map((cap, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                    <div style={{ color: 'var(--gold-primary)', marginTop: '2px', flexShrink: 0 }}>
                      <Check size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>{cap.title}</div>
                      <div style={{ fontSize: '0.86rem', color: '#94A3B8', marginTop: '0.2rem' }}>{cap.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
};
