#!/bin/bash
set -e

# Mourato & Associados - Lightsail Setup
# CNPJ: 38.377.738/0001-45 | Regiao: us-east-1

apt-get update -y && apt-get upgrade -y

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git python3 python3-pip chromium-browser
pip3 install pypdf
npm install -g pm2

cd /home/ubuntu
git clone https://github.com/mouratoimportacao-cloud/Associados-mourato.git mourato
cd mourato
npm install

cat > /home/ubuntu/mourato/.env << 'ENVEOF'
MICA_PORT=3050
VITE_ADMIN_PASSWORD=@Jota1307
AWS_LEADS_URL=https://0bwr64p3ie.execute-api.us-east-1.amazonaws.com/prod/leads
ALFRED_PORT=9000
ENVEOF

chown ubuntu:ubuntu /home/ubuntu/mourato/.env

cat > /home/ubuntu/mourato/ecosystem.config.cjs << 'PMEOF'
module.exports = {
  apps: [{
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
  }]
};
PMEOF

mkdir -p /home/ubuntu/logs
chown -R ubuntu:ubuntu /home/ubuntu/logs

sudo -u ubuntu bash -c "cd /home/ubuntu/mourato && pm2 start ecosystem.config.cjs"
sudo -u ubuntu bash -c "pm2 save"
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo -u ubuntu bash -c "pm2 save"

ufw allow 22/tcp
ufw allow 3050/tcp
ufw allow 9000/tcp
ufw --force enable
