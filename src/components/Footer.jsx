import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export const Footer = ({ onNavigate, onOpenContact }) => {
  return (
    <footer style={{
      background: '#05070B',
      borderTop: '1px solid var(--border-subtle)',
      padding: '4.5rem 0 2.5rem'
    }}>
      <div className="container-xl">
        
        {/* Main Grid */}
        <div className="grid-4" style={{ gap: '2.5rem', marginBottom: '3.5rem' }}>
          
          {/* Col 1: Brand & Medallion */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <img 
                src="/mourato-seal-circle.png" 
                alt="Mourato & Associados"
                width="62"
                height="62"
                style={{ 
                  height: '62px', 
                  width: '62px', 
                  objectFit: 'contain',
                  borderRadius: '50%',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 12px rgba(197, 168, 105, 0.25)'
                }} 
              />
              <div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.06em' }}>
                  MOURATO &amp; ASSOCIADOS
                </div>
                <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--gold-light)' }}>
                  QUALIDADE • CONFIANÇA • EXCELÊNCIA
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#8E9BAE', lineHeight: 1.65, marginBottom: '1.2rem' }}>
              Boutique independente de inteligência financeira e corporativa. Atuação reservada na convergência entre mercado de capitais, desintermediação de spread bancário e governança de sócios.
            </p>

            <div style={{ fontSize: '0.76rem', color: '#8E9BAE', letterSpacing: '0.04em' }}>
              SÃO PAULO — ATUAÇÃO NACIONAL
            </div>
          </div>

          {/* Col 2: Práticas */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1.2rem' }}>
              Mercado de Capitais
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.86rem' }}>
              <li>
                <button 
                  onClick={() => onNavigate('spread')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--gold-light)'}
                  onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
                >
                  Otimização de Spread Bancário
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('spread')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--gold-light)'}
                  onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
                >
                  Antecipação &amp; FIDCs de Atacado
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('spread')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--gold-light)'}
                  onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
                >
                  Emissões Privadas (CRI, CRA, Debêntures)
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('spread')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--gold-light)'}
                  onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
                >
                  Câmbio Comercial &amp; Hedge
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Consultoria */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1.2rem' }}>
              Consultoria &amp; Societário
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.86rem' }}>
              <li>
                <button 
                  onClick={() => onNavigate('consultoria')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--gold-light)'}
                  onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
                >
                  Reorganização Societária &amp; Holdings
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('consultoria')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--gold-light)'}
                  onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
                >
                  Contabilidade Consultiva &amp; Covenants
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('consultoria')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--gold-light)'}
                  onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
                >
                  Planejamento Tributário Estratégico
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('consultoria')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--gold-light)'}
                  onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
                >
                  Valuation &amp; Assessoria em M&amp;A
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Audiência */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1.2rem' }}>
              Audiência Privada
            </div>
            <p style={{ fontSize: '0.85rem', color: '#8E9BAE', lineHeight: 1.6, marginBottom: '1.2rem' }}>
              Atendimento exclusivo para conselhos de administração, fundadores e CFOs sob protocolo estrito de não divulgação (NDA).
            </p>
            <button 
              className="btn-primary-gold" 
              onClick={onOpenContact}
              style={{ padding: '0.7rem 1.25rem', fontSize: '0.78rem', width: '100%' }}
            >
              Solicitar Contato Reservado
              <ArrowUpRight size={13} />
            </button>
          </div>

        </div>

        {/* Bottom Legal Bar */}
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.75rem',
          color: '#64748B'
        }}>
          <div>
            © {new Date().getFullYear()} Mourato e Associados Ltda. Todos os direitos reservados. CNPJ: 38.377.738/0001-45.
          </div>
          <div>
            São Paulo - SP • Atendimento Corporativo em Todo o Território Nacional.
          </div>
        </div>

      </div>
    </footer>
  );
};
