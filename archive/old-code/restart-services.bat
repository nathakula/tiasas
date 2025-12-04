@echo off
REM Restart Tiasas Services
REM Run this as Administrator

echo === Restarting Tiasas Services ===
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Stopping services...
net stop TiasasWeb 2>nul
net stop CloudflareTunnel 2>nul

echo.
echo Starting services...
net start TiasasWeb
net start CloudflareTunnel

echo.
echo === Services Status ===
sc query TiasasWeb | findstr "STATE"
sc query CloudflareTunnel | findstr "STATE"

echo.
echo === Access Points ===
echo   Local:  http://localhost:13000
echo   Public: https://app.tiasas.online
echo.
pause
