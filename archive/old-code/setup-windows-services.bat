@echo off
REM Setup Tiasas as Windows Services using NSSM
REM Run this script as Administrator

echo === Tiasas Windows Service Setup ===
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Check if NSSM is installed
if not exist "C:\Program Files\nssm\win64\nssm.exe" (
    echo ERROR: NSSM not found!
    echo.
    echo Please download NSSM from https://nssm.cc/download
    echo Extract it to C:\Program Files\nssm
    pause
    exit /b 1
)

echo [1/3] Building Next.js application...
cd /d "d:\GenAi\Projects\Tiasas\apps\web"
call pnpm build
if %errorLevel% neq 0 (
    echo Build failed! Please fix errors and try again.
    pause
    exit /b 1
)

echo.
echo [2/3] Installing Tiasas Web Service...

REM Remove existing service if it exists
"C:\Program Files\nssm\win64\nssm.exe" stop TiasasWeb >nul 2>&1
"C:\Program Files\nssm\win64\nssm.exe" remove TiasasWeb confirm >nul 2>&1

REM Install Next.js service
"C:\Program Files\nssm\win64\nssm.exe" install TiasasWeb "C:\Program Files\nodejs\node.exe"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppParameters "d:\GenAi\Projects\Tiasas\node_modules\.bin\next start -p 13000"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppDirectory "d:\GenAi\Projects\Tiasas\apps\web"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb DisplayName "Tiasas Web Application"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb Description "Tiasas portfolio tracking application"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb Start SERVICE_AUTO_START
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppStdout "d:\GenAi\Projects\Tiasas\apps\web\logs\app.log"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppStderr "d:\GenAi\Projects\Tiasas\apps\web\logs\error.log"
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppRotateFiles 1
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppRotateBytes 10485760

REM Set environment variables
"C:\Program Files\nssm\win64\nssm.exe" set TiasasWeb AppEnvironmentExtra NODE_ENV=production

echo Service installed successfully!

echo.
echo [3/3] Installing Cloudflare Tunnel Service...

REM Check if cloudflared is installed
where cloudflared >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: cloudflared not found in PATH!
    echo Skipping Cloudflare tunnel setup.
    echo Please install cloudflared and run setup-cloudflared-service.bat separately
    goto :skip_tunnel
)

REM Get cloudflared path
for /f "tokens=*" %%i in ('where cloudflared') do set CLOUDFLARED_PATH=%%i

REM Remove existing service if it exists
"C:\Program Files\nssm\win64\nssm.exe" stop CloudflareTunnel >nul 2>&1
"C:\Program Files\nssm\win64\nssm.exe" remove CloudflareTunnel confirm >nul 2>&1

REM Install Cloudflare tunnel service
"C:\Program Files\nssm\win64\nssm.exe" install CloudflareTunnel "%CLOUDFLARED_PATH%" tunnel run tiasas-tunnel
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppDirectory "C:\Users\srina\.cloudflared"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel DisplayName "Cloudflare Tunnel - Tiasas"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel Description "Cloudflare tunnel for app.tiasas.online"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel Start SERVICE_AUTO_START
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppStdout "C:\Users\srina\.cloudflared\tunnel.log"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppStderr "C:\Users\srina\.cloudflared\tunnel-error.log"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppRotateFiles 1
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppRotateBytes 10485760

echo Cloudflare Tunnel service installed successfully!

:skip_tunnel

echo.
echo Creating logs directory...
mkdir "d:\GenAi\Projects\Tiasas\apps\web\logs" >nul 2>&1

echo.
echo Starting services...
net start TiasasWeb
net start CloudflareTunnel

echo.
echo === Setup Complete! ===
echo.
echo Services installed:
echo   1. TiasasWeb - Next.js application
echo   2. CloudflareTunnel - Cloudflare tunnel
echo.
echo Both services are set to start automatically on system boot.
echo.
echo Access your app at:
echo   Local:  http://localhost:13000
echo   Public: https://app.tiasas.online
echo.
echo Useful commands:
echo   net start TiasasWeb         - Start web app
echo   net stop TiasasWeb          - Stop web app
echo   net start CloudflareTunnel  - Start tunnel
echo   net stop CloudflareTunnel   - Stop tunnel
echo   sc query TiasasWeb          - Check web app status
echo   sc query CloudflareTunnel   - Check tunnel status
echo.
echo Logs:
echo   Web App: d:\GenAi\Projects\Tiasas\apps\web\logs\app.log
echo   Tunnel:  C:\Users\srina\.cloudflared\tunnel.log
echo.
pause
