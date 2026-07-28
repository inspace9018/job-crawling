@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Remember login - save session only
echo ============================================
node scripts\remember-login.mjs
pause
