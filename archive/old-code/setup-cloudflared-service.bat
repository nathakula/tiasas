@echo off
REM Setup Cloudflare Tunnel as Windows Service
REM Run this script as Administrator AFTER installing NSSM

echo === Cloudflare Tunnel Service Setup ===
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

REM Check if cloudflared is installed
where cloudflared >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: cloudflared not found in PATH!
    echo Please ensure cloudflared.exe is installed
    pause
    exit /b 1
)

echo Installing Cloudflare Tunnel service...
echo.

REM Get cloudflared path
for /f "tokens=*" %%i in ('where cloudflared') do set CLOUDFLARED_PATH=%%i

echo Cloudflared path: %CLOUDFLARED_PATH%
echo Config directory: C:\Users\srina\.cloudflared
echo.

REM Install service using NSSM
"C:\Program Files\nssm\win64\nssm.exe" install CloudflareTunnel "%CLOUDFLARED_PATH%" tunnel run tiasas-tunnel

REM Configure service
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppDirectory "C:\Users\srina\.cloudflared"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel DisplayName "Cloudflare Tunnel - Tiasas"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel Description "Cloudflare tunnel for app.tiasas.online"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel Start SERVICE_AUTO_START
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppStdout "C:\Users\srina\.cloudflared\tunnel.log"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppStderr "C:\Users\srina\.cloudflared\tunnel-error.log"
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppRotateFiles 1
"C:\Program Files\nssm\win64\nssm.exe" set CloudflareTunnel AppRotateBytes 10485760

echo.
echo Service installed successfully!
echo.
echo Starting service...
net start CloudflareTunnel

echo.
echo === Setup Complete! ===
echo.
echo Service name: CloudflareTunnel
echo Display name: Cloudflare Tunnel - Tiasas
echo Status: Running
echo.
echo Useful commands:
echo   net start CloudflareTunnel     - Start service
echo   net stop CloudflareTunnel      - Stop service
echo   net restart CloudflareTunnel   - Restart service
echo   sc query CloudflareTunnel      - Check status
echo.
echo Logs location: C:\Users\srina\.cloudflared\tunnel.log
echo.
pause
