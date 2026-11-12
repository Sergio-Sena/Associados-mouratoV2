# DIRETRIZES FUNDAMENTAIS DO PROJETO: MOURATO & ASSOCIADOS

Este arquivo estabelece as regras mandatórias de operação, isolamento de contexto e segurança para todos os agentes de IA neste workspace.

---

## 1. REGRA DE ISOLAMENTO ESTRITO DE PROJETO (ANTI-CONTAMINAÇÃO)

- **Escopo Exclusivo:** O ambiente ativo é restrito unicamente a `c:\Teia de arranha\Mourato.associados`.
- **Proibição de Mistura:** É terminantemente proibido misturar código, configurações ou lógicas de outros projetos fora do ecossistema.
- **Terminal e Comandos:** Qualquer comando (`npm`, `node`, `git`, `powershell`) DEVE obrigatoriamente ser executado com o diretório de trabalho apontando para `c:\Teia de arranha\Mourato.associados`.

---

## 2. ARQUITETURA CANÔNICA DE PASTAS DO ECOSSISTEMA TEIA DE ARANHA

A raiz de `C:\Teia de arranha\` possui divisão estrita e padronizada:
- `Robo/`: Cérebro do robô (motores de automação, scripts, `LINKS_PARA_USO.md`, serviços).
- `ClientesPJ/[EMPRESA]_[CNPJ]/`: Dossiês exclusivos PJ com dados, senhas, scores e documentos.
- `ClientesPF/[CLIENTE]_[CPF]/`: Dossiês exclusivos PF com dados, senhas, scores e documentos.
- `Outros_Arquivos_PDF/`: Laudos periciais gerais, modelos e petições avulsas.
- `Mourato.associados/`: O portal web da plataforma.

---

## 3. REGRA DE OURO MANDATÓRIA: GERAÇÃO AUTOMÁTICA DE PDF (PF E PJ) PÓS-ANÁLISE

> [!IMPORTANT]
> **OBRIGAÇÃO PÓS-ANÁLISE:** Sempre, sem qualquer exceção, após terminar o cadastro ou uma análise pericial/de birôs de qualquer cliente, o assistente **DEVE OBRIGATORIAMENTE GERAR O ARQUIVO PDF DE ALTA DEFINIÇÃO TANTO DA FICHA PF QUANTO DA FICHA PJ** e salvá-los diretamente em suas respectivas pastas:
> - `C:\Teia de arranha\ClientesPF\[NOME_CPF]\FICHA_CADASTRAL_E_SENHAS.pdf`
> - `C:\Teia de arranha\ClientesPJ\[EMPRESA_CNPJ]\FICHA_CADASTRAL_E_SENHAS.pdf`
>
> O PDF deve ser disponibilizado com link direto e aberto para que o usuário possa **avaliar e validar imediatamente**.

---

## 4. INTEGRAÇÃO AUTORIZADA: SISTEMA TEIA DE ARANHA

- **Ponte de Dados:** A base de inteligência externa está em `C:\Projetos\Empreas\data\fichas_cadastrais_db.json`.
- **Mecanismo de Sincronização:** Todas as atualizações cadastrais e periciais devem ser canalizadas pelo script:
  `node scripts/sync_from_teia.mjs`
  alimentando o banco oficial do portal em `src/data/teiaDatabase.js`.
- **Integridade Cadastral & Fidelidade Real:** NUNCA inventar dados financeiros, valores de balanço, scores ou números periciais. Se não houver comprovação documental, o campo deve permanecer estritamente em branco ou sinalizado como pendente.

---

## 5. MODO DE OPERAÇÃO: AUTONOMIA MÁXIMA (AUTORIZAÇÃO PERMANENTE DE HESIUEL)

- **Autorização Prévia e Ampla:** O assistente (Antigravity) tem autorização permanente de Hesiuel para agir de ponta a ponta sem pedir validações intermediárias ou permissão para passos operacionais óbvios.
- **Ciclo Autônomo:** Planejar -> Implementar cirurgicamente nos arquivos -> Validar compilação (`npm run build`) -> Enviar para repositórios (`git push origin main` e `git push prod main`).
