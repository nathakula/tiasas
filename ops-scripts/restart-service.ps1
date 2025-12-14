# Restart TiasasWeb Service
# Stops and then starts the Next.js production server

Write-Host "Restarting TiasasWeb..." -ForegroundColor Yellow
Write-Host "=====================================`n" -ForegroundColor Yellow

# Stop the service
Write-Host "Step 1: Stopping TiasasWeb..." -ForegroundColor Cyan
& "$PSScriptRoot\stop-service.ps1"

Write-Host "`n=====================================`n" -ForegroundColor Yellow

# Wait a moment
Start-Sleep -Seconds 2

# Start the service
Write-Host "Step 2: Starting TiasasWeb..." -ForegroundColor Cyan
& "$PSScriptRoot\start-service.ps1"

Write-Host "`n=====================================" -ForegroundColor Yellow
Write-Host "Restart complete!" -ForegroundColor Green
