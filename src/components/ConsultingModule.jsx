import React from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { ADVISORY_PRACTICES } from '../data/modulesData';
import { useInView } from '../hooks/useInView';

export const ConsultingModule = ({ onOpenContact }) => {
  const [headerRef, headerInView] = useInView();
  const [gridRef, gridInView] = useInView();

  return (
    <section id="consultoria" style={{ padding: '5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="container-xl">
        
        {/* Header */}
        <div ref={headerRef} className={`fade-up${headerInView ? ' in-view' : ''}`} style={{ maxWidth: '800px', marginBottom: '3.5rem' }}>
          <span className="badge-institutional" style={{ marginBottom: '0.8rem' }}>
            PRÁTICA II • ASSESSORIA ESTRATÉGICA
          </span>
          <h2 style={{ marginBottom: '1rem' }}>
            Consultoria em Gestão, Contabilidade &amp; Societário
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: 1.65 }}>
            A higidez e a perenidade de uma corporação dependem da integração precisa entre governança de sócios, eficiência tributária e rigor contábil. Apoiamos acionistas na tomada de decisões estruturais e na preparação para novos ciclos de capital.
          </p>
        </div>

        {/* 4 Capabilities Grid */}
        <div ref={gridRef} className="grid-2" style={{ gap: '1.75rem', marginBottom: '3rem' }}>
          {ADVISORY_PRACTICES.consultoria.capabilities.map((cap, idx) => (
            <div key={idx} className={`advisory-card fade-up fade-up-delay-${idx % 3}${gridInView ? ' in-view' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold-light)', fontWeight: 700 }}>
                  Prática Consultiva
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>0{idx + 1}</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem', color: '#FFFFFF' }}>
                {cap.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', lineHeight: 1.65 }}>
                {cap.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xs)',
          padding: '1.75rem 2.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
              Estruturação Societária, M&amp;A ou Planejamento Sucessório
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.2rem' }}>
              Atendimento sênior e reservado diretamente com os sócios da Mourato &amp; Associados.
            </div>
          </div>

          <button className="btn-secondary-subtle" onClick={onOpenContact}>
            Agendar Conversa com Sócio
            <ArrowUpRight size={14} />
          </button>
        </div>

      </div>
    </section>
  );
};
