# Tiasas Operations Scripts

This directory contains operational scripts for managing the Tiasas application as Windows scheduled tasks.

## 📋 Current Setup

The application runs using **Windows Task Scheduler** with these tasks:
- **TiasasWeb** - Next.js web application (port 13000)
- **CloudflareTunnel** - Cloudflare tunnel to app.tiasas.online

## 🚀 Active Scripts

### Daily Operations

**`manage-tasks.ps1`**
- Interactive menu for managing scheduled tasks
- Start/Stop/Restart tasks
- View task status and details
- Test connectivity
- **Usage**: Right-click → Run with PowerShell (as Admin)

**`diagnose-task.ps1`**
- Troubleshooting tool for task issues
- Checks Node.js availability, build status, port usage
- Attempts to start task and diagnose failures
- **Usage**: Right-click → Run with PowerShell (as Admin)

### Setup & Configuration

**`setup-task-scheduler.ps1`**
- Initial setup script (already run)
- Creates both TiasasWeb and CloudflareTunnel tasks
- Configures auto-start on boot and auto-restart on crash
- **Usage**: Only needed for initial setup or complete reconfiguration

**`update-task-to-use-batch.ps1`**
- Updates TiasasWeb task to use batch file wrapper (already run)
- Use this if task configuration needs to be reset
- **Usage**: Run in PowerShell as Administrator

**`update-task-path.ps1`**
- Updates TiasasWeb task to use new batch file path after reorganization
- **Usage**: Run once after scripts were moved to ops-scripts folder

**`create-desktop-shortcuts.ps1`**
- Creates desktop shortcuts for easy task management
- **Usage**: Run once to create shortcuts on your desktop

### Core Task Script

**`start-web-app.bat`**
- Wrapper script used by TiasasWeb scheduled task
- Validates environment, checks build, starts Next.js server
- Logs all activity to `apps/web/logs/`
- **Do not run manually** - Used automatically by Task Scheduler

## 📊 Checking Task Status

### Option 1: PowerShell Commands
```powershell
# View all Tiasas tasks
Get-ScheduledTask | Where-Object {$_.TaskName -like "*Tiasas*"}

# Start a task
Start-ScheduledTask -TaskName "TiasasWeb"

# Stop a task
Stop-ScheduledTask -TaskName "TiasasWeb"

# Get detailed info
Get-ScheduledTaskInfo -TaskName "TiasasWeb"
```

### Option 2: Task Scheduler GUI
1. Press `Win + R`
2. Type `taskschd.msc`
3. Press Enter
4. Look for `TiasasWeb` and `CloudflareTunnel`

### Option 3: Interactive Manager
```powershell
cd d:\GenAi\Projects\Tiasas\ops-scripts
.\manage-tasks.ps1
```

## 📝 Log Files

Application logs are stored in:
- **Startup Log**: `d:\GenAi\Projects\Tiasas\apps\web\logs\startup.log`
- **Application Log**: `d:\GenAi\Projects\Tiasas\apps\web\logs\app.log`
- **Error Log**: `d:\GenAi\Projects\Tiasas\apps\web\logs\error.log`
- **Tunnel Log**: `C:\Users\srina\.cloudflared\tunnel.log`

## 🌐 Access Points

- **Local**: http://localhost:13000
- **Public**: https://app.tiasas.online

## 🔄 Auto-Start Behavior

Both tasks are configured to:
- ✅ Start automatically when Windows boots
- ✅ Auto-restart if they crash (up to 3 times, 1 minute interval)
- ✅ Run in background (no console windows)
- ✅ Run with highest privileges

## 🔧 Troubleshooting

### Task shows "Running" but app doesn't respond

1. Check logs:
   ```powershell
   notepad d:\GenAi\Projects\Tiasas\apps\web\logs\startup.log
   notepad d:\GenAi\Projects\Tiasas\apps\web\logs\error.log
   ```

2. Run diagnostic:
   ```powershell
   cd d:\GenAi\Projects\Tiasas\ops-scripts
   .\diagnose-task.ps1
   ```

3. Common issues:
   - Next.js not built: Run `pnpm build` in project root
   - Port 13000 in use: Check `netstat -ano | findstr 13000`
   - Node.js not in PATH: Verify with `where node`

### Task won't start

1. Verify Node.js is installed: `node --version`
2. Check if build exists: Look for `apps/web/.next` folder
3. Review Task Scheduler for error codes
4. Re-run setup: `.\update-task-to-use-batch.ps1`

### After Windows reboot, tasks don't start

1. Open Task Scheduler (taskschd.msc)
2. Check if tasks are enabled
3. Verify trigger is set to "At startup"
4. Check "Last Run Result" column for errors

## 📦 What Happened to Windows Services / NSSM?

We initially tried using NSSM (Non-Sucking Service Manager) to create Windows Services, but encountered persistent "PAUSED" state issues with Node.js applications. We switched to Windows Task Scheduler which is more reliable for Node.js apps.

All NSSM-related scripts have been archived to `archive/old-code/`.
