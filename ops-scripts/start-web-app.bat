@echo off
cd /d "D:\GenAi\Projects\Tiasas"
echo Starting TiasasWeb...
pnpm --filter @tiasas/web start
REM The above command blocks and keeps running
REM If it exits, pause to see the error
pause
