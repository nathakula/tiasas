@echo off
REM Wrapper script to start Tiasas Web App
REM This ensures proper PATH and error logging

echo [%date% %time%] Starting Tiasas Web Application... >> "d:\GenAi\Projects\Tiasas\apps\web\logs\startup.log"

REM Change to app directory
cd /d "d:\GenAi\Projects\Tiasas\apps\web"

REM Set environment
set NODE_ENV=production
set PORT=13000

REM Check if Node.js is accessible
where node >nul 2>&1
if errorlevel 1 (
    echo [%date% %time%] ERROR: Node.js not found in PATH >> "d:\GenAi\Projects\Tiasas\apps\web\logs\startup.log"
    exit /b 1
)

REM Check if build exists
if not exist ".next" (
    echo [%date% %time%] ERROR: Next.js build not found. Run pnpm build first. >> "d:\GenAi\Projects\Tiasas\apps\web\logs\startup.log"
    exit /b 1
)

REM Start the app
echo [%date% %time%] Starting Next.js server... >> "d:\GenAi\Projects\Tiasas\apps\web\logs\startup.log"

REM Use pnpm to start (which handles paths correctly)
cd /d "d:\GenAi\Projects\Tiasas"
pnpm --filter @tiasas/web start >> "d:\GenAi\Projects\Tiasas\apps\web\logs\app.log" 2>> "d:\GenAi\Projects\Tiasas\apps\web\logs\error.log"
