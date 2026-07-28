@echo off
chcp 65001 >nul
setlocal EnableExtensions
REM Node.js 18+ 없거나 구버전이면 winget 으로 LTS 설치 제안 (Windows)
set "MIN_MAJOR=18"

where node >nul 2>&1
if errorlevel 1 goto NEED_INSTALL

node -e "process.exit(parseInt(process.version.slice(1),10)>=%MIN_MAJOR%?0:1)" >nul 2>&1
if errorlevel 1 goto NEED_INSTALL

exit /b 0

:NEED_INSTALL
echo.
echo ============================================
echo   Node.js LTS 가 필요합니다
echo ============================================
where node >nul 2>&1
if errorlevel 1 (
  echo   PC에 Node.js 가 없거나 PATH 에 없습니다.
) else (
  for /f "delims=" %%v in ('node -p "process.version"') do echo   현재 버전: %%v  ^(필요: v%MIN_MAJOR% 이상^)
)
echo.
echo   공고 찾기는 Node.js LTS 설치 후에 실행됩니다.
echo.

where winget >nul 2>&1
if errorlevel 1 goto NO_WINGET

set "INSTALL_ANS="
set /p "INSTALL_ANS=지금 Node.js LTS 를 설치할까요? (Y/N): "
if /i not "%INSTALL_ANS%"=="Y" goto USER_DECLINED

echo.
echo   winget 으로 Node.js LTS 설치 중… 관리자 확인 창이 뜰 수 있습니다.
echo.
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo.
  echo   자동 설치에 실패했습니다. https://nodejs.org/ 에서 LTS 를 직접 설치해 주세요.
  pause
  exit /b 1
)

echo.
echo   설치가 끝났습니다.
echo   이 창을 닫고 공고새로찾기.cmd 를 다시 실행해 주세요.
echo   ^(PATH 반영을 위해 한 번 다시 실행하는 것이 안전합니다.^)
echo.
pause
exit /b 1

:NO_WINGET
echo   winget 을 사용할 수 없습니다.
echo   https://nodejs.org/ 에서 LTS 를 설치한 뒤 다시 실행해 주세요.
echo.
pause
exit /b 1

:USER_DECLINED
echo.
echo   Node.js 설치 후 다시 실행해 주세요.
pause
exit /b 1
