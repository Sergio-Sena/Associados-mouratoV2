import React from 'react';
import { ArrowUpRight, TrendingUp, Landmark, Banknote, Repeat } from 'lucide-react';
import { useInView } from '../hooks/useInView';

export const SpreadOperationsModule = ({ onOpenContact }) => {
  const operations = [
    {
      title: "Otimização de Spread Bancário",
      lead: "Repactuação e mitigação de spreads de varejo bancário.",
      body: "Substituímos linhas com spreads abusivos (CDI + 6% a 12% a.a.) por operações estruturadas em mesas de crédito corporativo de atacado com taxas significativamente menores e carência adequada.",
      tag: "Dívida PJ & Giro"
    },
    {
      title: "Antecipação & Cessão de Recebíveis (FIDCs)",
      lead: "Deságio institucional de atacado sem reciprocidades.",
      body: "Conectamos sua empresa a mais de 15 FIDCs parceiros para monetização de duplicatas, contratos de fornecimento e cartões, com taxas inferiores às adquirentes e sem travas de liquidez bancária.",
      tag: "Liquidez D+0"
    },
    {
      title: "Emissões Privadas (CRI, CRA, Debêntures)",
      lead: "Funding estruturado de médio e longo prazo.",
      body: "Coordenação técnica completa para emissão de títulos de dívida corporativa privada voltados para expansão de plantas, frotas ou aquisições, com amortizações customizadas e covenants realistas.",
      tag: "Mercado de Capitais"
    },
    {
      title: "Câmbio Comercial & Proteção Cambial (Hedge)",
      lead: "Arbitragem de spread cambial e travas de proteção.",
      body: "Redução do spread cobrado por bancos no fechamento de câmbio pronto/futuro e estruturação de operações bilaterais e derivativos de proteção de margem para importadores e exportadores.",
      tag: "Comércio Exterior"
    }
  ];

  const [headerRef, headerInView] = useInView();
  const [gridRef, gridInView] = useInView();

  return (
    <section id="spread" style={{ padding: '5rem 0', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
      <div className="container-xl">
        
        {/* Header */}
        <div ref={headerRef} className={`fade-up${headerInView ? ' in-view' : ''}`} style={{ maxWidth: '800px', marginBottom: '3.5rem' }}>
          <span className="badge-institutional" style={{ marginBottom: '0.8rem' }}>
            PRÁTICA I • MERCADO DE CAPITAIS
          </span>
          <h2 style={{ marginBottom: '1rem' }}>
            Engenharia de Spread &amp; Liquidez Corporativa
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: 1.65 }}>
            A ineficiência do sistema bancário tradicional drena o caixa operacional de companhias produtivas. Nossa mesa atua para desintermediar o acesso ao capital, negociando diretamente com investidores institucionais e fundos de crédito privado.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div ref={gridRef} className="grid-2" style={{ gap: '1.75rem', marginBottom: '3rem' }}>
          {operations.map((op, idx) => (
            <div key={idx} className={`advisory-card fade-up fade-up-delay-${idx % 3}${gridInView ? ' in-view' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold-light)', fontWeight: 700 }}>
                  {op.tag}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>0{idx + 1}</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem', color: '#FFFFFF' }}>
                {op.title}
              </h3>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-subtle)', fontWeight: 600, marginBottom: '0.8rem' }}>
                {op.lead}
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6 }}>
                {op.body}
              </p>
            </div>
          ))}
        </div>

        {/* Action strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#CBD5E1' }}>
            Deseja avaliar o spread médio pago pela sua companhia nos contratos atuais?
          </div>
          <button className="btn-secondary-subtle" onClick={onOpenContact}>
            Consultar Mesa de Spread
            <ArrowUpRight size={14} />
          </button>
        </div>

      </div>
    </section>
  );
};
