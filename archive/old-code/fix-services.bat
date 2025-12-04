@echo off
REM Fix Tiasas Services - Disable Pause/Resume
REM Run this script as Administrator

echo === Fixing Tiasas Services Configuration ===
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/4] Stopping services...
net stop TiasasWeb 2>nul
net stop CloudflareTunnel 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Removing services...
"C:\Program Files\nssm\win64\nssm.exe" remove TiasasWeb confirm
"C:\Program Files\nssm\win64\nssm.exe" remove CloudflareTunnel confirm

echo.
echo [3/4] Reinstalling TiasasWeb service...

REM Get Node.js path
for /f "tokens=*" %%i in ('where node') do set NODE_PATH=%%i
echo Node.js path: %NODE_PATH%

REM Install TiasasWeb with corrected configuration
"C:\Program Files\nssm\win64\nssm.exe" install TiasasWeb "%NODE_PATH%"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppDirectory "d:\GenAi\Projects\Tiasas\apps\web"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppParameters "d:\GenAi\Projects\Tiasas\node_modules\.bin\next start -p 13000"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb DisplayName "Tiasas Web Application"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb Description "Tiasas portfolio tracking application"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb Start SERVICE_AUTO_START
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppStdout "d:\GenAi\Projects\Tiasas\apps\web\logs\app.log"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppStderr "d:\GenAi\Projects\Tiasas\apps\web\logs\error.log"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppRotateFiles 1
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppRotateBytes 10485760
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppEnvironmentExtra "NODE_ENV=production"

REM CRITICAL: Disable pause/resume functionality
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppNoConsole 1
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppStopMethodConsole 0
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppStopMethodWindow 0

echo.
echo [4/4] Reinstalling CloudflareTunnel service...

REM Get cloudflared path
for /f "tokens=*" %%i in ('where cloudflared') do set CLOUDFLARED_PATH=%%i
echo Cloudflared path: %CLOUDFLARED_PATH%

REM Install CloudflareTunnel with corrected configuration
"C:\Program Files\nssm\win64\nssm.exe" install CloudflareTunnel "%CLOUDFLARED_PATH%"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppDirectory "C:\Users\srina\.cloudflared"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppParameters "tunnel run tiasas-tunnel"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel DisplayName "Cloudflare Tunnel - Tiasas"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel Description "Cloudflare tunnel for app.tiasas.online"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel Start SERVICE_AUTO_START
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppStdout "C:\Users\srina\.cloudflared\tunnel.log"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppStderr "C:\Users\srina\.cloudflared\tunnel-error.log"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppRotateFiles 1
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppRotateBytes 10485760

REM CRITICAL: Disable pause/resume functionality
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppNoConsole 1
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppStopMethodConsole 0
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppStopMethodWindow 0

echo.
echo Creating logs directory...
mkdir "d:\GenAi\Projects\Tiasas\apps\web\logs" 2>nul

echo.
echo Starting services...
net start TiasasWeb
timeout /t 3 /nobreak >nul
net start CloudflareTunnel
timeout /t 3 /nobreak >nul

echo.
echo === Services Status ===
sc query TiasasWeb | findstr "STATE"
sc query CloudflareTunnel | findstr "STATE"

echo.
echo === Fix Complete! ===
echo.
echo Services should now be RUNNING (not PAUSED).
echo.
echo Access your app at:
echo   Local:  http://localhost:13000
echo   Public: https://app.tiasas.online
echo.
pause
