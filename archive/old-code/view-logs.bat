@echo off
REM View Tiasas Logs

echo === Tiasas Logs ===
echo.
echo Select which log to view:
echo.
echo [1] Web App Log (app.log)
echo [2] Web App Errors (error.log)
echo [3] Cloudflare Tunnel Log
echo [4] View All Logs
echo [5] Exit
echo.

choice /C 12345 /N /M "Enter your choice (1-5): "

if errorlevel 5 goto :eof
if errorlevel 4 goto :all
if errorlevel 3 goto :tunnel
if errorlevel 2 goto :error
if errorlevel 1 goto :app

:app
echo.
echo Opening Web App Log...
if exist "d:\GenAi\Projects\Tiasas\apps\web\logs\app.log" (
    notepad "d:\GenAi\Projects\Tiasas\apps\web\logs\app.log"
) else (
    echo Log file not found: d:\GenAi\Projects\Tiasas\apps\web\logs\app.log
    pause
)
goto :eof

:error
echo.
echo Opening Web App Error Log...
if exist "d:\GenAi\Projects\Tiasas\apps\web\logs\error.log" (
    notepad "d:\GenAi\Projects\Tiasas\apps\web\logs\error.log"
) else (
    echo Log file not found: d:\GenAi\Projects\Tiasas\apps\web\logs\error.log
    pause
)
goto :eof

:tunnel
echo.
echo Opening Cloudflare Tunnel Log...
if exist "C:\Users\srina\.cloudflared\tunnel.log" (
    notepad "C:\Users\srina\.cloudflared\tunnel.log"
) else (
    echo Log file not found: C:\Users\srina\.cloudflared\tunnel.log
    pause
)
goto :eof

:all
echo.
echo Opening all logs...
start notepad "d:\GenAi\Projects\Tiasas\apps\web\logs\app.log"
start notepad "d:\GenAi\Projects\Tiasas\apps\web\logs\error.log"
start notepad "C:\Users\srina\.cloudflared\tunnel.log"
goto :eof
