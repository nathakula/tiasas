# Start TiasasWeb Service
# Starts the TiasasWeb Task Scheduler task

# Setup logging
$logFile = Join-Path $PSScriptRoot "service-management.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
function Write-Log {
    param($Message, $Color = "White")
    $logMessage = "[$timestamp] [START] $Message"
    Add-Content -Path $logFile -Value $logMessage
    Write-Host $Message -ForegroundColor $Color
}

Write-Log "======================================" "Yellow"
Write-Log "Starting TiasasWeb..." "Yellow"

# Check if already running
Write-Log "Checking if port 13000 is already in use..." "Cyan"
$existingProcess = netstat -ano | Select-String ":13000"
if ($existingProcess) {
    Write-Log "ERROR: TiasasWeb is already running on port 13000" "Red"
    Write-Log "Existing process detected: $($existingProcess -join ', ')" "Yellow"
    Write-Log "Run stop-service.bat first to stop the existing process" "Yellow"
    Write-Log "Start operation aborted" "Red"
    exit 1
}
Write-Log "Port 13000 is available" "Green"

# Check if build exists
$projectPath = Split-Path -Parent $PSScriptRoot
Write-Log "Checking for production build at: $projectPath\apps\web\.next" "Cyan"
if (-not (Test-Path "$projectPath\apps\web\.next")) {
    Write-Log "ERROR: Build not found at $projectPath\apps\web\.next" "Red"
    Write-Log "Please run 'pnpm build' first." "Yellow"
    Write-Log "Start operation aborted" "Red"
    exit 1
}
Write-Log "Production build found" "Green"

Write-Log "Starting TiasasWeb Task Scheduler task..." "Cyan"

try {
    # Get task info before starting
    $taskInfo = Get-ScheduledTask -TaskName "TiasasWeb" -ErrorAction Stop
    Write-Log "Task current state: $($taskInfo.State)" "Cyan"

    # Start the Task Scheduler task
    Write-Log "Executing: Start-ScheduledTask -TaskName 'TiasasWeb'" "Cyan"
    Start-ScheduledTask -TaskName "TiasasWeb" -ErrorAction Stop
    Write-Log "Task Scheduler command completed" "Green"

    # Wait a moment for the task to start the process
    Write-Log "Waiting 5 seconds for service to initialize..." "Cyan"
    Start-Sleep -Seconds 5

    # Check task state after starting
    $taskInfoAfter = Get-ScheduledTask -TaskName "TiasasWeb" -ErrorAction Stop
    Write-Log "Task state after start command: $($taskInfoAfter.State)" "Cyan"

    # Verify it's running
    Write-Log "Verifying service is accessible on port 13000..." "Cyan"
    $running = netstat -ano | Select-String ":13000"
    if ($running) {
        $processInfo = $running -join ', '
        Write-Log "SUCCESS: TiasasWeb is running on port 13000" "Green"
        Write-Log "Process info: $processInfo" "Cyan"
        Write-Log "Access the app at: http://localhost:13000" "Green"
    } else {
        Write-Log "WARNING: Port 13000 is not responding" "Yellow"
        Write-Log "Task state is: $($taskInfoAfter.State)" "Yellow"
        Write-Log "Check Task Scheduler for errors or run the task manually" "Yellow"
    }

    Write-Log "Start operation completed" "Green"
} catch {
    Write-Log "ERROR: Failed to start Task Scheduler task: $_" "Red"
    Write-Log "Exception type: $($_.Exception.GetType().FullName)" "Red"
    Write-Log "Please ensure the 'TiasasWeb' task exists in Task Scheduler" "Yellow"
    Write-Log "Start operation failed" "Red"
    exit 1
}
