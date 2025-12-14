# Stop TiasasWeb Service
# Kills all Node.js processes running on port 13000

Write-Host "Stopping TiasasWeb..." -ForegroundColor Yellow

# Find processes using port 13000
$processes = netstat -ano | Select-String ":13000" | ForEach-Object {
    $line = $_.Line.Trim()
    $parts = $line -split '\s+'
    if ($parts.Length -ge 5) {
        $parts[4]
    }
} | Select-Object -Unique

if ($processes) {
    foreach ($processId in $processes) {
        if ($processId -match '^\d+$') {
            try {
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "Killing process: $($proc.Name) (PID: $processId)" -ForegroundColor Cyan
                    Stop-Process -Id $processId -Force
                    Write-Host "Successfully stopped process $processId" -ForegroundColor Green
                }
            } catch {
                Write-Host "Failed to stop process $processId : $_" -ForegroundColor Red
            }
        }
    }

    # Wait a moment for processes to fully terminate
    Start-Sleep -Seconds 2

    # Verify port is free
    $stillRunning = netstat -ano | Select-String ":13000"
    if ($stillRunning) {
        Write-Host "Warning: Port 13000 may still be in use" -ForegroundColor Yellow
    } else {
        Write-Host "TiasasWeb stopped successfully. Port 13000 is now free." -ForegroundColor Green
    }
} else {
    Write-Host "No processes found running on port 13000" -ForegroundColor Yellow
}
