@echo off
REM Remove NSSM services
REM Run this as Administrator

echo === Removing NSSM Services ===
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    pause
    exit /b 1
)

echo Stopping and removing services...
net stop TiasasWeb 2>nul
net stop CloudflareTunnel 2>nul

"C:\Program Files\nssm\win64\nssm.exe" remove TiasasWeb confirm
"C:\Program Files\nssm\win64\nssm.exe" remove CloudflareTunnel confirm

echo.
echo Services removed.
pause
