# DIRETRIZES FUNDAMENTAIS DO PROJETO: MOURATO & ASSOCIADOS

Este arquivo estabelece as regras mandatórias de operação, isolamento de contexto e segurança para todos os agentes de IA neste workspace.

---

## 1. LEI FUNDAMENTAL INEGOCIÁVEL: ZERO DADOS INVENTADOS (REGRA DO ZERO)

> [!CAUTION]
> **LEI FUNDAMENTAL SUPREMA DE DADOS:**
> **NUNCA**, sob qualquer hipótese, informar dados que não existem sem os relatórios e documentos oficiais para conferi-los.
> - **Proibição Absoluta de Suposições:** Nunca salvar ou inventar histórico, estimativas de capital social, scores artificiais ou valores fictícios.
> - **A Regra do 0:** Se não houver documento comprobatório real anexado para conferência de qualquer campo (seja financeiro, societário, cadastral ou de birô), **A RESPOSTA É OBRIGATORIAMENTE 0 OU EM BRANCO**.
> - **Auditoria Pericial:** Todo e qualquer dado cadastrado deve ter lastro em arquivo físico conferido (PDF de birô, CND, certidão, extrato ou contrato).

---

## 2. REGRA DE ISOLAMENTO ESTRITO DE PROJETO (ANTI-CONTAMINAÇÃO)

- **Escopo Exclusivo:** O ambiente ativo é restrito unicamente a `c:\Teia de arranha\Mourato.associados`.
- **Proibição de Mistura:** É terminantemente proibido misturar código, configurações ou lógicas de outros projetos fora do ecossistema.
- **Terminal e Comandos:** Qualquer comando (`npm`, `node`, `git`, `powershell`) DEVE obrigatoriamente ser executado com o diretório de trabalho apontando para `c:\Teia de arranha\Mourato.associados`.

---

## 3. ARQUITETURA CANÔNICA DE PASTAS DO ECOSSISTEMA TEIA DE ARANHA

A raiz de `C:\Teia de arranha\` possui divisão estrita e padronizada:
- `Robo/`: Cérebro do robô (motores de automação, scripts, `LINKS_PARA_USO.md`, serviços).
- `ClientesPJ/[EMPRESA]_[CNPJ]/`: Dossiês exclusivos PJ com dados, senhas, scores e documentos.
- `ClientesPF/[CLIENTE]_[CPF]/`: Dossiês exclusivos PF com dados, senhas, scores e documentos.
- `Outros_Arquivos_PDF/`: Laudos periciais gerais, modelos e petições avulsas.
- `Mourato.associados/`: O portal web da plataforma.

---

## 4. REGRA DE OURO MANDATÓRIA: GERAÇÃO AUTOMÁTICA DE PDF (PF E PJ) PÓS-ANÁLISE

> [!IMPORTANT]
> **OBRIGAÇÃO PÓS-ANÁLISE:** Sempre, sem qualquer exceção, após terminar o cadastro ou uma análise pericial/de birôs de qualquer cliente, o assistente **DEVE OBRIGATORIAMENTE GERAR O ARQUIVO PDF DE ALTA DEFINIÇÃO TANTO DA FICHA PF QUANTO DA FICHA PJ** e salvá-los diretamente em suas respectivas pastas:
> - `C:\Teia de arranha\ClientesPF\[NOME_CPF]\FICHA_CADASTRAL_E_SENHAS.pdf`
> - `C:\Teia de arranha\ClientesPJ\[EMPRESA_CNPJ]\FICHA_CADASTRAL_E_SENHAS.pdf`
>
> O PDF deve ser disponibilizado com link direto e aberto para que o usuário possa **avaliar e validar imediatamente**.

---

## 5. REGRA SUPREMA DE IDENTIDADE VISUAL: CABEÇALHO PADRÃO MOURATO & MARCA D'ÁGUA EM TODOS OS DOCUMENTOS

> [!CAUTION]
> **PADRÃO GRÁFICO OBRIGATÓRIO EM 100% DOS DOCUMENTOS:**
> **TODO E QUALQUER DOCUMENTO**, relatório pericial, ficha cadastral, laudo EVE, dossiê, notificação, minuta ou petição gerada no ecossistema Mourato & Associados / Teia de Aranha **DEVE OBRIGATORIAMENTE SER SALVO COM:**
>
> 1. **Cabeçalho Institucional Modelo Padrão Mourato & Associados:**
>    - Brasão Oficial em Alta Definição (`mourato-seal-circle.png`).
>    - Tipografia Oficial: `MOURATO & ASSOCIADOS` em estilo serifado nobre (Cinzel / Georgia), com o caractere `&` em Dourado Primário (`#C5A869`).
>    - Subtítulo Institucional: `ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA` ou `QUALIDADE • CONFIANÇA • EXCELÊNCIA` em caixa alta e espaçamento ampliado.
>    - Barra divisória dourada acompanhada dos metadados corporativos (CNPJ: `38.377.738/0001-45` • Sede: `Av. São Luís, 187, República, São Paulo/SP`).
>
> 2. **Marca d'Água Oficial Centralizada (Watermark):**
>    - O Brasão/Selo Oficial da Mourato posicionado no centro geométrico de cada página em marca d'água elegante com opacidade calibrada entre `4%` e `7%` (`opacity: 0.05`), de forma imponente, porém permitindo a leitura cristalina dos dados.
>
> 3. **Rodapé de Segurança & Autenticidade:**
>    - Informações de conformidade com a LGPD, data/hora de emissão e hash/código de autenticidade local.

---

## 6. INTEGRAÇÃO AUTORIZADA: SISTEMA TEIA DE ARANHA

- **Ponte de Dados:** A base de inteligência externa está em `C:\Projetos\Empreas\data\fichas_cadastrais_db.json`.
- **Mecanismo de Sincronização:** Todas as atualizações cadastrais e periciais devem ser canalizadas pelo script:
  `node scripts/sync_from_teia.mjs`
  alimentando o banco oficial do portal em `src/data/teiaDatabase.js`.

---

## 7. MODO DE OPERAÇÃO: AUTONOMIA MÁXIMA (AUTORIZAÇÃO PERMANENTE DE HESIUEL)

- **Autorização Prévia e Ampla:** O assistente (Antigravity) tem autorização permanente de Hesiuel para agir de ponta a ponta sem pedir validações intermediárias ou permissão para passos operacionais óbvios.
- **Ciclo Autônomo:** Planejar -> Implementar cirurgicamente nos arquivos -> Validar compilação (`npm run build`) -> Enviar para repositórios (`git push origin main` e `git push prod main`).
