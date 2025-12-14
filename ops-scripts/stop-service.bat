@echo off
powershell -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0stop-service.ps1\"' -Verb RunAs -Wait"
pause
