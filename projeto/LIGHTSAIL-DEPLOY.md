# Guia de Deploy — Amazon Lightsail
## Mourato & Associados | Servidor da Mica + Alfred & Questão

---

## Pré-requisitos

- Acesso ao console AWS: https://console.aws.amazon.com
- Conta AWS já ativa (a mesma do Amplify)
- WhatsApp do número da Mica disponível: **(11) 91457-2275**

---

## Passo 1 — Criar a Instância Lightsail

1. Acesse: https://lightsail.aws.amazon.com
2. Clique em **"Create instance"**
3. Configure:
   - **Region:** `US East (N. Virginia) — us-east-1` ← mesmo do Amplify
   - **Platform:** `Linux/Unix`
   - **Blueprint:** `OS Only → Ubuntu 22.04 LTS`
   - **Instance plan:** `$5/month` (1 GB RAM, 2 vCPU, 40 GB SSD)
4. Em **"Launch script"**, cole o conteúdo do arquivo `lightsail-setup.sh`
5. Em **"Identify your instance"**, nomeie como: `mourato-mica-server`
6. Clique em **"Create instance"**
7. Aguarde ~3 minutos até o status ficar **"Running"**

---

## Passo 2 — Adicionar Tags na Instância

Após criar, clique na instância → aba **"Tags"** → adicione:

| Chave | Valor |
|---|---|
| `Project` | `mourato-associados` |
| `Owner` | `jose-jailson-mourato` |
| `CNPJ` | `38377738000145` |
| `Env` | `production` |
| `Service` | `mica-whatsapp-bot` |
| `ManagedBy` | `sergio-sena` |

---

## Passo 3 — Abrir as Portas no Firewall Lightsail

1. Clique na instância → aba **"Networking"**
2. Em **"IPv4 Firewall"**, clique em **"Add rule"** e adicione:

| Protocol | Port | Descrição |
|---|---|---|
| TCP | 22 | SSH (já existe) |
| TCP | 3050 | Mica WhatsApp Bot |
| TCP | 9000 | Alfred & Questão |

---

## Passo 4 — Escanear o QR Code da Mica

1. Anote o **IP público** da instância (visível no painel Lightsail)
2. Abra no navegador: `http://<IP_PUBLICO>:3050/qrcode`
3. No celular com o WhatsApp **(11) 91457-2275**:
   - Vá em **Configurações → Aparelhos Conectados → Conectar Aparelho**
   - Escaneie o QR Code exibido na tela
4. Aguarde a mensagem: **"✅ MICA CONECTADA COM SUCESSO AO WHATSAPP!"**
5. Verifique: `http://<IP_PUBLICO>:3050/status`

> O QR Code expira em ~20 segundos. Se expirar, recarregue a página — ele se renova automaticamente.

---

## Passo 5 — Configurar VITE_API_URL no Amplify

Para o site enviar leads direto para o DynamoDB:

1. Acesse: https://console.aws.amazon.com/amplify
2. Clique no app **"Associados-mouratoV2"**
3. Vá em **"Environment variables"**
4. Adicione:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod`
5. Clique em **"Save"** → o Amplify fará um novo deploy automaticamente

---

## Passo 6 — Verificar o Ecossistema Completo

### Via SSH na instância:
```bash
ssh ubuntu@<IP_PUBLICO>

# Status dos serviços
pm2 status

# Logs da Mica em tempo real
pm2 logs mica-whatsapp

# Testar se a Mica está respondendo
curl http://localhost:3050/status
```

### Resultado esperado do `pm2 status`:
```
┌─────────────────┬────┬─────────┬──────┬───────┐
│ name            │ id │ status  │ cpu  │ mem   │
├─────────────────┼────┼─────────┼──────┼───────┤
│ mica-whatsapp   │ 0  │ online  │ 0%   │ 80mb  │
└─────────────────┴────┴─────────┴──────┴───────┘
```

---

## Comandos Úteis (pós-deploy)

```bash
# Ver logs da Mica
pm2 logs mica-whatsapp --lines 50

# Reiniciar a Mica
pm2 restart mica-whatsapp

# Parar a Mica
pm2 stop mica-whatsapp

# Atualizar o código (após push no GitHub)
cd /home/ubuntu/mourato
git pull origin main
npm install
pm2 restart mica-whatsapp

# Ver uso de memória/CPU
pm2 monit
```

---

## Arquitetura Final do Ecossistema

```
[ CONTA AWS — MOURATO & ASSOCIADOS | us-east-1 ]
│
├── AWS Amplify (d3309gx1hqzwt1)
│   └── mouratoassociados.com.br → React SPA
│       └── POST /leads → API Gateway
│
├── API Gateway (0bwr64p3ie.execute-api.us-east-1.amazonaws.com)
│   ├── POST   /prod/leads → Lambda save-lead
│   ├── GET    /prod/leads → Lambda get-leads
│   ├── DELETE /prod/leads/{id} → Lambda get-leads
│   └── PATCH  /prod/leads/{id} → Lambda get-leads
│
├── AWS Lambda
│   ├── mourato-save-lead  (save-lead.zip)
│   └── mourato-get-leads  (get-leads.zip)
│
├── AWS DynamoDB
│   └── Tabela: mourato-leads (PK: id)
│
└── Amazon Lightsail — mourato-mica-server ($5/mês)
    ├── Mica WhatsApp Bot → porta 3050
    │   ├── Polling DynamoDB a cada 4s
    │   ├── Notifica Mourato (11 97899-0034) via WhatsApp
    │   └── Conduz cliente pelo fluxo: CONSENT→SERASA→BOAVISTA→QUOD→DONE
    └── Alfred & Questão → porta 9000
        ├── Gera Dossiê Pericial em PDF
        └── Envia PDF para Mourato via WhatsApp
```

---

## Custo Mensal Total

| Serviço | USD/mês | R$/mês |
|---|---|---|
| AWS Amplify | ~$0,01 | ~R$ 0,06 |
| Lambda + API Gateway | ~$0,01 | ~R$ 0,06 |
| DynamoDB | $0,00 | R$ 0,00 |
| **Lightsail (Mica + Alfred)** | **$5,00** | **R$ 28,75** |
| **TOTAL** | **~$5,02** | **~R$ 28,87/mês** |

> Câmbio: USD 1,00 = R$ 5,75 (nov/2026)
