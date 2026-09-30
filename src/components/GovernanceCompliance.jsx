import React from 'react';
import { ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { COMPANY_DATA } from '../data/companyData';
import { useInView } from '../hooks/useInView';

export const GovernanceCompliance = () => {
  const principles = [
    {
      title: "Sigilo & Acordo de Confidencialidade (NDA)",
      desc: "Todas as informações contábeis, bancárias e estratégicas compartilhadas por clientes são protegidas por rigoroso termo de confidencialidade antes do início de qualquer análise."
    },
    {
      title: "Independência & Ausência de Conflito",
      desc: "Nossa assessoria atua desvinculada de interesses de bancos de varejo específicos, preservando total fidelidade ao melhor interesse financeiro da companhia cliente."
    },
    {
      title: "Conformidade Regulatória & LGPD",
      desc: "Processos alinhados às melhores práticas da Lei Geral de Proteção de Dados (LGPD) e às diretrizes regulatórias aplicáveis do mercado financeiro e corporativo nacional."
    },
    {
      title: "Rigor Técnico & Diligência",
      desc: "As modelagens financeiras e os pareceres de reestruturação são elaborados por especialistas com histórico em mercado de capitais e governança corporativa."
    }
  ];

  const [headerRef, headerInView] = useInView();
  const [gridRef, gridInView] = useInView({ threshold: 0 });

  return (
    <section id="governanca" style={{ padding: '5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="container-xl">
        
        {/* Header */}
        <div ref={headerRef} className={`fade-up${headerInView ? ' in-view' : ''}`} style={{ maxWidth: '800px', marginBottom: '3rem' }}>
          <span className="badge-institutional" style={{ marginBottom: '0.8rem' }}>
            INTEGRIDADE INSTITUCIONAL
          </span>
          <h2 style={{ marginBottom: '1rem' }}>
            Governança, Compliance &amp; Padrões de Confidencialidade
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: 1.65 }}>
            A discrição e a integridade técnica são os pilares fundamentais da nossa atuação. Conduzimos cada mandato com governança estrita e compromisso inegociável com a confidencialidade do cliente.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div ref={gridRef} className="grid-2" style={{ gap: '1.75rem' }}>
          {principles.map((pr, idx) => (
            <div key={idx} className={`advisory-card fade-up fade-up-delay-${idx % 3}${gridInView ? ' in-view' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <ShieldCheck size={18} color="var(--gold-primary)" />
                <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF' }}>{pr.title}</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', lineHeight: 1.6 }}>
                {pr.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
