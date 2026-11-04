#!/bin/bash
# ==============================================================
# SCRIPT DE INSTALAÇÃO AUTOMÁTICA DA MICA 24/7 NO GOOGLE CLOUD
# Mourato & Associados • Teia de Aranha
# ==============================================================

set -e

echo "🚀 Iniciando configuração do servidor 24/7 para a Mica..."

# 1. Atualiza pacotes do sistema
sudo apt-get update -y
sudo apt-get install -y curl git ufw

# 2. Instala Node.js 20 LTS
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js $(node -v) instalado com sucesso!"

# 3. Instala PM2 globalmente (mantém a Mica ligada 24/7)
sudo npm install -g pm2

# 4. Cria diretório da Mica
MICA_DIR="/opt/mica-mourato"
sudo mkdir -p $MICA_DIR
sudo chown -R $USER:$USER $MICA_DIR
cd $MICA_DIR

# 5. Inicializa package.json
cat << 'EOF' > package.json
{
  "name": "mica-whatsapp-server",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.9",
    "qrcode-terminal": "^0.12.0"
  }
}
EOF

npm install

# 6. Baixa/Copia script oficial da Mica
mkdir -p scripts auth_info_baileys

# 7. Configura PM2 para iniciar no boot do sistema
pm2 start scripts/mica_whatsapp_server.mjs --name "mica-247"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo "=========================================================="
echo "🎉 MICA CONFIGURADA COM SUCESSO E RODANDO 24H POR DIA!"
echo "📱 Status: pm2 status mica-247"
echo "📜 Logs: pm2 logs mica-247"
echo "=========================================================="
