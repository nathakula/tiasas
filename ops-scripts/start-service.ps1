# Start TiasasWeb Service
# Starts the Next.js production server on port 13000

Write-Host "Starting TiasasWeb..." -ForegroundColor Yellow

# Check if already running
$existingProcess = netstat -ano | Select-String ":13000"
if ($existingProcess) {
    Write-Host "TiasasWeb is already running on port 13000" -ForegroundColor Yellow
    Write-Host "Run stop-service.bat first to stop the existing process" -ForegroundColor Yellow
    exit 1
}

# Set working directory (parent of ops-scripts)
$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location $projectPath

# Check if build exists
if (-not (Test-Path "$projectPath\apps\web\.next")) {
    Write-Host "Build not found. Please run 'pnpm build' first." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Next.js production server..." -ForegroundColor Cyan

# Start the process in the background
$env:NODE_ENV = "production"
$process = Start-Process -FilePath "pnpm" `
    -ArgumentList "--filter @tiasas/web start" `
    -WorkingDirectory $projectPath `
    -WindowStyle Hidden `
    -PassThru

Write-Host "TiasasWeb started successfully!" -ForegroundColor Green
Write-Host "Process ID: $($process.Id)" -ForegroundColor Cyan
Write-Host "Access the app at: http://localhost:13000" -ForegroundColor Cyan

# Wait a moment and verify it's running
Start-Sleep -Seconds 3

$running = netstat -ano | Select-String ":13000"
if ($running) {
    Write-Host "Verified: Server is running on port 13000" -ForegroundColor Green
} else {
    Write-Host "Warning: Server may not have started correctly" -ForegroundColor Yellow
    Write-Host "Check the logs for errors" -ForegroundColor Yellow
}
