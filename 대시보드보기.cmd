@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Opening dashboard in your browser...
start "job-dashboard" /min cmd /c "node scripts\serve.mjs 8787"
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:8787/"
echo Opened. You can close this window.
ping -n 4 127.0.0.1 >nul
