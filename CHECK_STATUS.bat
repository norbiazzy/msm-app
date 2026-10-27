@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~1"
if not defined ROOT set "ROOT=D:\job\it\msm-app"
if not exist "%ROOT%\backend\prisma\schema.prisma" (
  echo MSM project not found: %ROOT%
  pause
  exit /b 1
)
echo [MSM] File library source check:
node "%~dp0apply-update.cjs" --check "%ROOT%"
if errorlevel 1 goto failed
echo.
echo [MSM] Database migration status:
pushd "%ROOT%\backend"
call npx prisma migrate status
set "RESULT=%ERRORLEVEL%"
popd
if not "%RESULT%"=="0" goto failed
echo.
echo Check completed. Open http://localhost:5173/#files after restarting app.
pause
exit /b 0
:failed
echo.
echo Check failed. Look at the message above.
pause
exit /b 1
