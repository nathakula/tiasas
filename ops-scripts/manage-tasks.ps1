# Manage Tiasas Tasks
# Interactive menu for managing Tiasas scheduled tasks

function Show-Menu {
    Clear-Host
    Write-Host "=== Tiasas Task Manager ===" -ForegroundColor Cyan
    Write-Host ""

    # Get task status
    $web = Get-ScheduledTask -TaskName "TiasasWeb" -ErrorAction SilentlyContinue
    $tunnel = Get-ScheduledTask -TaskName "CloudflareTunnel" -ErrorAction SilentlyContinue

    if ($web) {
        $webColor = if ($web.State -eq 'Running') { 'Green' } else { 'Yellow' }
        Write-Host "TiasasWeb: " -NoNewline
        Write-Host $web.State -ForegroundColor $webColor
    } else {
        Write-Host "TiasasWeb: Not configured" -ForegroundColor Red
    }

    if ($tunnel) {
        $tunnelColor = if ($tunnel.State -eq 'Running') { 'Green' } else { 'Yellow' }
        Write-Host "CloudflareTunnel: " -NoNewline
        Write-Host $tunnel.State -ForegroundColor $tunnelColor
    } else {
        Write-Host "CloudflareTunnel: Not configured" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Yellow
    Write-Host "  [1] Start both tasks"
    Write-Host "  [2] Stop both tasks"
    Write-Host "  [3] Restart both tasks"
    Write-Host "  [4] View task details"
    Write-Host "  [5] Open Task Scheduler GUI"
    Write-Host "  [6] Test local connection"
    Write-Host "  [0] Exit"
    Write-Host ""
}

function Start-Tasks {
    Write-Host "Starting tasks..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName "TiasasWeb" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-ScheduledTask -TaskName "CloudflareTunnel" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Tasks started!" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

function Stop-Tasks {
    Write-Host "Stopping tasks..." -ForegroundColor Yellow
    Stop-ScheduledTask -TaskName "TiasasWeb" -ErrorAction SilentlyContinue
    Stop-ScheduledTask -TaskName "CloudflareTunnel" -ErrorAction SilentlyContinue
    Write-Host "Tasks stopped!" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

function Restart-Tasks {
    Stop-Tasks
    Start-Sleep -Seconds 2
    Start-Tasks
}

function Show-TaskDetails {
    Clear-Host
    Write-Host "=== Task Details ===" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "[TiasasWeb]" -ForegroundColor Yellow
    $web = Get-ScheduledTask -TaskName "TiasasWeb" -ErrorAction SilentlyContinue
    if ($web) {
        $webInfo = Get-ScheduledTaskInfo -TaskName "TiasasWeb"
        Write-Host "State: $($web.State)"
        Write-Host "Last Run: $($webInfo.LastRunTime)"
        Write-Host "Last Result: $($webInfo.LastTaskResult)"
        Write-Host "Next Run: $($webInfo.NextRunTime)"
    } else {
        Write-Host "Not configured" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "[CloudflareTunnel]" -ForegroundColor Yellow
    $tunnel = Get-ScheduledTask -TaskName "CloudflareTunnel" -ErrorAction SilentlyContinue
    if ($tunnel) {
        $tunnelInfo = Get-ScheduledTaskInfo -TaskName "CloudflareTunnel"
        Write-Host "State: $($tunnel.State)"
        Write-Host "Last Run: $($tunnelInfo.LastRunTime)"
        Write-Host "Last Result: $($tunnelInfo.LastTaskResult)"
        Write-Host "Next Run: $($tunnelInfo.NextRunTime)"
    } else {
        Write-Host "Not configured" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Test-LocalConnection {
    Clear-Host
    Write-Host "=== Testing Local Connection ===" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Testing http://localhost:13000 ..." -NoNewline
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:13000" -TimeoutSec 5 -UseBasicParsing
        Write-Host " OK" -ForegroundColor Green
        Write-Host "Status Code: $($response.StatusCode)"
    } catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
    }

    Write-Host ""
    Write-Host "Access Points:" -ForegroundColor Yellow
    Write-Host "  Local:  http://localhost:13000"
    Write-Host "  Public: https://app.tiasas.online"

    Write-Host ""
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Main loop
while ($true) {
    Show-Menu
    $choice = Read-Host "Choose an option"

    switch ($choice) {
        "1" { Start-Tasks }
        "2" { Stop-Tasks }
        "3" { Restart-Tasks }
        "4" { Show-TaskDetails }
        "5" { Start-Process "taskschd.msc"; Start-Sleep -Seconds 2 }
        "6" { Test-LocalConnection }
        "0" { exit }
        default {
            Write-Host "Invalid option" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
