# Update TiasasWeb task to use batch file wrapper
# Run as Administrator

Write-Host "=== Updating TiasasWeb Task ===" -ForegroundColor Cyan
Write-Host ""

# Check admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

# Stop and remove existing task
Write-Host "Stopping existing task..." -ForegroundColor Yellow
Stop-ScheduledTask -TaskName "TiasasWeb" -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "TiasasWeb" -Confirm:$false -ErrorAction SilentlyContinue

# Create logs directory
$logsDir = "d:\GenAi\Projects\Tiasas\apps\web\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "Created logs directory: $logsDir" -ForegroundColor Green
}

# Create new task with batch file
Write-Host "Creating updated task..." -ForegroundColor Yellow

$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument '/c "d:\GenAi\Projects\Tiasas\start-web-app.bat"' `
    -WorkingDirectory "d:\GenAi\Projects\Tiasas"

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365)

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName "TiasasWeb" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Tiasas Web Application - Auto-starts on boot"

Write-Host "Task updated successfully!" -ForegroundColor Green

# Start the task
Write-Host ""
Write-Host "Starting task..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName "TiasasWeb"
Start-Sleep -Seconds 5

# Check status
$task = Get-ScheduledTask -TaskName "TiasasWeb"
Write-Host "Task State: $($task.State)" -ForegroundColor $(if ($task.State -eq 'Running') { 'Green' } else { 'Yellow' })

# Check logs
Write-Host ""
Write-Host "Checking startup log..." -ForegroundColor Yellow
$startupLog = "d:\GenAi\Projects\Tiasas\apps\web\logs\startup.log"
if (Test-Path $startupLog) {
    Write-Host "Last few lines from startup.log:" -ForegroundColor Gray
    Get-Content $startupLog -Tail 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "  Startup log not created yet" -ForegroundColor Yellow
}

# Test connection
Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $response = Invoke-WebRequest -Uri "http://localhost:13000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "SUCCESS! App is responding on http://localhost:13000" -ForegroundColor Green
} catch {
    Write-Host "App not responding yet. Check logs:" -ForegroundColor Yellow
    Write-Host "  Startup: $startupLog" -ForegroundColor Gray
    Write-Host "  App: d:\GenAi\Projects\Tiasas\apps\web\logs\app.log" -ForegroundColor Gray
    Write-Host "  Error: d:\GenAi\Projects\Tiasas\apps\web\logs\error.log" -ForegroundColor Gray
}

Write-Host ""
pause
