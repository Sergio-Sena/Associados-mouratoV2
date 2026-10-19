import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Search, Globe, BookOpen, Edit3, History, Bookmark, Share2, Printer, HelpCircle, CheckCircle2, ShieldCheck, Moon, Sun } from 'lucide-react';

export const WikipediaArticle = ({ onBack }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Mourato & Associados – Wikipédia, a enciclopédia livre';
  }, []);

  const theme = darkMode ? {
    bg: '#101418',
    text: '#E1E3E6',
    headerBg: '#1A2026',
    border: '#3A424C',
    link: '#6BA4FF',
    visitedLink: '#B388FF',
    infoboxBg: '#181E24',
    infoboxHeader: '#202830',
    tagBg: '#212933',
    tocBg: '#151A20',
    codeBg: '#1E252D'
  } : {
    bg: '#FFFFFF',
    text: '#202122',
    headerBg: '#F8F9FA',
    border: '#A2A9B1',
    borderLight: '#C8CCD1',
    link: '#0645AD',
    visitedLink: '#0B0080',
    infoboxBg: '#F8F9FA',
    infoboxHeader: '#EAECF0',
    tagBg: '#F0F2F5',
    tocBg: '#F8F9FA',
    codeBg: '#F1F2F4'
  };

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{
      background: theme.bg,
      color: theme.text,
      minHeight: '100vh',
      fontFamily: 'sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Lato, Helvetica, Arial',
      fontSize: '14px',
      lineHeight: '1.6',
      transition: 'background 0.2s, color 0.2s'
    }}>
      {/* Top Bar Banner de Retorno ao Site Oficial */}
      <div style={{
        background: darkMode ? '#0D1117' : '#0B132B',
        color: '#FFFFFF',
        padding: '0.6rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.8rem',
        borderBottom: `2px solid ${darkMode ? '#C5A869' : '#C5A869'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            background: '#C5A869',
            color: '#0A0F1D',
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '0.2rem 0.55rem',
            borderRadius: '3px',
            letterSpacing: '0.05em'
          }}>
            PROJEÇÃO ENCICLOPÉDICA
          </span>
          <span style={{ fontSize: '0.85rem', color: '#E2E8F0' }}>
            Simulação de Página Institucional na <strong>Wikipédia (pt.wikipedia.org)</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              borderRadius: '4px',
              padding: '0.35rem 0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem'
            }}
          >
            {darkMode ? <Sun size={14} color="#FBBF24" /> : <Moon size={14} />}
            {darkMode ? 'Modo Claro' : 'Modo Escuro (Wiki)'}
          </button>

          <button
            onClick={onBack}
            style={{
              background: '#C5A869',
              color: '#0A0F1D',
              border: 'none',
              borderRadius: '4px',
              padding: '0.4rem 1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem'
            }}
          >
            <ArrowLeft size={14} />
            Voltar ao Portal Oficial
          </button>
        </div>
      </div>

      {/* Wikipedia Global Header */}
      <header style={{
        background: theme.headerBg,
        borderBottom: `1px solid ${darkMode ? '#30363D' : '#C8CCD1'}`,
        padding: '0.6rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Wiki Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Wikipedia Globe Icon */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: darkMode ? '#22272E' : '#E8EAED',
            border: `1px solid ${darkMode ? '#444C56' : '#C8CCD1'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontFamily: 'serif',
            fontWeight: 'bold',
            color: darkMode ? '#FFFFFF' : '#000000',
            userSelect: 'none'
          }}>
            W
          </div>
          <div>
            <div style={{ fontFamily: 'Linux Libertine, Georgia, Times, serif', fontSize: '1.35rem', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              WIKIPÉDIA
            </div>
            <div style={{ fontSize: '0.68rem', color: darkMode ? '#8B949E' : '#72777D', letterSpacing: '0.02em' }}>
              A enciclopédia livre
            </div>
          </div>
        </div>

        {/* Wiki Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', flex: '1', maxWidth: '440px', margin: '0 1rem' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', color: '#72777D' }} />
            <input 
              type="text" 
              readOnly 
              value="Mourato & Associados" 
              style={{
                width: '100%',
                padding: '0.45rem 0.6rem 0.45rem 2.2rem',
                border: `1px solid ${darkMode ? '#444C56' : '#72777D'}`,
                borderRadius: '3px',
                background: darkMode ? '#0D1117' : '#FFFFFF',
                color: theme.text,
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        {/* Wiki User Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: theme.link }}>
          <span style={{ cursor: 'pointer' }}>Não autenticado</span>
          <span>·</span>
          <span style={{ cursor: 'pointer' }}>Discussão</span>
          <span>·</span>
          <span style={{ cursor: 'pointer' }}>Contribuições</span>
          <span>·</span>
          <span style={{ cursor: 'pointer', fontWeight: 600 }}>Criar uma conta</span>
          <span>·</span>
          <span style={{ cursor: 'pointer', fontWeight: 600 }}>Entrar</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '1.25rem 2rem 4rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>

        {/* Wikipedia Article Action Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
          paddingBottom: '0.2rem'
        }}>
          {/* Left Tabs */}
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <button style={{
              background: 'none',
              border: 'none',
              borderBottom: '3px solid #3366CC',
              padding: '0.4rem 0.8rem',
              fontWeight: 'bold',
              color: darkMode ? '#58A6FF' : '#202122',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}>
              Artigo
            </button>
            <button style={{
              background: 'none',
              border: 'none',
              padding: '0.4rem 0.8rem',
              color: theme.link,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}>
              Discussão
            </button>
          </div>

          {/* Right Tabs */}
          <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
            <button style={{
              background: 'none',
              border: 'none',
              borderBottom: '3px solid #3366CC',
              padding: '0.4rem 0.8rem',
              fontWeight: 'bold',
              color: darkMode ? '#58A6FF' : '#202122',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}>
              Ler
            </button>
            <button style={{
              background: 'none',
              border: 'none',
              padding: '0.4rem 0.8rem',
              color: theme.link,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Edit3 size={12} />
              Editar
            </button>
            <button style={{
              background: 'none',
              border: 'none',
              padding: '0.4rem 0.8rem',
              color: theme.link,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <History size={12} />
              Ver histórico
            </button>
            <div style={{ height: '14px', width: '1px', background: darkMode ? '#444C56' : '#C8CCD1', margin: '0 0.4rem' }} />
            <button style={{
              background: 'none',
              border: 'none',
              padding: '0.4rem 0.6rem',
              color: theme.link,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}>
              Ferramentas
            </button>
          </div>
        </div>

        {/* Article Title */}
        <div>
          <h1 style={{
            fontFamily: 'Linux Libertine, Georgia, Times, serif',
            fontSize: '2.1rem',
            fontWeight: 400,
            borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
            paddingBottom: '0.35rem',
            margin: '0.5rem 0 0.15rem 0',
            lineHeight: 1.2
          }}>
            Mourato &amp; Associados
          </h1>
          <div style={{ fontSize: '0.8rem', color: darkMode ? '#8B949E' : '#54595D', marginBottom: '1.25rem' }}>
            Origem: Wikipédia, a enciclopédia livre.
          </div>
        </div>

        {/* Wikipedia Maintenance / Disambiguation Box */}
        <div style={{
          background: darkMode ? '#161B22' : '#F8F9FA',
          border: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
          borderLeft: '4px solid #3366CC',
          padding: '0.75rem 1rem',
          fontSize: '0.82rem',
          lineHeight: '1.5',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <CheckCircle2 size={18} style={{ color: '#3366CC', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Mourato &amp; Associados Ltda.</strong> é uma sociedade brasileira de assessoria financeira, inteligência corporativa e engenharia de crédito, constituída em São Paulo. Não confundir com estabelecimentos de varejo ou perfumaria homônimos descontinuados. Para consulta cadastral oficial, veja <em><a href="#referencias" style={{ color: theme.link }}>Registro JUCESP e CNPJ 38.377.738/0001-45</a></em>.
          </div>
        </div>

        {/* Content Body Grid: Article Text + Infobox */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '2.5rem',
          alignItems: 'start'
        }}>

          {/* LEFT: Main Text Sections */}
          <div>

            {/* Lead Section */}
            <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
              <strong>Mourato &amp; Associados</strong> (razão social formal: <em>Mourato e Associados Ltda.</em>) é uma empresa brasileira de assessoria em inteligência financeira, reestruturação societária e desintermediação de spread bancário, sediada na cidade de <a href="https://pt.wikipedia.org/wiki/S%C3%A3o_Paulo" target="_blank" rel="noreferrer" style={{ color: theme.link }}>São Paulo</a>, no centro financeiro da República. Fundada em setembro de 2020<sup><a href="#ref-1" style={{ color: theme.link, textDecoration: 'none' }}>[1]</a></sup>, a instituição opera na intersecção entre o <a href="https://pt.wikipedia.org/wiki/Mercado_de_capitais" target="_blank" rel="noreferrer" style={{ color: theme.link }}>mercado de capitais</a>, perícia contábil de birôs de crédito e a modelagem estruturada de instrumentos de dívida fiduciária.
            </p>

            <p style={{ margin: '0 0 1.25rem 0', textAlign: 'justify' }}>
              A firma diferencia-se no mercado financeiro nacional por adotar uma tese estrita de <strong>não intermediação de crédito com spread oculto</strong>, atuando sob alinhamento fiduciário com conselhos de administração, empresários e fundadores de empresas médias e de grande porte (<em>Middle Market</em> e <em>Corporate</em>). Entre suas principais verticais destacam-se a compressão técnica de taxas de juros bancárias, auditoria pericial no Sistema de Informações de Crédito do Banco Central (<a href="https://pt.wikipedia.org/wiki/Banco_Central_do_Brasil" target="_blank" rel="noreferrer" style={{ color: theme.link }}>SCR Sisbacen</a>), antecipação estruturada via fundos de investimento (<a href="https://pt.wikipedia.org/wiki/Fundo_de_investimento_em_direitos_credit%C3%B3rios" target="_blank" rel="noreferrer" style={{ color: theme.link }}>FIDCs</a>) e reorganização de holdings patrimoniais<sup><a href="#ref-2" style={{ color: theme.link, textDecoration: 'none' }}>[2]</a></sup>.
            </p>

            {/* Sumário (Table of Contents) */}
            <div style={{
              background: theme.tocBg,
              border: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
              padding: '0.85rem 1.25rem',
              display: 'inline-block',
              minWidth: '280px',
              maxWidth: '100%',
              margin: '0.5rem 0 2rem 0',
              borderRadius: '2px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Sumário</span>
                <button
                  onClick={() => setTocCollapsed(!tocCollapsed)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.link,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  [{tocCollapsed ? 'mostrar' : 'ocultar'}]
                </button>
              </div>

              {!tocCollapsed && (
                <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', lineHeight: '1.8' }}>
                  <li><a href="#historia" onClick={(e) => { e.preventDefault(); scrollTo('historia'); }} style={{ color: theme.link }}>1 História e Fundação</a>
                    <ol style={{ paddingLeft: '1.2rem' }}>
                      <li><a href="#origens" onClick={(e) => { e.preventDefault(); scrollTo('origens'); }} style={{ color: theme.link }}>1.1 Constituição e Posicionamento (2020)</a></li>
                      <li><a href="#transicao" onClick={(e) => { e.preventDefault(); scrollTo('transicao'); }} style={{ color: theme.link }}>1.2 Expansão para Mercado de Capitais</a></li>
                    </ol>
                  </li>
                  <li><a href="#areas-atuacao" onClick={(e) => { e.preventDefault(); scrollTo('areas-atuacao'); }} style={{ color: theme.link }}>2 Áreas de Atuação e Serviços Técnicos</a>
                    <ol style={{ paddingLeft: '1.2rem' }}>
                      <li><a href="#spread-bancario" onClick={(e) => { e.preventDefault(); scrollTo('spread-bancario'); }} style={{ color: theme.link }}>2.1 Engenharia e Redução de Spread Bancário</a></li>
                      <li><a href="#mercado-capitais" onClick={(e) => { e.preventDefault(); scrollTo('mercado-capitais'); }} style={{ color: theme.link }}>2.2 Emissões Estruturadas (CRI, CRA, Debêntures, FIDCs)</a></li>
                      <li><a href="#biros-credito" onClick={(e) => { e.preventDefault(); scrollTo('biros-credito'); }} style={{ color: theme.link }}>2.3 Inteligência e Perícia em Birôs (SCR, Serasa, Quod)</a></li>
                      <li><a href="#consultoria-societaria" onClick={(e) => { e.preventDefault(); scrollTo('consultoria-societaria'); }} style={{ color: theme.link }}>2.4 Reorganização Societária e Blindagem de Quotas</a></li>
                    </ol>
                  </li>
                  <li><a href="#modelo-negocio" onClick={(e) => { e.preventDefault(); scrollTo('modelo-negocio'); }} style={{ color: theme.link }}>3 Modelo Operacional e Alinhamento Fiduciário</a></li>
                  <li><a href="#governanca" onClick={(e) => { e.preventDefault(); scrollTo('governanca'); }} style={{ color: theme.link }}>4 Governança, Compliance e Sigilo Bancário</a></li>
                  <li><a href="#plataforma" onClick={(e) => { e.preventDefault(); scrollTo('plataforma'); }} style={{ color: theme.link }}>5 Plataforma Digital e Automação Pericial</a></li>
                  <li><a href="#ver-tambem" onClick={(e) => { e.preventDefault(); scrollTo('ver-tambem'); }} style={{ color: theme.link }}>6 Ver também</a></li>
                  <li><a href="#referencias" onClick={(e) => { e.preventDefault(); scrollTo('referencias'); }} style={{ color: theme.link }}>7 Referências</a></li>
                  <li><a href="#ligacoes-externas" onClick={(e) => { e.preventDefault(); scrollTo('ligacoes-externas'); }} style={{ color: theme.link }}>8 Ligações externas</a></li>
                </ol>
              )}
            </div>

            {/* Section 1: História */}
            <div id="historia" style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontFamily: 'Linux Libertine, Georgia, Times, serif',
                fontSize: '1.45rem',
                borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
                paddingBottom: '0.25rem',
                margin: '1.5rem 0 0.75rem 0'
              }}>
                1 História e Fundação
              </h2>

              <h3 id="origens" style={{ fontSize: '1.05rem', margin: '1rem 0 0.5rem 0', color: darkMode ? '#E6EDF3' : '#333333' }}>
                1.1 Constituição e Posicionamento (2020)
              </h3>
              <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
                A Mourato &amp; Associados Ltda. foi formalmente registrada na Junta Comercial do Estado de São Paulo (<a href="https://pt.wikipedia.org/wiki/Junta_Comercial_do_Estado_de_S%C3%A3o_Paulo" target="_blank" rel="noreferrer" style={{ color: theme.link }}>JUCESP</a>) em 8 de setembro de 2020 sob o NIRE 35270804594 e o CNPJ 38.377.738/0001-45<sup><a href="#ref-1" style={{ color: theme.link, textDecoration: 'none' }}>[1]</a></sup>. Estabeleceu sua sede corporativa na Avenida São Luís, 187, no bairro da República, região histórica de escritórios de advocacia financeira, contabilidade corporativa e consultorias independentes de São Paulo.
              </p>

              <h3 id="transicao" style={{ fontSize: '1.05rem', margin: '1rem 0 0.5rem 0', color: darkMode ? '#E6EDF3' : '#333333' }}>
                1.2 Expansão para Mercado de Capitais
              </h3>
              <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
                A partir de 2022, impulsionada pelo ciclo de elevação da taxa Selic e pelo encarecimento do crédito bancário tradicional, a empresa estruturou sua divisão de Mercado de Capitais e Desintermediação. A estratégia concentrou-se em substituir linhas de capital de giro de bancos de varejo (que praticavam spreads superiores a 18% ao ano) por emissões diretas de Certificados de Recebíveis Imobiliários (<a href="https://pt.wikipedia.org/wiki/Certificado_de_Receb%C3%ADveis_Imobili%C3%A1rios" target="_blank" rel="noreferrer" style={{ color: theme.link }}>CRI</a>), Certificados de Recebíveis do Agronegócio (<a href="https://pt.wikipedia.org/wiki/Certificado_de_Receb%C3%ADveis_do_Agroneg%C3%B3cio" target="_blank" rel="noreferrer" style={{ color: theme.link }}>CRA</a>) e cotas sênior de FIDCs.
              </p>
            </div>

            {/* Section 2: Áreas de Atuação */}
            <div id="areas-atuacao" style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontFamily: 'Linux Libertine, Georgia, Times, serif',
                fontSize: '1.45rem',
                borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
                paddingBottom: '0.25rem',
                margin: '1.5rem 0 0.75rem 0'
              }}>
                2 Áreas de Atuação e Serviços Técnicos
              </h2>

              <h3 id="spread-bancario" style={{ fontSize: '1.05rem', margin: '1rem 0 0.5rem 0', color: darkMode ? '#E6EDF3' : '#333333' }}>
                2.1 Engenharia e Redução de Spread Bancário
              </h3>
              <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
                O modelo pericial da Mourato &amp; Associados analisa a anatomia do <a href="https://pt.wikipedia.org/wiki/Spread_banc%C3%A1rio" target="_blank" rel="noreferrer" style={{ color: theme.link }}>spread bancário</a> imposto pelas instituições financeiras, dividindo o custo efetivo total em:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li><strong>Custo de Captação e Compulsórios:</strong> parâmetros do Banco Central do Brasil;</li>
                <li><strong>Provisão contra Perdas (Inadimplência Projetada):</strong> reclassificação do rating contábil do tomador;</li>
                <li><strong>Custos Administrativos e Tributos (IOF, PIS, COFINS):</strong> depuração de custos redundantes;</li>
                <li><strong>Margem Líquida da Instituição:</strong> compressão técnica negociada com gerências de grandes empresas (Corporate e Middle Market).</li>
              </ul>

              <h3 id="mercado-capitais" style={{ fontSize: '1.05rem', margin: '1rem 0 0.5rem 0', color: darkMode ? '#E6EDF3' : '#333333' }}>
                2.2 Emissões Estruturadas (CRI, CRA, Debêntures, FIDCs)
              </h3>
              <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
                A companhia auxilia empresas na captação direta junto a investidores institucionais e fundos de crédito privado, sem a retenção de reciprocidades bancárias (como aplicações compulsórias, seguros casados ou capitalização) exigidas pelo sistema financeiro convencional<sup><a href="#ref-3" style={{ color: theme.link, textDecoration: 'none' }}>[3]</a></sup>.
              </p>

              <h3 id="biros-credito" style={{ fontSize: '1.05rem', margin: '1rem 0 0.5rem 0', color: darkMode ? '#E6EDF3' : '#333333' }}>
                2.3 Inteligência e Perícia em Birôs (SCR, Serasa, Quod)
              </h3>
              <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
                A auditoria da empresa atua diretamente na retificação e saneamento de registros no Sistema de Informações de Crédito do Banco Central (SCR Sisbacen), identificando divergências entre o saldo devedor real e os valores reportados pelas instituições nas faixas de prejuízo contábil (Resolução CMN nº 4.966/2021). A atuação estende-se aos birôs privados Serasa Experian, Quod, Boa Vista SCPC e SPC Brasil.
              </p>

              <h3 id="consultoria-societaria" style={{ fontSize: '1.05rem', margin: '1rem 0 0.5rem 0', color: darkMode ? '#E6EDF3' : '#333333' }}>
                2.4 Reorganização Societária e Blindagem de Quotas
              </h3>
              <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
                A divisão consultiva estrutura holdings puras e patrimoniais, acordos de sócios, governança pré-sucessória e adequação aos <em>covenants</em> de contratos financeiros, garantindo a solidez dos balanços e a desvinculação do patrimônio familiar das operações de risco empresarial.
              </p>
            </div>

            {/* Section 3: Modelo de Negócio */}
            <div id="modelo-negocio" style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontFamily: 'Linux Libertine, Georgia, Times, serif',
                fontSize: '1.45rem',
                borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
                paddingBottom: '0.25rem',
                margin: '1.5rem 0 0.75rem 0'
              }}>
                3 Modelo Operacional e Alinhamento Fiduciário
              </h2>
              <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
                Diferente de correspondentes bancários ou agentes autônomos remunerados por comissões de produtos das instituições financeiras, a Mourato &amp; Associados opera sob modelo de honorários de estruturação (<em>retainer</em> e <em>success fee</em>), eliminando o conflito de interesses na contratação de instrumentos de crédito.
              </p>
            </div>

            {/* Section 4: Governança & Sigilo */}
            <div id="governanca" style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontFamily: 'Linux Libertine, Georgia, Times, serif',
                fontSize: '1.45rem',
                borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
                paddingBottom: '0.25rem',
                margin: '1.5rem 0 0.75rem 0'
              }}>
                4 Governança, Compliance e Sigilo Bancário
              </h2>
              <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
                Todas as tratativas são resguardadas por Acordos de Não Divulgação (<em>Non-Disclosure Agreement</em> — NDA) em estrita conformidade com a <a href="https://pt.wikipedia.org/wiki/Lei_Geral_de_Prote%C3%A7%C3%A3o_de_Dados" target="_blank" rel="noreferrer" style={{ color: theme.link }}>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</a> e a Lei Complementar nº 105/2001 (Sigilo das Operações Financeiras). A empresa <strong>não realiza custódia de recursos de clientes</strong> e não mantém contas de depósito, operando estritamente no âmbito da consultoria técnica e assessoria contábil-econômica.
              </p>
            </div>

            {/* Section 5: Plataforma Digital */}
            <div id="plataforma" style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontFamily: 'Linux Libertine, Georgia, Times, serif',
                fontSize: '1.45rem',
                borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
                paddingBottom: '0.25rem',
                margin: '1.5rem 0 0.75rem 0'
              }}>
                5 Plataforma Digital e Automação Pericial
              </h2>
              <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>
                A instituição disponibiliza uma esteira tecnológica proprietária integrada com simuladores de amortização fiduciária, geração de dossiês periciais automatizados e validação instantânea de elegibilidade cadastral de pessoas físicas e jurídicas.
              </p>
            </div>

            {/* Section 6: Ver Também */}
            <div id="ver-tambem" style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontFamily: 'Linux Libertine, Georgia, Times, serif',
                fontSize: '1.45rem',
                borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
                paddingBottom: '0.25rem',
                margin: '1.5rem 0 0.75rem 0'
              }}>
                6 Ver também
              </h2>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                <li><a href="https://pt.wikipedia.org/wiki/Sistema_Financeiro_Nacional" target="_blank" rel="noreferrer" style={{ color: theme.link }}>Sistema Financeiro Nacional (Brasil)</a></li>
                <li><a href="https://pt.wikipedia.org/wiki/Desintermedia%C3%A7%C3%A3o_financeira" target="_blank" rel="noreferrer" style={{ color: theme.link }}>Desintermediação financeira</a></li>
                <li><a href="https://pt.wikipedia.org/wiki/Comiss%C3%A3o_de_Valores_Mobili%C3%A1rios" target="_blank" rel="noreferrer" style={{ color: theme.link }}>Comissão de Valores Mobiliários (CVM)</a></li>
                <li><a href="https://pt.wikipedia.org/wiki/Cr%C3%A9dito_privado" target="_blank" rel="noreferrer" style={{ color: theme.link }}>Crédito privado no Brasil</a></li>
              </ul>
            </div>

            {/* Section 7: Referências */}
            <div id="referencias" style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontFamily: 'Linux Libertine, Georgia, Times, serif',
                fontSize: '1.45rem',
                borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
                paddingBottom: '0.25rem',
                margin: '1.5rem 0 0.75rem 0'
              }}>
                7 Referências
              </h2>
              <ol style={{ paddingLeft: '1.5rem', fontSize: '0.82rem', lineHeight: '1.6', color: darkMode ? '#8B949E' : '#54595D' }}>
                <li id="ref-1">
                  ↑ <span style={{ color: theme.text }}>Receita Federal do Brasil &amp; Junta Comercial do Estado de São Paulo (JUCESP). <em>Comprovante de Inscrição e de Situação Cadastral: MOURATO E ASSOCIADOS LTDA. CNPJ: 38.377.738/0001-45</em>. Consultado em 19 de outubro de 2026.</span>
                </li>
                <li id="ref-2">
                  ↑ <span style={{ color: theme.text }}>Banco Central do Brasil. <em>Sistema de Informações de Crédito (SCR) – Resoluções CMN e Circular Bacen sobre registro de operações financeiras</em>. Brasília, DF.</span>
                </li>
                <li id="ref-3">
                  ↑ <span style={{ color: theme.text }}>Comissão de Valores Mobiliários (CVM). <em>Resolução CVM nº 175: Marco Regulatório dos Fundos de Investimento (FIDCs e Crédito Estruturado)</em>. Rio de Janeiro.</span>
                </li>
              </ol>
            </div>

            {/* Section 8: Ligações Externas */}
            <div id="ligacoes-externas" style={{ marginBottom: '2.5rem' }}>
              <h2 style={{
                fontFamily: 'Linux Libertine, Georgia, Times, serif',
                fontSize: '1.45rem',
                borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
                paddingBottom: '0.25rem',
                margin: '1.5rem 0 0.75rem 0'
              }}>
                8 Ligações externas
              </h2>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                <li>
                  <a href="/" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ color: theme.link, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    Sítio oficial de Mourato &amp; Associados
                    <ExternalLink size={12} />
                  </a>
                </li>
              </ul>
            </div>

            {/* Wikipedia Category Box */}
            <div style={{
              background: theme.tagBg,
              border: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
              padding: '0.5rem 0.85rem',
              fontSize: '0.78rem',
              marginTop: '2rem'
            }}>
              <strong><a href="#categorias" style={{ color: theme.link }}>Categorias</a>:</strong>{' '}
              <a href="#cat1" style={{ color: theme.link }}>Empresas de consultoria financeira do Brasil</a>{' '}·{' '}
              <a href="#cat2" style={{ color: theme.link }}>Empresas fundadas em 2020</a>{' '}·{' '}
              <a href="#cat3" style={{ color: theme.link }}>Mercado de capitais do Brasil</a>{' '}·{' '}
              <a href="#cat4" style={{ color: theme.link }}>Empresas de São Paulo (cidade)</a>{' '}·{' '}
              <a href="#cat5" style={{ color: theme.link }}>Reorganização societária e finanças corporativas</a>
            </div>

          </div>

          {/* RIGHT: Classic Wikipedia Infobox */}
          <aside style={{
            background: theme.infoboxBg,
            border: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
            fontSize: '0.82rem',
            width: '100%',
            maxWidth: '340px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            {/* Infobox Header */}
            <div style={{
              background: theme.infoboxHeader,
              padding: '0.6rem 0.75rem',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '1rem',
              borderBottom: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
              fontFamily: 'Linux Libertine, Georgia, Times, serif'
            }}>
              Mourato &amp; Associados Ltda.
            </div>

            {/* Infobox Logo Container */}
            <div style={{
              padding: '1.25rem',
              textAlign: 'center',
              background: darkMode ? '#0D1117' : '#FFFFFF',
              borderBottom: `1px solid ${darkMode ? '#30363D' : '#EAECF0'}`
            }}>
              <img 
                src="/mourato-seal-circle.png" 
                alt="Brasão Oficial Mourato & Associados" 
                style={{
                  width: '110px',
                  height: '110px',
                  objectFit: 'contain',
                  borderRadius: '50%',
                  margin: '0 auto',
                  display: 'block'
                }}
              />
              <div style={{ fontSize: '0.72rem', color: darkMode ? '#8B949E' : '#72777D', marginTop: '0.65rem' }}>
                Marca e insígnia institucional da sociedade.
              </div>
            </div>

            {/* Infobox Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${darkMode ? '#21262D' : '#EAECF0'}` }}>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', width: '38%', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>Tipo</th>
                  <td style={{ padding: '0.5rem 0.65rem' }}>Sociedade Empresária Limitada</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${darkMode ? '#21262D' : '#EAECF0'}` }}>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>Gênero</th>
                  <td style={{ padding: '0.5rem 0.65rem' }}>Consultoria Financeira, Mercado de Capitais e Perícia de Crédito</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${darkMode ? '#21262D' : '#EAECF0'}` }}>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>Fundação</th>
                  <td style={{ padding: '0.5rem 0.65rem' }}>8 de setembro de 2020 (6 anos)</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${darkMode ? '#21262D' : '#EAECF0'}` }}>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>Sede</th>
                  <td style={{ padding: '0.5rem 0.65rem' }}>
                    Avenida São Luís, 187, República<br />
                    São Paulo — SP, Brasil<br />
                    <span style={{ fontSize: '0.72rem', color: '#72777D' }}>CEP: 01046-001</span>
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${darkMode ? '#21262D' : '#EAECF0'}` }}>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>Área servida</th>
                  <td style={{ padding: '0.5rem 0.65rem' }}>Brasil (Atuação Nacional)</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${darkMode ? '#21262D' : '#EAECF0'}` }}>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>Produtos e Serviços</th>
                  <td style={{ padding: '0.5rem 0.65rem' }}>
                    • Compressão de Spread Bancário<br />
                    • Emissão de CRI, CRA, Debêntures<br />
                    • Antecipação via FIDC de Atacado<br />
                    • Auditoria SCR Sisbacen e Birôs<br />
                    • Holdings e Reestruturação Societária
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${darkMode ? '#21262D' : '#EAECF0'}` }}>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>CNPJ</th>
                  <td style={{ padding: '0.5rem 0.65rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    38.377.738/0001-45
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${darkMode ? '#21262D' : '#EAECF0'}` }}>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>NIRE (JUCESP)</th>
                  <td style={{ padding: '0.5rem 0.65rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    35270804594
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${darkMode ? '#21262D' : '#EAECF0'}` }}>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>Slogan</th>
                  <td style={{ padding: '0.5rem 0.65rem', fontStyle: 'italic', color: darkMode ? '#D29922' : '#B45309' }}>
                    "Qualidade · Confiança · Excelência"
                  </td>
                </tr>
                <tr>
                  <th style={{ padding: '0.5rem 0.65rem', verticalAlign: 'top', fontWeight: 700, color: darkMode ? '#C9D1D9' : '#202122' }}>Sítio oficial</th>
                  <td style={{ padding: '0.5rem 0.65rem' }}>
                    <a href="/" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ color: theme.link, wordBreak: 'break-all' }}>
                      mouratoassociados.com.br
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </aside>

        </div>

        {/* Wikipedia Footer */}
        <footer style={{
          borderTop: `1px solid ${darkMode ? '#30363D' : '#A2A9B1'}`,
          paddingTop: '1.25rem',
          marginTop: '3rem',
          fontSize: '0.75rem',
          color: darkMode ? '#8B949E' : '#72777D',
          lineHeight: '1.6'
        }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            Esta página foi editada pela última vez às 17:15 de 19 de outubro de 2026 (UTC).
          </p>
          <p style={{ margin: 0 }}>
            Este texto é disponibilizado nos termos da licença Atribuição-CompartilhaIgual 4.0 Internacional (CC BY-SA 4.0) da Creative Commons; pode estar sujeito a condições adicionais. Para mais detalhes, consulte as Condições de Utilização.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ color: theme.link, cursor: 'pointer' }}>Política de privacidade</span>
            <span style={{ color: theme.link, cursor: 'pointer' }}>Sobre a Wikipédia</span>
            <span style={{ color: theme.link, cursor: 'pointer' }}>Avisos gerais</span>
            <span style={{ color: theme.link, cursor: 'pointer' }}>Código de conduta</span>
            <span style={{ color: theme.link, cursor: 'pointer' }}>Versão móvel</span>
          </div>
        </footer>

      </div>
    </div>
  );
};
