# Update TiasasWeb Task Scheduler Action
# Updates the task to use the correct start command
# Run this script as Administrator

Write-Host "Updating TiasasWeb Task Scheduler action..." -ForegroundColor Yellow

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    exit 1
}

# Get project path
$projectPath = Split-Path -Parent $PSScriptRoot

# Create new action that runs the batch file
$batchPath = Join-Path $PSScriptRoot "start-web-app.bat"
$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$batchPath`"" `
    -WorkingDirectory $projectPath

# Update the task
try {
    Set-ScheduledTask -TaskName "TiasasWeb" -Action $action
    Write-Host "Task action updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The task now runs: $batchPath" -ForegroundColor Cyan
    Write-Host "Working directory: $projectPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The batch file will keep running (blocking) to maintain task status." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can now use the restart-service.bat script!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to update task - $_" -ForegroundColor Red
    Write-Host "Make sure the 'TiasasWeb' task exists in Task Scheduler" -ForegroundColor Yellow
    exit 1
}
