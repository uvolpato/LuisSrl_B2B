@echo off
REM ============================================================
REM  Deploy produzione Portale B2B Luis
REM  Eseguire dalla root del repo (es. C:\Program Files\Git\www\portale)
REM
REM  IMPORTANTE: prima di lanciare questo script CHIUDI la finestra
REM  in cui gira il backend (tiene bloccati i file nativi come argon2).
REM ============================================================
setlocal

REM Vai nella cartella dello script (root del repo)
cd /d "%~dp0"

echo.
echo *** Assicurati di aver CHIUSO la finestra del backend prima di continuare ***
pause

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
echo === Avvio il backend in una nuova finestra ===
start "Portale B2B Backend" cmd /k "npm run start:prod"

echo.
echo === DEPLOY COMPLETATO (backend avviato nella nuova finestra) ===
pause
goto :eof

:err
echo.
echo *** ERRORE durante il deploy (codice %errorlevel%). Interrotto. ***
echo *** Il backend NON e' stato riavviato: avvialo con "npm run start:prod" ***
pause
exit /b %errorlevel%
