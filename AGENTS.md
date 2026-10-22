# DIRETRIZES FUNDAMENTAIS DO PROJETO: MOURATO & ASSOCIADOS

Este arquivo estabelece as regras mandatórias de operação, isolamento de contexto e segurança para todos os agentes de IA neste workspace.

---

## 1. REGRA DE ISOLAMENTO ESTRITO DE PROJETO (ANTI-CONTAMINAÇÃO)

- **Escopo Exclusivo:** O ambiente ativo é restrito unicamente a `c:\Projetos\Mourato.associados`.
- **Proibição de Mistura:** É terminantemente proibido misturar código, configurações, históricos de comandos ou lógicas de outros projetos (como `Troll_BDO`, `Melhoria`, `NasciEmOutroIdioma`, `AtacadoPY`, etc.).
- **Abas do Editor:** Se houver abas abertas no editor apontando para outros projetos fora deste diretório, o agente deve **ignorá-las completamente** e focar unicamente nos arquivos deste repositório.
- **Terminal e Comandos:** Qualquer comando (`npm`, `node`, `git`, `powershell`) DEVE obrigatoriamente ser executado com o diretório de trabalho (`Cwd`) apontando para `c:\Projetos\Mourato.associados`.

---

## 2. INTEGRAÇÃO AUTORIZADA: SISTEMA TEIA DE ARANHA

- **Ponte de Dados:** A única fonte de dados externa permitida para este projeto é a base de inteligência do **Teia de Aranha**, localizada em:
  `C:\Projetos\Empreas\data` (notadamente `fichas_cadastrais_db.json` e os relatórios dos birôs de crédito).
- **Mecanismo de Sincronização:** Todas as atualizações cadastrais e periciais devem ser canalizadas pelo script:
  `node scripts/sync_from_teia.mjs`
  alimentando o banco oficial do portal em `src/data/teiaDatabase.js`.
- **Integridade Cadastral:** Preservar a consistência dos dados de Pessoas Físicas (PF) e Jurídicas (PJ), scores dos birôs (Serasa, Boa Vista, Quod, SCR Bacen) e petições periciais.

---

## 3. PADRÃO OPERACIONAL: CÓDIGO + VISÃO REAL (ROBÔ)

1. **Velocidade e Precisão (Código Direto):**
   - Alterações de código, correções de lógica, cálculos financeiros e manipulação de estado devem ser feitas cirurgicamente nos arquivos e validadas via `npm run build` ou testes unitários.
2. **Validação Visual (Interface):**
   - Para checar telas, responsividade e layout (Ficha Cadastral, Modais, Birôs), o servidor local Vite (`npm run dev`) deve estar ativo na porta `5173`.
   - Scripts de teste do Playwright (`scripts/test_*.mjs`) só devem ser disparados com o servidor ativo para evitar erros de conexão (`ERR_CONNECTION_REFUSED`).

---

## 4. PADRÕES TÉCNICOS DO PROJETO

- **Stack:** React 19 + Vite + Lucide React + Tailwind/CSS nativo.
- **Identidade Visual:** Paleta escura premium (#0b0b0b, dourado ouro #d4af37, azul executivo #1e3a8a, cinza platina).
- **Segurança:** Autenticação local para painéis restritos de birô e proteção de dados sensíveis (LGPD).
