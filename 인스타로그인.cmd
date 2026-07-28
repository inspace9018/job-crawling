@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Instagram login - session only
echo ============================================
node scripts\instagram-login.mjs
echo.
pause
