@echo off
chcp 65001 >nul
echo ========================================================
echo 🤖 STATUS OFICIAL DA MICA 24/7 - MOURATO & ASSOCIADOS
echo ========================================================
echo.
powershell -Command "try { $res = Invoke-RestMethod -Uri 'http://localhost:3005/status' -TimeoutSec 3; Write-Host '🟢 Conectada ao WhatsApp:' $res.whatsappConnected -ForegroundColor Green; Write-Host '📱 Diretoria (Alerta):' $res.directorPhone -ForegroundColor Cyan; Write-Host '☁️ Vigilância AWS:' $res.awsQueueWatcher -ForegroundColor Yellow; Write-Host '📋 Leads Notificados:' $res.notifiedLeadsCount -ForegroundColor White; } catch { Write-Host '🔴 AVISO: Servidor da Mica não está respondendo na porta 3005.' -ForegroundColor Red; }"
echo.
echo ========================================================
pause
