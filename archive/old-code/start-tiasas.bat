@echo off
REM Start Tiasas Web Application
REM This script starts the Next.js app in production mode

echo Starting Tiasas Web Application...
echo.

cd /d "d:\GenAi\Projects\Tiasas\apps\web"

REM Check if .next folder exists (built)
if not exist ".next" (
    echo Building application first...
    call npm run build
    if errorlevel 1 (
        echo Build failed!
        pause
        exit /b 1
    )
)

echo Starting Next.js server on port 13000...
set PORT=13000
npm start
