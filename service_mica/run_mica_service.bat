@echo off
title Mica WhatsApp 24/7 Service - Mourato & Associados
cd /d "C:\Teia de arranha\Mourato.associados"

:loop
echo [%date% %time%] Iniciando Mica WhatsApp Server... >> "C:\Teia de arranha\Mourato.associados\auth_info_baileys\service_runner.log" 2>&1
"C:\Program Files\nodejs\node.exe" scripts\mica_whatsapp_server.mjs >> "C:\Teia de arranha\Mourato.associados\auth_info_baileys\service_runner.log" 2>&1

echo [%date% %time%] Mica encerrou. Reiniciando em 5 segundos... >> "C:\Teia de arranha\Mourato.associados\auth_info_baileys\service_runner.log" 2>&1
timeout /t 5 /nobreak >nul
goto loop
