@echo off
REM ============================================================
REM  Deploy produzione Portale B2B Luis
REM  Eseguire dalla root del repo (es. C:\Program Files\Git\www\portale)
REM ============================================================
setlocal

REM Vai nella cartella dello script (root del repo)
cd /d "%~dp0"

echo.
echo === [1/5] Aggiorno il codice (git pull) ===
git pull || goto :err

echo.
echo === [2/5] Installo dipendenze backend ===
cd backend || goto :err
call npm ci || goto :err

echo.
echo === [3/5] Prisma generate ===
call npx prisma generate || goto :err

echo.
echo === [4/5] Applico le migration al DB ===
call npx prisma migrate deploy || goto :err

echo.
echo === [5/5] Build backend ===
call npm run build || goto :err

echo.
echo === Riavvio servizio (pm2) ===
where pm2 >nul 2>nul && (
  call pm2 restart portale-backend || echo [avviso] pm2 restart fallito, riavvia il backend manualmente
) || echo [avviso] pm2 non trovato: riavvia il backend manualmente

echo.
echo === DEPLOY COMPLETATO ===
pause
goto :eof

:err
echo.
echo *** ERRORE durante il deploy (codice %errorlevel%). Interrotto. ***
pause
exit /b %errorlevel%
