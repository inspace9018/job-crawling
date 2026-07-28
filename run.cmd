@echo off
chcp 65001 >nul
cd /d "%~dp0"
call scripts\ensure-node.cmd
if errorlevel 1 exit /b 1
echo ============================================
echo   Finding job postings - please wait
echo   Keep this window open
echo ============================================
node scripts\find-jobs.mjs
if errorlevel 1 goto FIND_FAIL
goto FIND_OK
:FIND_FAIL
echo.
echo Search failed. Check messages above.
echo Dashboard opens only after success.
pause
exit /b 1
:FIND_OK
echo.
echo Opening dashboard in your browser...
start "job-dashboard" /min cmd /c "node scripts\serve.mjs 8787"
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:8787/"
echo.
echo Done. Check your browser. You can close this window.
ping -n 6 127.0.0.1 >nul
