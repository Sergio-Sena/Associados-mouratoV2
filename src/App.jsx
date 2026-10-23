import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { SpreadVsConsultoriaSpectrum } from './components/SpreadVsConsultoriaSpectrum';
import { SpreadOperationsModule } from './components/SpreadOperationsModule';
import { ConsultingModule } from './components/ConsultingModule';
import { CreditBureauSection } from './components/CreditBureauSection';
import { InteractiveSimulator } from './components/InteractiveSimulator';
import { GovernanceCompliance } from './components/GovernanceCompliance';
import { AdvisoryOnboardingModal } from './components/AdvisoryOnboardingModal';
import { ClientManagementModal } from './components/ClientManagementModal';
import { OnboardingModal } from './components/OnboardingModal';
import { FichaCadastralStandalone } from './components/FichaCadastralStandalone';
import { WikipediaArticle } from './components/WikipediaArticle';
import { Footer } from './components/Footer';
import { ArrowUpRight } from 'lucide-react';

export function App() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState('native');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientModalInitialView, setClientModalInitialView] = useState('leads');

  const rawPath = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
  const cleanPath = rawPath.replace(/\/+$/, '') || '/';
  const path = cleanPath;
  const search = typeof window !== 'undefined' ? window.location.search.toLowerCase() : '';
  const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';

  const isWikipediaRoute = 
    cleanPath === '/wikipedia' || 
    cleanPath === '/wiki' || 
    cleanPath === '/wikipedia.html' || 
    cleanPath === '/sobre/wikipedia' ||
    cleanPath.startsWith('/wikipedia') ||
    cleanPath.startsWith('/wiki') ||
    search.includes('view=wikipedia') || 
    search.includes('wiki=true') ||
    hash === '#wikipedia' ||
    hash === '#wiki';

  const [isWikiOpen, setIsWikiOpen] = useState(isWikipediaRoute);

  const isDirectFichaRoute = 
    cleanPath === '/ficha-cadastral' || 
    cleanPath.startsWith('/ficha-cadastral') ||
    cleanPath === '/ficha' ||
    cleanPath.startsWith('/ficha/') ||
    cleanPath === '/onboarding' || 
    cleanPath.startsWith('/onboarding') ||
    cleanPath === '/cadastro' ||
    cleanPath.startsWith('/cadastro') ||
    search.includes('standalone=true') ||
    search.includes('confirmar=true') ||
    search.includes('confirmacao=true') ||
    search.includes('ficha=true') ||
    hash === '#ficha' ||
    hash === '#confirmar';

  const isLegacyStoreRoute = 
    path.startsWith('/produto') ||
    path.startsWith('/perfume') ||
    path.startsWith('/fragrancia') ||
    path.startsWith('/cosmetico') ||
    path.startsWith('/marca') ||
    path.startsWith('/categoria') ||
    path.startsWith('/carrinho') ||
    path.startsWith('/cart') ||
    path.startsWith('/checkout') ||
    path.startsWith('/loja') ||
    path.startsWith('/shop') ||
    search.includes('perfume') ||
    search.includes('cosmetico') ||
    search.includes('produto');

  // Purga e desindexacao imediata de URLs legadas de e-commerce / perfumaria no Google e Bing
  useEffect(() => {
    if (isLegacyStoreRoute) {
      let meta = document.querySelector('meta[name="robots"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'robots';
        document.head.appendChild(meta);
      }
      meta.content = 'noindex, nofollow, noarchive, nosnippet';
      document.title = '410 - Conteúdo Descontinuado | Mourato & Associados';
    }
  }, [isLegacyStoreRoute]);

  // Abre automaticamente o Birô de Crédito caso solicitado na URL (?view=bureau ou #bureau)
  useEffect(() => {
    const s = window.location.search.toLowerCase();
    const h = window.location.hash.toLowerCase();
    if (s.includes('view=bureau') || s.includes('bureau=true') || h === '#bureau' || h === '#biros-admin') {
      setClientModalInitialView('bureau_scores');
      setIsClientModalOpen(true);
    }
  }, []);



  // Abre automaticamente caso a URL contenha parâmetros ou hash de onboarding/ficha em modal
  useEffect(() => {
    const s = window.location.search.toLowerCase();
    const h = window.location.hash.toLowerCase();
    if (!isDirectFichaRoute && (s.includes('onboarding') || h === '#onboarding')) {
      if (s.includes('iframe') || h.includes('iframe')) {
        setOnboardingMode('iframe');
      }
      setIsOnboardingOpen(true);
    }
  }, [isDirectFichaRoute]);

  const handleOpenLogin = () => {
    setClientModalInitialView('leads');
    setIsClientModalOpen(true);
  };

  const handleOpenOnboarding = (mode = 'native') => {
    setOnboardingMode(mode);
    setIsOnboardingOpen(true);
  };

  const handleNavigate = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // PÁGINA ENCICLOPÉDICA: Visão de Artigo Oficial na Wikipédia (/wikipedia ou #wikipedia)
  if (isWikiOpen || isWikipediaRoute) {
    return (
      <WikipediaArticle 
        onBack={() => {
          setIsWikiOpen(false);
          if (window.location.hash.includes('wiki') || window.location.search.includes('wiki') || window.location.pathname.includes('wiki')) {
            window.history.pushState({}, '', '/');
          }
        }} 
      />
    );
  }

  // ROTA DEDICADA DIRETA: Link oficial para o cliente no celular ou computador (/ficha-cadastral)
  if (isDirectFichaRoute) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 'clamp(1rem, 2.5vw, 2.5rem) clamp(0.5rem, 2vw, 1rem) 3rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '1080px', width: '100%', margin: '0 auto' }}>
          <FichaCadastralStandalone 
            isFullPage={true} 
            defaultMode={search.includes('iframe') ? 'iframe' : 'native'} 
          />
        </div>
      </div>
    );
  }

  // RESPOSTA DE PURGA E DESINDEXAÇÃO DEFINITIVA (410 GONE) PARA ROTAS LEGADAS DE E-COMMERCE / PERFUMARIA
  if (isLegacyStoreRoute) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0A0F1D)', color: '#F8FAFC', padding: '4rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '640px', width: '100%', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'inline-flex', padding: '0.6rem 1.2rem', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
            STATUS 410: CONTEÚDO DEFINITIVAMENTE EXCLUÍDO (GONE)
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', color: '#FFFFFF', marginBottom: '1rem', lineHeight: 1.3 }}>
            Página de E-commerce / Cosméticos Descontinuada
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Aviso formal aos robôs de busca (Googlebot, Bingbot) e usuários: as antigas páginas de produtos de perfumaria, cosméticos ou e-commerce foram definitivamente descontinuadas e excluídas deste domínio.
          </p>
          <div style={{ background: 'rgba(30, 58, 138, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: '10px', padding: '1.25rem', marginBottom: '2rem', textAlign: 'left', fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.5 }}>
            <strong style={{ color: '#F59E0B', display: 'block', marginBottom: '0.35rem' }}>Titularidade Exclusiva do Domínio:</strong>
            <strong>Mourato & Associados Ltda</strong> (CNPJ: 38.377.738/0001-45). Atividade exclusiva em Assessoria Corporativa, Otimização de Spread Bancário, Reabilitação de Crédito Pericial e Consultoria Financeira. Não comercializamos bens de consumo ou perfumes.
          </div>
          <a 
            href="/"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.9rem 2.2rem', background: '#D97706', color: '#0F172A', fontWeight: 'bold', borderRadius: '8px', textDecoration: 'none', fontSize: '0.92rem', transition: 'all 0.2s' }}
          >
            Acessar Plataforma Oficial Mourato & Associados
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Institutional Header */}
      <Header 
        onNavigate={handleNavigate}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenLogin={handleOpenLogin}
        onOpenOnboarding={() => handleOpenOnboarding('native')}
        onOpenWiki={() => setIsWikiOpen(true)}
      />

      <main style={{ flex: 1 }}>
        
        {/* Hero Section */}
        <div id="hero">
          <HeroSection 
            onNavigate={handleNavigate}
            onOpenContact={() => setIsContactOpen(true)}
            onOpenOnboarding={() => handleOpenOnboarding('native')}
          />
        </div>

        {/* The Core Spectrum: Spread à Consultoria */}
        <SpreadVsConsultoriaSpectrum 
          onNavigateToSimulator={() => handleNavigate('simulador')}
          onOpenContact={() => setIsContactOpen(true)}
        />

        {/* Practice I: Capital Markets & Spread */}
        <SpreadOperationsModule 
          onOpenContact={() => setIsContactOpen(true)}
        />

        {/* Practice II: Strategic Advisory & Consulting */}
        <ConsultingModule 
          onOpenContact={() => setIsContactOpen(true)}
        />

        {/* Practice III: Birôs de Crédito & Reabilitação de Rating (PF & PJ) */}
        <CreditBureauSection 
          onOpenContact={() => setIsContactOpen(true)}
          onOpenOnboarding={() => handleOpenOnboarding('native')}
        />

        {/* Interactive Financial Simulator */}
        <InteractiveSimulator 
          onOpenContact={() => setIsContactOpen(true)}
        />

        {/* Governance & Compliance */}
        <GovernanceCompliance />

        {/* Bottom Call to Action */}
        <section style={{
          padding: '5rem 0',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(197, 168, 105, 0.06) 0%, transparent 70%)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}>
          <div className="container-xl" style={{ maxWidth: '720px' }}>
            <span className="badge-institutional" style={{ marginBottom: '1rem' }}>
              ATENDIMENTO EXCLUSIVO
            </span>
            <h2 style={{ marginBottom: '1rem', color: '#FFFFFF' }}>
              Inicie um Diálogo Estratégico com Nossos Sócios
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: '2.5rem' }}>
              Seja para repactuar o spread das suas operações de crédito ou estruturar a governança societária da sua companhia, agende uma reunião reservada sob termo de confidencialidade.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                className="btn-primary-gold"
                onClick={() => setIsContactOpen(true)}
                style={{ padding: '0.95rem 2.2rem', fontSize: '0.92rem' }}
              >
                Agendar Conversa Reservada
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer 
        onNavigate={handleNavigate}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenOnboarding={() => handleOpenOnboarding('native')}
        onOpenWiki={() => setIsWikiOpen(true)}
      />

      {/* Modal de Agendamento Executivo */}
      <AdvisoryOnboardingModal 
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      {/* Modal Oficial de Atualização Cadastral & Onboarding (Opção A + Opção B) */}
      <OnboardingModal 
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        defaultMode={onboardingMode}
      />

      {/* Portal de Gestão de Clientes & Contas (Acesso Restrito / Login) */}
      <ClientManagementModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        initialView={clientModalInitialView}
      />

    </div>
  );
}

export default App;
