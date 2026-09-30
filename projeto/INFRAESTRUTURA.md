# Infraestrutura e Fluxo de Trabalho — Associados-mouratoV2

## Visão Geral

Site institucional/plataforma da Mourato & Associados hospedado na AWS Amplify.

- **URL produção:** https://mouratoassociados.com.br
- **Deploy:** AWS Amplify (automático no push para `main`)
- **Região:** us-east-1 (Norte da Virgínia)
- **App ID Amplify:** d3309gx1hqzwt1

---

## Repositórios

| Repo | Dono | Finalidade |
|------|------|-----------|
| `mouratoimportacao-cloud/Associados-mourato` | Hesuel2 | Repo original — desenvolvimento principal |
| `Sergio-Sena/Associados-mouratoV2` | Sergio Sena | Fork — conectado ao Amplify, vai para produção |

---

## Tech Stack

- **Framework:** Vite + React 19
- **Linguagem:** TypeScript
- **Build:** `npm run build` → diretório `dist/`
- **Deploy:** AWS Amplify (Hosting estático)
- **Domínio:** Route 53 + certificado SSL gerenciado pelo Amplify

---

## Configuração Local

```bash
git clone https://github.com/Sergio-Sena/Associados-mouratoV2.git
cd Associados-mouratoV2
git remote add upstream https://github.com/mouratoimportacao-cloud/Associados-mourato.git
npm install
npm run dev
```

---

## Fluxo de Trabalho

### Quando Hesuel2 atualizar o repo original:
```bash
git fetch upstream
git merge upstream/main
git push origin main
```
→ Amplify detecta o push e deploya automaticamente.

### Quando você fizer alterações locais (com Amazon Q):
```bash
git add .
git commit -m "descrição da alteração"
git push origin main
```
→ Amplify detecta o push e deploya automaticamente.

### Quando quiser enviar suas alterações para o repo original (Hesuel2):
- Abrir um **Pull Request** no GitHub do fork (`Sergio-Sena/Associados-mouratoV2`) para o repo original (`mouratoimportacao-cloud/Associados-mourato`)
- Hesuel2 decide se aceita ou não

---

## Regras

- Você **não tem** permissão de push direto no repo do Hesuel2
- Todo push no `main` do fork vai automaticamente para produção
- Sempre sincronizar com `upstream` antes de começar alterações para evitar conflitos

---

## Histórico de Infraestrutura

### 05/08/2026 — Migração Vercel → AWS Amplify
- Projeto `mourato-associados` (perfumes/cosméticos) estava na Vercel
- Domínio `mouratoassociados.com.br` já apontava para CloudFront (AWS)
- Removidos `.vercel/` e `.vercelignore` do repositório
- Projeto deletado da Vercel via CLI (`npx vercel remove mourato-associados`)

### 29/09/2026 — Troca de projeto no Amplify
- App `mourato-associados` (Next.js — perfumes) excluído do Amplify
- Novo app `Associados-mouratoV2` criado conectado ao fork `Sergio-Sena/Associados-mouratoV2`
- Stack: Vite + React (SPA estática) — build `npm run build`, output `dist/`
- Domínio `mouratoassociados.com.br` reconfigurado no novo app
- DNS atualizado automaticamente via integração Route 53 + Amplify
- Certificado SSL gerenciado pelo Amplify
