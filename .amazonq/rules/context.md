# context.md — Associados-mouratoV2

## Stack
- React 19 + Vite 8
- Lucide React (ícones)
- CSS puro com design system em `src/index.css` (variáveis CSS custom)
- Sem roteador — SPA single-page com scroll navigation via `document.getElementById`

## Arquitetura
- `src/components/` — todos os componentes de seção e modais
- `src/data/` — dados estáticos (companyData.js, modulesData.js)
- `src/index.css` — design system completo (tokens, utilitários, grid, botões, header, modal)
- `src/App.css` — reservado para estilos específicos de app (atualmente vazio)
- Assets públicos em `/public/` (logo, seal)

## Componentes principais
| Componente | Seção |
|---|---|
| Header | Sticky top nav com top bar institucional |
| HeroSection | Seção hero com selo, headline e 3 cards de prática |
| SpreadVsConsultoriaSpectrum | Espectro interativo spread ↔ consultoria |
| SpreadOperationsModule | Módulo de mercado de capitais |
| ConsultingModule | Módulo de consultoria estratégica |
| InteractiveSimulator | Simulador de economia de spread |
| GovernanceCompliance | Governança, compliance e certidão JUCESP |
| AdvisoryOnboardingModal | Modal de agendamento de audiência |
| ClientManagementModal | Modal de login / área do cliente |
| Footer | Rodapé institucional |

## Correções aplicadas (sessão 2025-07)
- Removido padding inline conflitante do `header-inner` (sobrescrevia o CSS)
- Alinhado padding do top bar com o main bar (ambos `1.75rem` horizontal)
- Reduzidos espaçamentos excessivos da HeroSection: padding de seção `5rem→3rem`, marginBottom do selo `2.5rem→1.5rem`, marginBottom dos CTAs `4.5rem→3rem`
- Limpo `App.css` (removido lixo do template padrão Vite)
- Ajustado `.header-inner` padding de `0.85rem→0.75rem` vertical
- Header reescrito com scroll-aware (compacta ao rolar >48px), active state via IntersectionObserver, logo em linha única, menu hamburger + drawer mobile
- Top bar some ao rolar (scroll-aware), separador gold sutil `rgba(197,168,105,0.08)`
- Adicionados: `.header-topbar`, `.header-brand`, `.header-seal`, `.btn-hamburger`, `.mobile-drawer`, `.mobile-drawer-inner`, `.mobile-nav-btn`, `.btn-sm`

## Refinamentos (sessão 2025-07 — UI Premium & Mobile)
- **Footer reescrito**: grid assimétrico, títulos Cinzel + linha gold, links com seta animada, botão outline gold, ícones MapPin/Shield, visibilidade de textos aumentada (`#94A3B8`)
- **Header brand**: nome em linha única, tagline `QUALIDADE • CONFIANÇA • EXCELÊNCIA`, logo `42px`
- **Header mobile**: Login/Audiência Privada ocultos no mobile, hamburger visível, drawer com botão X explícito, body scroll travado
- **Tipografia**: 3 fontes — Cinzel (títulos) + Cormorant Garamond (corpo) + DM Sans (UI); base `17px`/`1.75`
- **CSS**: `--font-body` adicionado ao design system, `font-family` explícito em botões/nav/badges
- **Adicionados**: `.mobile-drawer-close`, `.mobile-drawer-close:hover`

## Deploy & Infraestrutura

### Repositórios
| Projeto | Repo Original | Fork (Produção) | Hosting | Domínio |
|---|---|---|---|---|
| Associados-mourato | `mouratoimportacao-cloud/Associados-mourato` | `Sergio-Sena/Associados-mouratoV2` | AWS Amplify (`d3309gx1hqzwt1`) | `mouratoassociados.com.br` |
| y7-service | `mouratoimportacao-cloud/y7-service` | `Sergio-Sena/y7-service` | AWS Amplify (`d3pgghxxzqjef5`) | `y7service.com.br` |

### Branches
- `dev` — desenvolvimento e testes (GitHub Actions valida)
- `main` — produção (Amplify dispara deploy automático em ~2-3 min)

### Fluxo
1. Desenvolver em `dev` → push → GitHub Actions valida (`npm ci` → `lint` → `build` → `dist/`)
2. Merge `dev` → `main` no repo original
3. Sergio Sena sincroniza fork (`git fetch upstream && git merge upstream/main`) → Amplify deploya

### Regras
- Nunca fazer push direto em `main`
- Sincronizar antes de começar: `git fetch upstream && git merge upstream/dev`
- Commit messages semânticas: `feat:`, `fix:`, `docs:`, etc.
- Sem force push

### Persistência de dados
- `ClientManagementModal` salva no `localStorage` (5 chaves: clientes, despesas, agendamentos, recebíveis, config Mercado Pago)
- `AdvisoryOnboardingModal` envia leads via `POST` para `VITE_API_URL/leads` — sem fallback local
- Supabase **não está integrado** neste projeto — pertence ao y7-service

## Padrões visuais
- Fonte serif: Cinzel (títulos)
- Fonte sans: Plus Jakarta Sans (corpo)
- Paleta: dark navy (`#0A0D14`) + champagne gold (`#C5A869`)
- Cards: glass morphism com `backdrop-filter: blur(14px)`
- Botões: `btn-primary-gold` (dourado) e `btn-secondary-subtle` (ghost)
