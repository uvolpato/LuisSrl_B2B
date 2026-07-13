@echo off
REM ============================================================
REM  Deploy produzione Portale B2B Luis
REM  Eseguire come Administrator dalla root del repo.
REM  Se esistono i servizi Windows (setup-services.cmd) li ferma
REM  prima della build e li riavvia alla fine. Altrimenti usa le
REM  finestre: in quel caso CHIUDI a mano la finestra del backend.
REM ============================================================
setlocal enabledelayedexpansion

set SVC_BE=LuisBackend
set SVC_FE=LuisFrontend

cd /d "%~dp0"

REM --- Rilevo nssm e i servizi ---
set NSSM=
for /f "delims=" %%n in ('where nssm 2^>nul') do if not defined NSSM set NSSM=%%n
if not defined NSSM if exist "%~dp0nssm.exe" set NSSM=%~dp0nssm.exe
set USE_SVC=0
if defined NSSM "!NSSM!" status %SVC_BE% >nul 2>nul && set USE_SVC=1

if "!USE_SVC!"=="1" goto svc_stop
echo.
echo *** Nessun servizio: assicurati di aver CHIUSO la finestra del backend ***
pause
goto pull

:svc_stop
echo.
echo === Fermo i servizi (%SVC_BE%, %SVC_FE%) ===
"!NSSM!" stop %SVC_FE% >nul 2>nul
"!NSSM!" stop %SVC_BE% >nul 2>nul
timeout /t 3 /nobreak >nul

:pull
echo.
echo === [1/6] Aggiorno il codice (git pull) ===
git pull || goto :err

echo.
echo === [2/6] Backend: npm ci ===
cd backend || goto :err
call npm ci || goto :err

echo.
echo === [3/6] Backend: prisma generate + migrate + build ===
call npx prisma generate || goto :err
call npx prisma migrate deploy || goto :err
call npm run build || goto :err

echo.
echo === [4/6] Frontend: npm ci + build ===
cd ..\frontend || goto :err
call npm ci || goto :err
call npm run build || goto :err
cd ..

echo.
echo === [5/6] Riavvio applicazione ===
if "!USE_SVC!"=="1" goto svc_start
start "Portale B2B Backend" cmd /k "cd /d %~dp0backend && npm run start:prod"
start "Portale B2B Frontend" cmd /k "cd /d %~dp0frontend && npm run start"
goto done

:svc_start
"!NSSM!" start %SVC_BE% || goto :err
"!NSSM!" start %SVC_FE% || goto :err

:done
echo.
echo === [6/6] DEPLOY COMPLETATO ===
pause
goto :eof

:err
echo.
echo *** ERRORE durante il deploy (codice %errorlevel%). Interrotto. ***
if "!USE_SVC!"=="1" echo *** Riavvia i servizi con: nssm start %SVC_BE% ^&^& nssm start %SVC_FE% ***
pause
exit /b %errorlevel%
