@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo MSM - Обновление общего пула файлов
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Install Node.js or use existing project PC.
  pause
  exit /b 1
)
node "%~dp0apply-update.cjs"
if errorlevel 1 (
  echo Failed. See error above. Existing files were not overwritten.
  pause
  exit /b 1
)
echo.
echo Make a PostgreSQL backup before applying migrations.
echo Press any key to run the safe Prisma migration and builds.
pause >nul
pushd backend
call npx prisma migrate deploy
if errorlevel 1 goto failed
call npx prisma generate
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
popd
pushd frontend
call npm run build
if errorlevel 1 goto failed
popd
echo.
echo SUCCESS. Restart the MSM backend and frontend.
pause
exit /b 0
:failed
echo ERROR. Check the message, do not use prisma migrate reset.
popd
pause
exit /b 1
