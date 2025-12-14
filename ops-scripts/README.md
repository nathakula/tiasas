# TiasasWeb Operations Scripts

This folder contains service management scripts for TiasasWeb.

## ⚠️ IMPORTANT: Run as Administrator

All batch files require administrator privileges. When you double-click them, you'll see a UAC prompt - click "Yes" to allow.

## Quick Reference

### 🔄 Restart Service (Most Common)
**Double-click:** `restart-service.bat`

Use this after rebuilding the application to apply changes.

### ⏹️ Stop Service
**Double-click:** `stop-service.bat`

Stops the running Node.js server on port 13000.

### ▶️ Start Service
**Double-click:** `start-service.bat`

Starts the Next.js production server.

## Typical Workflow

1. **Make code changes** in your editor
2. **Build the application:**
   ```bash
   cd D:\GenAi\Projects\Tiasas
   pnpm build
   ```
3. **Restart service:** Double-click `ops-scripts\restart-service.bat`
4. **Clear browser cache:** Press `Ctrl + Shift + R`
5. **Verify:** Navigate to `http://localhost:13000`

## Files

- `restart-service.bat` - Restart service (stops then starts)
- `stop-service.bat` - Stop service only
- `start-service.bat` - Start service only
- `restart-service.ps1` - PowerShell restart script
- `stop-service.ps1` - PowerShell stop script
- `start-service.ps1` - PowerShell start script

## How It Works

These scripts interact with the Windows Task Scheduler task named "TiasasWeb":

- **Stop:** Kills the Node.js process running on port 13000
- **Start:** Triggers the Task Scheduler task to start the service
- **Restart:** Stops the process, then triggers the task to start it again

## Notes

- All batch files run with administrator privileges automatically
- Scripts use port 13000 for the TiasasWeb application
- The Task Scheduler task must be named "TiasasWeb" (case-sensitive)
- After stopping, the task status shows "Ready" until you start it again
