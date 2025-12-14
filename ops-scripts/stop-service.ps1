# Stop TiasasWeb Service
# Kills all Node.js processes running on port 13000

# Setup logging
$logFile = Join-Path $PSScriptRoot "service-management.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
function Write-Log {
    param($Message, $Color = "White")
    $logMessage = "[$timestamp] [STOP] $Message"
    Add-Content -Path $logFile -Value $logMessage
    Write-Host $Message -ForegroundColor $Color
}

Write-Log "======================================" "Yellow"
Write-Log "Stopping TiasasWeb..." "Yellow"

# Find processes using port 13000
$processes = netstat -ano | Select-String ":13000" | ForEach-Object {
    $line = $_.Line.Trim()
    $parts = $line -split '\s+'
    if ($parts.Length -ge 5) {
        $parts[4]
    }
} | Select-Object -Unique

if ($processes) {
    Write-Log "Found $($processes.Count) process(es) on port 13000" "Cyan"
    foreach ($processId in $processes) {
        if ($processId -match '^\d+$') {
            try {
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Log "Killing process: $($proc.Name) (PID: $processId)" "Cyan"
                    Stop-Process -Id $processId -Force
                    Write-Log "Successfully stopped process $processId" "Green"
                }
            } catch {
                Write-Log "Failed to stop process $processId : $_" "Red"
            }
        }
    }

    # Wait a moment for processes to fully terminate
    Write-Log "Waiting 2 seconds for processes to terminate..." "Cyan"
    Start-Sleep -Seconds 2

    # Verify port is free
    $stillRunning = netstat -ano | Select-String ":13000"
    if ($stillRunning) {
        Write-Log "Warning: Port 13000 may still be in use" "Yellow"
    } else {
        Write-Log "TiasasWeb stopped successfully. Port 13000 is now free." "Green"
    }
} else {
    Write-Log "No processes found running on port 13000" "Yellow"
}

Write-Log "Stop operation completed" "Yellow"
