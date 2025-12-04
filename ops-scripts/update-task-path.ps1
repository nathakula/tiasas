# Update TiasasWeb task to use new batch file path
# Run as Administrator

Write-Host "=== Updating Task Path ===" -ForegroundColor Cyan
Write-Host ""

# Check admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

# Stop task
Write-Host "Stopping task..." -ForegroundColor Yellow
Stop-ScheduledTask -TaskName "TiasasWeb" -ErrorAction SilentlyContinue

# Get existing task
$task = Get-ScheduledTask -TaskName "TiasasWeb"
$trigger = $task.Triggers[0]
$settings = $task.Settings
$principal = $task.Principal

# Create new action with updated path
$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument '/c "d:\GenAi\Projects\Tiasas\ops-scripts\start-web-app.bat"' `
    -WorkingDirectory "d:\GenAi\Projects\Tiasas"

# Update task
Set-ScheduledTask `
    -TaskName "TiasasWeb" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal | Out-Null

Write-Host "Task updated!" -ForegroundColor Green

# Start task
Write-Host "Starting task..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName "TiasasWeb"
Start-Sleep -Seconds 3

$task = Get-ScheduledTask -TaskName "TiasasWeb"
Write-Host "Task State: $($task.State)" -ForegroundColor $(if ($task.State -eq 'Running') { 'Green' } else { 'Yellow' })

Write-Host ""
Write-Host "Path updated successfully!" -ForegroundColor Green
pause
