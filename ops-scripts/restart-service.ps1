# Restart TiasasWeb Service
# Stops and then starts the Next.js production server

# Setup logging
$logFile = Join-Path $PSScriptRoot "service-management.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
function Write-Log {
    param($Message, $Color = "White")
    $logMessage = "[$timestamp] [RESTART] $Message"
    Add-Content -Path $logFile -Value $logMessage
    Write-Host $Message -ForegroundColor $Color
}

Write-Log "==========================================" "Yellow"
Write-Log "RESTART OPERATION STARTED" "Yellow"
Write-Log "==========================================" "Yellow"

# Stop the service (best effort - always continue to start)
Write-Log "" "White"
Write-Log "Step 1/2: Stopping TiasasWeb..." "Cyan"
Write-Log "Calling stop-service.ps1..." "Cyan"

# Reset error action and last exit code
$ErrorActionPreference = "Continue"
$LASTEXITCODE = 0

& "$PSScriptRoot\stop-service.ps1"
$stopExitCode = $LASTEXITCODE

if ($stopExitCode -ne 0) {
    Write-Log "Stop script exited with code $stopExitCode (continuing anyway)" "Yellow"
} else {
    Write-Log "Stop script completed successfully" "Green"
}

Write-Log "" "White"
Write-Log "==========================================" "Yellow"
Write-Log "" "White"

# Wait a moment
Write-Log "Waiting 2 seconds before starting..." "Cyan"
Start-Sleep -Seconds 2

# Start the service (critical - must succeed)
Write-Log "Step 2/2: Starting TiasasWeb..." "Cyan"
Write-Log "Calling start-service.ps1..." "Cyan"

$LASTEXITCODE = 0
& "$PSScriptRoot\start-service.ps1"
$startExitCode = $LASTEXITCODE

if ($startExitCode -ne 0) {
    Write-Log "ERROR: Start script failed with exit code $startExitCode" "Red"
    Write-Log "RESTART OPERATION FAILED" "Red"
    Write-Log "" "White"
    Write-Log "The service may be stopped. Try running start-service.bat manually." "Yellow"
    exit 1
} else {
    Write-Log "Start script completed successfully" "Green"
}

Write-Log "" "White"
Write-Log "==========================================" "Yellow"
Write-Log "RESTART OPERATION COMPLETED SUCCESSFULLY" "Green"
Write-Log "==========================================" "Yellow"
exit 0
