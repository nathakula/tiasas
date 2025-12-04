@echo off
REM Stop Tiasas Services
REM Run this as Administrator

echo === Stopping Tiasas Services ===
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
net stop TiasasWeb
net stop CloudflareTunnel

echo.
echo === Services Status ===
sc query TiasasWeb | findstr "STATE"
sc query CloudflareTunnel | findstr "STATE"

echo.
echo Services stopped.
pause
