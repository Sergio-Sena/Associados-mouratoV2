#!/bin/bash
# =============================================================================
# MOURATO & ASSOCIADOS — Setup Completo do Amazon Lightsail
# Servidor: Ubuntu 22.04 LTS | Plano: $5/mês (1 GB RAM, 2 vCPU, 40 GB SSD)
# Região: us-east-1 (N. Virginia) — mesmo data center do Amplify e DynamoDB
# Serviços: Mica WhatsApp Bot (porta 3050) + Alfred & Questão (porta 9000)
# =============================================================================
# USO: cole este script no campo "Launch script" ao criar a instância Lightsail
#      OU execute manualmente após conectar via SSH:
#      bash lightsail-setup.sh
# =============================================================================

set -e

echo "============================================================"
echo "  MOURATO & ASSOCIADOS — SETUP LIGHTSAIL"
echo "  CNPJ: 38.377.738/0001-45"
echo "  Região: us-east-1 | Plano: Micro ($5/mês)"
echo "============================================================"

# --- 1. ATUALIZA O SISTEMA ---
echo "[1/8] Atualizando sistema..."
apt-get update -y && apt-get upgrade -y

# --- 2. INSTALA NODE.JS 20 LTS ---
echo "[2/8] Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# --- 3. INSTALA DEPENDÊNCIAS DO SISTEMA ---
echo "[3/8] Instalando dependências do sistema..."
apt-get install -y git python3 python3-pip chromium-browser

# Instala pypdf para geração de PDFs criptografados (Alfred/Questão)
pip3 install pypdf

# --- 4. INSTALA PM2 (gerenciador de processos 24/7) ---
echo "[4/8] Instalando PM2..."
npm install -g pm2

# --- 5. CLONA O REPOSITÓRIO ---
echo "[5/8] Clonando repositório..."
cd /home/ubuntu
git clone https://github.com/mouratoimportacao-cloud/Associados-mourato.git mourato
cd mourato
npm install

# --- 6. CRIA ARQUIVO DE VARIÁVEIS DE AMBIENTE ---
echo "[6/8] Configurando variáveis de ambiente..."
cat > /home/ubuntu/mourato/.env << 'EOF'
# Mourato & Associados — Variáveis de Ambiente do Servidor Lightsail
# ATENÇÃO: Não commitar este arquivo no Git

# Porta da Mica (WhatsApp Bot)
MICA_PORT=3050

# Senha do painel admin (get-leads Lambda)
# TROQUE PARA UMA SENHA FORTE ANTES DE USAR EM PRODUÇÃO
VITE_ADMIN_PASSWORD=@Jota1307

# URL da API Gateway AWS (DynamoDB de Leads)
AWS_LEADS_URL=https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod/leads

# Porta do servidor Alfred & Questão
ALFRED_PORT=9000
EOF

chown ubuntu:ubuntu /home/ubuntu/mourato/.env

# --- 7. CONFIGURA PM2 PARA INICIAR OS SERVIÇOS ---
echo "[7/8] Configurando PM2..."
cat > /home/ubuntu/mourato/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'mica-whatsapp',
      script: './scripts/mica_whatsapp_server.mjs',
      interpreter: 'node',
      cwd: '/home/ubuntu/mourato',
      env_file: '/home/ubuntu/mourato/.env',
      restart_delay: 5000,
      max_restarts: 20,
      watch: false,
      log_file: '/home/ubuntu/logs/mica.log',
      error_file: '/home/ubuntu/logs/mica-error.log',
      time: true
    }
  ]
};
EOF

# Cria pasta de logs
mkdir -p /home/ubuntu/logs
chown -R ubuntu:ubuntu /home/ubuntu/logs

# Inicia a Mica com PM2 (como usuário ubuntu, não root)
sudo -u ubuntu bash -c "cd /home/ubuntu/mourato && pm2 start ecosystem.config.cjs"
sudo -u ubuntu bash -c "pm2 save"

# Configura PM2 para reiniciar automaticamente após reboot do servidor
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo -u ubuntu bash -c "pm2 save"

# --- 8. CONFIGURA FIREWALL (UFW) ---
echo "[8/8] Configurando firewall..."
ufw allow 22/tcp    # SSH
ufw allow 3050/tcp  # Mica WhatsApp Bot
ufw allow 9000/tcp  # Alfred & Questão
ufw --force enable

echo ""
echo "============================================================"
echo "  SETUP CONCLUÍDO!"
echo "============================================================"
echo ""
echo "  PRÓXIMOS PASSOS:"
echo ""
echo "  1. Conecte via SSH:"
echo "     ssh ubuntu@<IP_DA_INSTANCIA>"
echo ""
echo "  2. Escaneie o QR Code da Mica:"
echo "     Abra no navegador: http://<IP_DA_INSTANCIA>:3050/qrcode"
echo "     Escaneie com o WhatsApp: (11) 91457-2275"
echo ""
echo "  3. Verifique o status dos serviços:"
echo "     pm2 status"
echo "     pm2 logs mica-whatsapp"
echo ""
echo "  4. Verifique se a Mica está online:"
echo "     curl http://localhost:3050/status"
echo ""
echo "  5. Adicione VITE_API_URL no Amplify:"
echo "     https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod"
echo "============================================================"
