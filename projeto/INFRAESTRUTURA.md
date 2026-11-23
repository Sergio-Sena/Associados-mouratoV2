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

## Ecossistema AWS Completo

```
[ CONTA AWS — MOURATO & ASSOCIADOS | us-east-1 ]
│
├── AWS Amplify (d3309gx1hqzwt1)
│   └── mouratoassociados.com.br → React SPA
│       VITE_API_URL → API Gateway
│       VITE_ADMIN_PASSWORD → @Jota1307
│
├── API Gateway REST (0bwr64p3ie) — mourato-leads-api
│   ├── POST   /prod/leads → Lambda mourato-save-lead
│   ├── GET    /prod/leads → Lambda mourato-get-leads
│   ├── DELETE /prod/leads/{id} → Lambda mourato-get-leads
│   └── PATCH  /prod/leads/{id} → Lambda mourato-get-leads
│
├── AWS Lambda
│   ├── mourato-save-lead (nodejs22.x)
│   └── mourato-get-leads (nodejs22.x)
│
├── AWS DynamoDB
│   └── mourato-leads (PK: id | PAY_PER_REQUEST)
│
└── Amazon Lightsail — mourato-mica-server ($5/mês)
    ├── IP Estático: 54.84.170.164 (mourato-mica-ip)
    ├── Plano: micro_3_0 (1GB RAM, 2vCPU, 40GB SSD)
    ├── OS: Ubuntu 22.04 LTS | Região: us-east-1a
    ├── Portas abertas: 22 (SSH), 3050 (Mica), 9000 (Alfred)
    ├── Mica WhatsApp Bot → http://54.84.170.164:3050
    │   ├── /status  — status da conexão
    │   ├── /qrcode  — escanear QR Code
    │   └── Polling DynamoDB a cada 4s
    └── Alfred & Questão → porta 9000 (pendente — código local do Mourato)
```

### Tags aplicadas em todos os recursos

| Chave | Valor |
|---|---|
| Project | mourato-associados |
| Owner | jose-jailson-mourato |
| CNPJ | 38377738000145 |
| Env | production |
| ManagedBy | sergio-sena |

### Custo Mensal

| Serviço | USD/mês | R$/mês |
|---|---|---|
| AWS Amplify | ~$0,01 | ~R$ 0,06 |
| Lambda + API Gateway | ~$0,01 | ~R$ 0,06 |
| DynamoDB | $0,00 | R$ 0,00 |
| Lightsail (Mica) | $5,00 | R$ 28,75 |
| **TOTAL** | **~$5,02** | **~R$ 28,87/mês** |

> Câmbio: USD 1,00 = R$ 5,75 (nov/2026)

---

## Pendências

- [ ] Mourato escanear QR Code em `http://54.84.170.164:3050/qrcode` com WhatsApp (11) 91457-2275
- [ ] Mourato commitar servidor Alfred & Questão (porta 9000) no GitHub para subir no Lightsail

---

## Histórico de Infraestrutura

### 23/11/2026 — Deploy Ecossistema AWS Completo (Sessão Amazon Q)
- Levantamento completo dos recursos AWS existentes via CLI
- Tags aplicadas em todos os recursos: DynamoDB, Lambda (x2), API Gateway, Lightsail
- Variáveis de ambiente configuradas no Amplify: `VITE_API_URL` e `VITE_ADMIN_PASSWORD`
- Instância Lightsail `mourato-mica-server` criada (Ubuntu 22.04, micro $5/mês, us-east-1a)
- IP estático `54.84.170.164` alocado e anexado à instância
- Portas 3050 e 9000 abertas no firewall Lightsail
- Script de setup automático executado: Node.js 20, PM2, clone do repo, Mica online
- Permissões corrigidas (`chown ubuntu`) e `auth_info_baileys` criado
- Redeploy do Amplify triggerado (Job #77 — SUCCEED em 74s)
- Mica confirmada online: `{online: true, awsQueueWatcher: true}`
- Arquivos criados: `projeto/lightsail-setup.sh`, `projeto/lightsail-userdata.sh`, `projeto/LIGHTSAIL-DEPLOY.md`, `projeto/mourato-mica-key.pem`
- Chave SSH salva em `projeto/mourato-mica-key.pem`

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
