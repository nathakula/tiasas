@echo off
REM Check Tiasas Services Status

echo === Tiasas Services Status ===
echo.

echo [TiasasWeb Service]
sc query TiasasWeb 2>nul
if errorlevel 1 (
    echo   Status: NOT INSTALLED
) else (
    sc query TiasasWeb | findstr "STATE"
)

echo.
echo [CloudflareTunnel Service]
sc query CloudflareTunnel 2>nul
if errorlevel 1 (
    echo   Status: NOT INSTALLED
) else (
    sc query CloudflareTunnel | findstr "STATE"
)

echo.
echo === Access Points ===
echo   Local:  http://localhost:13000
echo   Public: https://app.tiasas.online
echo.

echo Testing local connection...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:13000 2>nul
if errorlevel 1 (
    echo   Local server: NOT RESPONDING
) else (
    echo   Local server: RESPONDING
)

echo.
pause
