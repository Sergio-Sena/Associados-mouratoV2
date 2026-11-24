#!/usr/bin/env bash
set -e

echo "=== ATUALIZACAO DEFINITIVA MICA v3.0-24x7 (EC2 AWS) ==="
git pull origin main
npm install --omit=dev

# Garante instancia UNICA (evita conflito 440 connectionReplaced no WhatsApp)
pm2 delete mica-247 2>/dev/null || true
pm2 start scripts/ecosystem.config.cjs
pm2 save

echo "=== VERIFICANDO STATUS AO VIVO ==="
sleep 3
curl -s http://127.0.0.1:3050/status
echo ""
echo "Se whatsappConnected for false, abra http://54.84.170.164:3050/qrcode e escaneie uma unica vez."
