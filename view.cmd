@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Opening dashboard in your browser...
start "job-dashboard" /min cmd /c "node scripts\serve.mjs 8787"
ping -n 3 127.0.0.1 >nul
rem 주소 끝 v=... 는 매번 달라져서 브라우저가 옛 화면을 재사용하지 않게 합니다
start "" "http://localhost:8787/?v=%RANDOM%%TIME:~9,2%"
echo Opened. You can close this window.
ping -n 4 127.0.0.1 >nul
