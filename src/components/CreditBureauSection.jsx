import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Scale, 
  Building2, 
  UserCheck, 
  ArrowUpRight, 
  FileCheck, 
  TrendingUp, 
  Percent, 
  Landmark, 
  Lock 
} from 'lucide-react';
import { useInView } from '../hooks/useInView';

export const CreditBureauSection = ({ onOpenContact }) => {
  const [headerRef, headerInView] = useInView();
  const [institutionsRef, institutionsInView] = useInView({ threshold: 0 });
  const [advantagesRef, advantagesInView] = useInView({ threshold: 0 });
  const [legalRef, legalInView] = useInView({ threshold: 0 });

  const institutions = [
    {
      name: "Serasa Experian",
      target: "Pessoa Física & Jurídica",
      tag: "SCORE & CADASTRO POSITIVO",
      scope: "Auditoria e saneamento do score de crédito, Cadastro Positivo e exclusão de apontamentos comerciais vencidos ou desatualizados.",
      impact: "Elevação imediata do rating estatístico e desbloqueio de propostas em mesas de crédito corporativo e pessoal.",
      badgeColor: "rgba(197, 168, 105, 0.15)"
    },
    {
      name: "Boa Vista SCPC",
      target: "Pessoa Física & Jurídica",
      tag: "CRÉDITO MERCANTIL & SCORE",
      scope: "Revisão e retificação de pendências no banco de dados de proteção ao crédito mercantil e histórico de pontualidade de pagamentos.",
      impact: "Restabelecimento da credibilidade com fornecedores, distribuidores e operadoras de crédito rotativo.",
      badgeColor: "rgba(59, 130, 246, 0.15)"
    },
    {
      name: "Quod (Gestora de Crédito)",
      target: "Birô dos 5 Maiores Bancos",
      tag: "INTELIGÊNCIA BANCÁRIA",
      scope: "Saneamento de dados no birô oficial fundado pelos 5 maiores conglomerados financeiros do país (Itaú, Bradesco, Santander, BB e Caixa).",
      impact: "Adequação estrita às políticas internas e aos algoritmos preditivos das maiores instituições de atacado bancário.",
      badgeColor: "rgba(16, 185, 129, 0.15)"
    },
    {
      name: "Banco Central do Brasil (SCR)",
      target: "Sistema Registrato & SCR",
      tag: "RISCO REGULATÓRIO & BACEN",
      scope: "Perícia e requisição formal de baixa de operações classificadas indevidamente como prejuízo (Prejuízo V / V1) e créditos prescritos.",
      impact: "Reclassificação do rating regulatório BACEN (níveis de A a H), destravando a tomada de recursos no Sistema Financeiro Nacional.",
      badgeColor: "rgba(245, 158, 11, 0.15)"
    }
  ];

  const advantages = [
    {
      icon: TrendingUp,
      title: "Desbloqueio de Linhas Corporativas",
      desc: "Liberação de capital de giro, limites em conta corrente, antecipação estruturada de recebíveis e financiamentos de frotas e maquinários."
    },
    {
      icon: Percent,
      title: "Redução Agressiva de Spread e Juros",
      desc: "Scores altos e cadastro saneado enquadram a empresa e seus sócios em faixas preferenciais de risco, diminuindo as taxas praticadas pelos bancos."
    },
    {
      icon: UserCheck,
      title: "Sinergia Sócio (PF) e Empresa (PJ)",
      desc: "Harmonização do histórico financeiro dos sócios garantidores com a governança da empresa, evitando contaminações mútuas de rating."
    },
    {
      icon: ShieldCheck,
      title: "Segurança Jurídica & Celeridade",
      desc: "Atuação conduzida estritamente por vias administrativas e fundamentação pericial, sem métodos obscuros e em total conformidade com a lei."
    }
  ];

  const legalBases = [
    {
      code: "Lei Federal nº 12.414/2011",
      name: "Lei do Cadastro Positivo",
      detail: "Artigos 5º e 9º: Garante ao cadastrado o direito inalienável ao acesso irrestrito, à transparência e à retificação imediata de dados incompletos ou inexatos constantes nos bancos de dados."
    },
    {
      code: "Lei Federal nº 8.078/1990 (CDC)",
      name: "Código de Defesa do Consumidor",
      detail: "Artigo 43, § 3º: Determina que o arquivista deve efetuar a correção de inexatidões no prazo impreterível de 5 (cinco) dias úteis após a notificação, vedando anotações prescritas."
    },
    {
      code: "Lei Federal nº 13.709/2018 (LGPD)",
      name: "Lei Geral de Proteção de Dados",
      detail: "Arts. 6º e 18: Princípios da exatidão dos dados e livre acesso, assegurando ao titular a correção imediata de informações desatualizadas ou tratadas em desconformidade."
    },
    {
      code: "Resoluções CMN / BACEN",
      name: "Regulamentação do SCR Registrato",
      detail: "Normas de integridade do Sistema de Informações de Crédito (SCR), garantindo a baixa de lançamentos indevidos de prejuízo após quitações ou prescrição legal."
    }
  ];

  return (
    <section id="biros" style={{ padding: '5.5rem 0', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
      <div className="container-xl">
        
        {/* Header da Seção */}
        <div ref={headerRef} className={`fade-up${headerInView ? ' in-view' : ''}`} style={{ maxWidth: '840px', marginBottom: '3.5rem' }}>
          <span className="badge-institutional" style={{ marginBottom: '0.9rem' }}>
            REGULARIZAÇÃO DE CRÉDITO • PF &amp; PJ
          </span>
          <h2 style={{ marginBottom: '1.2rem', color: '#FFFFFF' }}>
            Birôs de Crédito &amp; Reabilitação Estratégica de Rating
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '1.02rem', lineHeight: 1.68 }}>
            Assessoria consultiva e pericial para revisão, saneamento e atualização cadastral do histórico financeiro junto aos 4 principais organismos de proteção ao crédito e ao Banco Central. Restabelecemos a capacidade de financiamento e a idoneidade cadastral com rigor técnico e absoluto respaldo na legislação federal.
          </p>
        </div>

        {/* 1. As 4 Instituições Oficiais */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Building2 size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: 600 }}>
              Instituições Abrangidas &amp; Escopo de Atualização
            </h3>
          </div>

          <div ref={institutionsRef} className="grid-2" style={{ gap: '1.5rem' }}>
            {institutions.map((inst, idx) => (
              <div 
                key={idx} 
                className={`advisory-card fade-up fade-up-delay-${idx % 2}${institutionsInView ? ' in-view' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                    <div>
                      <h4 style={{ color: '#FFFFFF', fontSize: '1.2rem', marginBottom: '0.2rem' }}>
                        {inst.name}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gold-light)', fontWeight: 600 }}>
                        {inst.target}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '4px',
                      background: inst.badgeColor,
                      color: '#E2E8F0',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {inst.tag}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1rem' }}>
                    {inst.scope}
                  </p>
                </div>

                <div style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(197, 168, 105, 0.15)',
                  fontSize: '0.82rem',
                  color: '#CBD5E1',
                  lineHeight: 1.5
                }}>
                  <strong style={{ color: 'var(--gold-light)' }}>Impacto Prático: </strong>
                  {inst.impact}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Vantagens Estratégicas para o Cliente Final */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <TrendingUp size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: 600 }}>
              Vantagens para Companhias e Sócios
            </h3>
          </div>

          <div ref={advantagesRef} className="grid-2" style={{ gap: '1.5rem' }}>
            {advantages.map((adv, idx) => {
              const IconComp = adv.icon;
              return (
                <div key={idx} className={`advisory-card fade-up fade-up-delay-${idx % 2}${advantagesInView ? ' in-view' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(197, 168, 105, 0.1)',
                      border: '1px solid rgba(197, 168, 105, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComp size={18} color="var(--gold-primary)" />
                    </div>
                    <h4 style={{ color: '#FFFFFF', fontSize: '1.05rem', margin: 0 }}>
                      {adv.title}
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                    {adv.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Marco Regulatório & Fundamentação Jurídica */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Scale size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: 600 }}>
              Fundamentação Jurídica &amp; Marco Legal Vigente
            </h3>
          </div>

          <div ref={legalRef} className="grid-2" style={{ gap: '1.25rem' }}>
            {legalBases.map((base, idx) => (
              <div 
                key={idx} 
                style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gold-light)', fontWeight: 700, letterSpacing: '0.04em' }}>
                    {base.code}
                  </span>
                  <FileCheck size={14} color="var(--gold-primary)" />
                </div>
                <h5 style={{ color: '#FFFFFF', fontSize: '0.98rem', margin: 0, fontWeight: 600 }}>
                  {base.name}
                </h5>
                <p style={{ color: '#94A3B8', fontSize: '0.84rem', lineHeight: 1.55, margin: 0 }}>
                  {base.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé da Seção com Ações Elegantes */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(197, 168, 105, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
          border: '1px solid var(--gold-border)',
          borderRadius: '10px',
          padding: '2rem 2.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem'
        }}>
          <div style={{ maxWidth: '620px' }}>
            <h4 style={{ color: '#FFFFFF', fontSize: '1.2rem', marginBottom: '0.4rem', fontWeight: 600 }}>
              Pronto para Avaliar o Histórico Financeiro da Sua Companhia?
            </h4>
            <p style={{ color: '#94A3B8', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
              Nossos especialistas realizam diagnóstico prévio sob termo de sigilo para identificar restrições sanáveis e planejar a recomposição integral de rating.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-primary-gold"
              onClick={onOpenContact}
              style={{ padding: '0.8rem 1.6rem', fontSize: '0.85rem' }}
            >
              Solicitar Diagnóstico Reservado
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
