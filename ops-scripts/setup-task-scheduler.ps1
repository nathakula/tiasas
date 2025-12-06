# Setup Tiasas using Windows Task Scheduler
# This is more reliable than NSSM for Node.js applications
# Run this script as Administrator

Write-Host "=== Setting up Tiasas with Task Scheduler ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select Run as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

# Remove existing tasks if they exist
Write-Host "[1/3] Removing existing tasks..." -ForegroundColor Yellow
Unregister-ScheduledTask -TaskName "TiasasWeb" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "CloudflareTunnel" -Confirm:$false -ErrorAction SilentlyContinue

# Create TiasasWeb task
Write-Host ""
Write-Host "[2/3] Creating TiasasWeb task..." -ForegroundColor Yellow

$action1 = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c d:\GenAi\Projects\Tiasas\ops-scripts\start-web-app.bat" `
    -WorkingDirectory "d:\GenAi\Projects\Tiasas"

$trigger1 = New-ScheduledTaskTrigger -AtStartup

$settings1 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365)

$principal1 = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName "TiasasWeb" `
    -Action $action1 `
    -Trigger $trigger1 `
    -Settings $settings1 `
    -Principal $principal1 `
    -Description "Tiasas Web Application - Auto-starts on boot"

Write-Host "Task created successfully" -ForegroundColor Green

# Create CloudflareTunnel task
Write-Host ""
Write-Host "[3/3] Creating CloudflareTunnel task..." -ForegroundColor Yellow

$cloudflaredPath = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflaredPath) {
    Write-Host "WARNING: cloudflared not found in PATH" -ForegroundColor Yellow
    Write-Host "Skipping Cloudflare tunnel setup" -ForegroundColor Yellow
} else {
    $action2 = New-ScheduledTaskAction `
        -Execute $cloudflaredPath `
        -Argument "tunnel run tiasas-tunnel" `
        -WorkingDirectory "C:\Users\srina\.cloudflared"

    $trigger2 = New-ScheduledTaskTrigger -AtStartup

    $settings2 = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit (New-TimeSpan -Days 365)

    $principal2 = New-ScheduledTaskPrincipal `
        -UserId $env:USERNAME `
        -LogonType S4U `
        -RunLevel Highest

    Register-ScheduledTask `
        -TaskName "CloudflareTunnel" `
        -Action $action2 `
        -Trigger $trigger2 `
        -Settings $settings2 `
        -Principal $principal2 `
        -Description "Cloudflare Tunnel for app.tiasas.online - Auto-starts on boot"

    Write-Host "Task created successfully" -ForegroundColor Green
}

# Start the tasks
Write-Host ""
Write-Host "Starting tasks..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName "TiasasWeb"
Start-Sleep -Seconds 3
if ($cloudflaredPath) {
    Start-ScheduledTask -TaskName "CloudflareTunnel"
    Start-Sleep -Seconds 2
}

# Check status
Write-Host ""
Write-Host "=== Task Status ===" -ForegroundColor Cyan
$task1 = Get-ScheduledTask -TaskName "TiasasWeb"
Write-Host "TiasasWeb: $($task1.State)" -ForegroundColor $(if ($task1.State -eq 'Running') { 'Green' } else { 'Yellow' })

if ($cloudflaredPath) {
    $task2 = Get-ScheduledTask -TaskName "CloudflareTunnel"
    Write-Host "CloudflareTunnel: $($task2.State)" -ForegroundColor $(if ($task2.State -eq 'Running') { 'Green' } else { 'Yellow' })
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Tasks configured to:" -ForegroundColor Cyan
Write-Host "  Auto-start on system boot" -ForegroundColor Gray
Write-Host "  Auto-restart if they crash" -ForegroundColor Gray
Write-Host "  Run in background without console windows" -ForegroundColor Gray
Write-Host ""
Write-Host "Access your app at:" -ForegroundColor Yellow
Write-Host "  Local:  http://localhost:13000" -ForegroundColor Gray
Write-Host "  Public: https://app.tiasas.online" -ForegroundColor Gray
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName TiasasWeb" -ForegroundColor Gray
Write-Host "  Stop-ScheduledTask -TaskName TiasasWeb" -ForegroundColor Gray
Write-Host "  Get-ScheduledTask -TaskName TiasasWeb" -ForegroundColor Gray
Write-Host ""
Write-Host "You can also manage tasks via Task Scheduler GUI (taskschd.msc)" -ForegroundColor Gray
Write-Host ""
pause
