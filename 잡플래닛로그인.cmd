@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Jobplanet login - save session
echo ============================================
node scripts\jobplanet-login.mjs
echo.
pause
