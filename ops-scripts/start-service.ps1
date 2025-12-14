# Start TiasasWeb Service
# Starts the TiasasWeb Task Scheduler task

Write-Host "Starting TiasasWeb..." -ForegroundColor Yellow

# Check if already running
$existingProcess = netstat -ano | Select-String ":13000"
if ($existingProcess) {
    Write-Host "TiasasWeb is already running on port 13000" -ForegroundColor Yellow
    Write-Host "Run stop-service.bat first to stop the existing process" -ForegroundColor Yellow
    exit 1
}

# Check if build exists
$projectPath = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$projectPath\apps\web\.next")) {
    Write-Host "Build not found. Please run 'pnpm build' first." -ForegroundColor Red
    exit 1
}

Write-Host "Starting TiasasWeb Task Scheduler task..." -ForegroundColor Cyan

try {
    # Start the Task Scheduler task
    Start-ScheduledTask -TaskName "TiasasWeb" -ErrorAction Stop
    Write-Host "Task Scheduler task 'TiasasWeb' started successfully!" -ForegroundColor Green

    # Wait a moment for the task to start the process
    Write-Host "Waiting for service to start..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5

    # Verify it's running
    $running = netstat -ano | Select-String ":13000"
    if ($running) {
        Write-Host "Verified: TiasasWeb is running on port 13000" -ForegroundColor Green
        Write-Host "Access the app at: http://localhost:13000" -ForegroundColor Cyan
    } else {
        Write-Host "Warning: Service may not have started correctly" -ForegroundColor Yellow
        Write-Host "Check Task Scheduler for errors or run the task manually" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error starting Task Scheduler task: $_" -ForegroundColor Red
    Write-Host "Please ensure the 'TiasasWeb' task exists in Task Scheduler" -ForegroundColor Yellow
    exit 1
}
