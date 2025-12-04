# Diagnose TiasasWeb Task Issues
# Run this as Administrator

Write-Host "=== Diagnosing TiasasWeb Task ===" -ForegroundColor Cyan
Write-Host ""

# Check if task exists
Write-Host "[1] Checking if task exists..." -ForegroundColor Yellow
$task = Get-ScheduledTask -TaskName "TiasasWeb" -ErrorAction SilentlyContinue
if ($task) {
    Write-Host "  Task found: $($task.TaskName)" -ForegroundColor Green
    Write-Host "  Current State: $($task.State)" -ForegroundColor $(if ($task.State -eq 'Running') { 'Green' } else { 'Yellow' })
} else {
    Write-Host "  ERROR: Task not found!" -ForegroundColor Red
    exit 1
}

# Get task info
Write-Host ""
Write-Host "[2] Task execution info..." -ForegroundColor Yellow
$taskInfo = Get-ScheduledTaskInfo -TaskName "TiasasWeb"
Write-Host "  Last Run Time: $($taskInfo.LastRunTime)"
Write-Host "  Last Result: $($taskInfo.LastTaskResult) (0 = Success)"
Write-Host "  Number of Missed Runs: $($taskInfo.NumberOfMissedRuns)"

# Check if Node.js is in PATH
Write-Host ""
Write-Host "[3] Checking Node.js..." -ForegroundColor Yellow
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($nodePath) {
    Write-Host "  Node.js found: $nodePath" -ForegroundColor Green
    $nodeVersion = & node --version
    Write-Host "  Version: $nodeVersion" -ForegroundColor Gray
} else {
    Write-Host "  ERROR: Node.js not found in PATH!" -ForegroundColor Red
}

# Check if Next.js build exists
Write-Host ""
Write-Host "[4] Checking Next.js build..." -ForegroundColor Yellow
$nextDir = "d:\GenAi\Projects\Tiasas\apps\web\.next"
if (Test-Path $nextDir) {
    Write-Host "  Build directory exists: $nextDir" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Build directory not found!" -ForegroundColor Red
    Write-Host "  Run 'pnpm build' first!" -ForegroundColor Yellow
}

# Check if port 13000 is in use
Write-Host ""
Write-Host "[5] Checking port 13000..." -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 13000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "  Port 13000 is IN USE" -ForegroundColor Green
    Write-Host "  Process ID: $($port.OwningProcess)" -ForegroundColor Gray
    $process = Get-Process -Id $port.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "  Process: $($process.ProcessName)" -ForegroundColor Gray
    }
} else {
    Write-Host "  Port 13000 is FREE (app not running)" -ForegroundColor Yellow
}

# Try to start the task
Write-Host ""
Write-Host "[6] Attempting to start task..." -ForegroundColor Yellow
try {
    Start-ScheduledTask -TaskName "TiasasWeb"
    Write-Host "  Start command sent" -ForegroundColor Green
    Write-Host "  Waiting 5 seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds 5

    $task = Get-ScheduledTask -TaskName "TiasasWeb"
    Write-Host "  Current State: $($task.State)" -ForegroundColor $(if ($task.State -eq 'Running') { 'Green' } else { 'Yellow' })

    if ($task.State -ne 'Running') {
        Write-Host ""
        Write-Host "  Task is not running. Possible issues:" -ForegroundColor Red
        Write-Host "    - Node.js not in PATH" -ForegroundColor Gray
        Write-Host "    - Next.js not built (run 'pnpm build')" -ForegroundColor Gray
        Write-Host "    - Port 13000 already in use" -ForegroundColor Gray
        Write-Host "    - Permissions issue" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Check if we can connect
Write-Host ""
Write-Host "[7] Testing connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:13000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  SUCCESS! App is responding" -ForegroundColor Green
    Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "  FAILED: Cannot connect to http://localhost:13000" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Diagnosis Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If the task won't start, try running manually:" -ForegroundColor Yellow
Write-Host '  cd d:\GenAi\Projects\Tiasas\apps\web' -ForegroundColor Gray
Write-Host '  node d:\GenAi\Projects\Tiasas\node_modules\.bin\next start -p 13000' -ForegroundColor Gray
Write-Host ""
pause
