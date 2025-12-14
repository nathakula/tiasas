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

# Find processes using port 13000 (only LISTENING state, ignore TIME_WAIT)
$processes = netstat -ano | Select-String ":13000" | Where-Object { $_ -match "LISTENING" } | ForEach-Object {
    $line = $_.Line.Trim()
    $parts = $line -split '\s+'
    if ($parts.Length -ge 5) {
        $parts[4]
    }
} | Select-Object -Unique

if ($processes) {
    Write-Log "Found $($processes.Count) process(es) on port 13000" "Cyan"
    $killSuccessCount = 0
    $killFailCount = 0

    foreach ($processId in $processes) {
        # Skip PID 0 (System Idle Process) and ensure it's a valid number
        if ($processId -match '^\d+$' -and $processId -ne "0") {
            try {
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Log "Killing process: $($proc.Name) (PID: $processId)" "Cyan"
                    Stop-Process -Id $processId -Force
                    Write-Log "Successfully stopped process $processId" "Green"
                    $killSuccessCount++
                } else {
                    Write-Log "Process $processId already terminated" "Yellow"
                }
            } catch {
                Write-Log "Failed to stop process $processId : $_" "Red"
                $killFailCount++
            }
        }
    }

    # Wait a moment for processes to fully terminate
    Write-Log "Waiting 2 seconds for processes to terminate..." "Cyan"
    Start-Sleep -Seconds 2

    # Verify port is free (check for LISTENING state only, ignore TIME_WAIT)
    $stillRunning = netstat -ano | Select-String ":13000" | Where-Object { $_ -match "LISTENING" }
    if ($stillRunning) {
        Write-Log "WARNING: Port 13000 still has LISTENING processes after cleanup" "Yellow"
        Write-Log "Killed $killSuccessCount process(es), $killFailCount failed" "Yellow"
        Write-Log "Stop operation completed with warnings" "Yellow"
        exit 0  # Exit success even with warnings - port might free up
    } else {
        Write-Log "TiasasWeb stopped successfully. Port 13000 is now free." "Green"
        Write-Log "Killed $killSuccessCount process(es)" "Green"
        Write-Log "Stop operation completed successfully" "Green"
        exit 0
    }
} else {
    Write-Log "No processes found running on port 13000 (already stopped)" "Yellow"
    Write-Log "Stop operation completed (nothing to stop)" "Green"
    exit 0
}
