import React, { useState, useMemo } from 'react';
import { ArrowUpRight, TrendingDown } from 'lucide-react';
import { useInView } from '../hooks/useInView';

export const InteractiveSimulator = ({ onOpenContact }) => {
  const [volume, setVolume] = useState(4000000);
  const [bankSpread, setBankSpread] = useState(6.5);
  const [mouratoSpread, setMouratoSpread] = useState(2.5);
  const [tenor, setTenor] = useState(24);
  const [headerRef, headerInView] = useInView();
  const [gridRef, gridInView] = useInView();

  const results = useMemo(() => {
    const delta = Math.max(0, bankSpread - mouratoSpread);
    const annualSavings = (volume * delta) / 100;
    const totalSavings = annualSavings * (tenor / 12);
    return {
      delta: delta.toFixed(1),
      annualSavings,
      totalSavings
    };
  }, [volume, bankSpread, mouratoSpread, tenor]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <section id="simulador" style={{ padding: '5rem 0', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
      <div className="container-xl">
        
        {/* Header */}
        <div ref={headerRef} className={`fade-up${headerInView ? ' in-view' : ''}`} style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3rem' }}>
          <span className="badge-institutional" style={{ marginBottom: '0.8rem' }}>
            MODELAGEM FINANCEIRA PRELIMINAR
          </span>
          <h2 style={{ marginBottom: '1rem' }}>
            Simulador de Otimização de Spread &amp; Custo de Capital
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: 1.6 }}>
            Ajuste os parâmetros da estrutura de crédito ou antecipação da sua empresa e quantifique a retenção de caixa viabilizada pela substituição do spread de varejo por condições de atacado.
          </p>
        </div>

        {/* 2 Column Box */}
        <div ref={gridRef} className={`grid-2 fade-up${gridInView ? ' in-view' : ''}`} style={{ gap: '2rem', alignItems: 'stretch' }}>
          
          {/* Controls */}
          <div className="advisory-card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', color: '#FFFFFF' }}>
              Parâmetros da Operação Financeira
            </h3>

            {/* Volume */}
            <div style={{ marginBottom: '1.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                  Volume de Crédito / Recebíveis:
                </label>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold-light)' }}>
                  {formatCurrency(volume)}
                </span>
              </div>
              <input 
                type="range"
                min="500000"
                max="30000000"
                step="250000"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="exec-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.4rem' }}>
                <span>R$ 500 mil</span>
                <span>R$ 15 milhões</span>
                <span>R$ 30 milhões</span>
              </div>
            </div>

            {/* Bank Spread */}
            <div style={{ marginBottom: '1.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                  Spread Cobrado no Banco Atual (CDI + % a.a.):
                </label>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F87171' }}>
                  +{bankSpread}% a.a.
                </span>
              </div>
              <input 
                type="range"
                min="3.0"
                max="12.0"
                step="0.2"
                value={bankSpread}
                onChange={(e) => setBankSpread(Number(e.target.value))}
                className="exec-slider"
              />
            </div>

            {/* Target Spread */}
            <div style={{ marginBottom: '1.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                  Spread Estruturado em Mesa de Atacado:
                </label>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gold-light)' }}>
                  +{mouratoSpread}% a.a.
                </span>
              </div>
              <input 
                type="range"
                min="1.2"
                max="4.5"
                step="0.1"
                value={mouratoSpread}
                onChange={(e) => setMouratoSpread(Number(e.target.value))}
                className="exec-slider"
              />
            </div>

            {/* Tenor */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Prazo da Operação:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {[12, 24, 36, 48].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTenor(m)}
                    style={{
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-xs)',
                      border: tenor === m ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                      background: tenor === m ? 'var(--gold-muted)' : 'transparent',
                      color: tenor === m ? 'var(--gold-light)' : 'var(--text-body)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {m} meses
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Results Summary */}
          <div className="advisory-card-active" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <span className="badge-outline">PROJEÇÃO DE FLUXO DE CAIXA</span>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Horizonte: {tenor} meses</span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Economia Total Estimada no Período:
              </div>
              
              <div style={{
                fontSize: 'clamp(2.2rem, 3.5vw, 2.9rem)',
                fontWeight: 800,
                fontFamily: "var(--font-serif)",
                color: 'var(--gold-light)',
                lineHeight: 1.1,
                margin: '0.5rem 0 1rem'
              }}>
                {formatCurrency(results.totalSavings)}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                color: 'var(--text-subtle)',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.8rem'
              }}>
                <TrendingDown size={16} color="var(--gold-primary)" />
                <span>Mitigação de <strong>{results.delta}% a.a.</strong> no custo financeiro marginal.</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94A3B8' }}>Alívio de Caixa Anualizado:</span>
                  <strong style={{ color: '#FFFFFF' }}>{formatCurrency(results.annualSavings)}/ano</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94A3B8' }}>Deságio Médio Otimizado:</span>
                  <strong style={{ color: 'var(--gold-light)' }}>Atacado / DCM Privado</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button 
                className="btn-primary-gold" 
                onClick={onOpenContact}
                style={{ width: '100%', padding: '0.9rem' }}
              >
                Solicitar Parecer de Viabilidade
                <ArrowUpRight size={15} />
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.74rem', color: '#64748B', marginTop: '0.6rem' }}>
                Valores meramente estimativos. Condições finais dependem do rating e das garantias da empresa.
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
