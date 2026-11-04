# ==============================================================================
# INSTALADOR OFICIAL DO SERVIÇO WINDOWS DA MICA 24/7 • MOURATO & ASSOCIADOS
# ==============================================================================

$taskName = "MicaWhatsAppBot247"
$vbsPath = "C:\Teia de arranha\Mourato.associados\service_mica\start_mica_hidden.vbs"
$startupFolder = [System.Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder "MicaWhatsAppBot247.lnk"

Write-Host "⚙️ Configurando inicialização automática da Mica no Windows..." -ForegroundColor Cyan

# 1. Cria atalho no Startup do Windows (Garante execução no Logon)
$wscriptShell = New-Object -ComObject WScript.Shell
$shortcut = $wscriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$vbsPath`""
$shortcut.WorkingDirectory = "C:\Teia de arranha\Mourato.associados"
$shortcut.Description = "Serviço em Segundo Plano da Mica • Mourato & Associados"
$shortcut.WindowStyle = 0
$shortcut.Save()

Write-Host "✅ Atalho de inicialização automática criado em: $shortcutPath" -ForegroundColor Green

# 2. Registra Tarefa Agendada no Windows (Auto-start ao fazer logon)
try {
    $action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbsPath`"" -WorkingDirectory "C:\Teia de arranha\Mourato.associados"
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

    # Remove se já existir
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

    # Registra nova
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Mica WhatsApp 24/7 Service - Mourato & Associados" | Out-Null
    Write-Host "✅ Tarefa agendada do Windows registrada com sucesso: $taskName" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Aviso no registro da tarefa agendada: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "🎉 MICA CONFIGURADA COM SUCESSO PARA RODAR SEMPRE EM SEGUNDO PLANO!" -ForegroundColor Cyan
