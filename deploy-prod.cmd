@echo off
REM ============================================================
REM  Aggiornamento produzione Portale B2B Luis (sicuro)
REM  Eseguire come Administrator dalla root del repo.
REM
REM  1) backup DB  2) stop servizi  3) allinea codice (stash se serve)
REM  4) npm ci  5) migrate  6) build BE+FE  7) restart servizi
REM  Usa SEMPRE npm ci (versioni bloccate): mai npm install a mano.
REM ============================================================
setlocal enabledelayedexpansion

set SVC_BE=LuisBackend
set SVC_FE=LuisFrontend
set SVC_CADDY=LuisCaddy
set PG_USER=postgres
set PG_DB=LuisSrlDb
set BACKUP_DIR=C:\backup

cd /d "%~dp0"

REM --- Rilevo nssm e i servizi ---
set NSSM=
for /f "delims=" %%n in ('where nssm 2^>nul') do if not defined NSSM set NSSM=%%n
if not defined NSSM if exist "%~dp0nssm.exe" set NSSM=%~dp0nssm.exe
set USE_SVC=0
if defined NSSM "!NSSM!" status %SVC_BE% >nul 2>nul && set USE_SVC=1

REM --- [1/6] Backup DB (facoltativo) ---
echo.
echo === [1/6] Backup del database ===
set DOBK=
set /p DOBK=Faccio un backup del DB prima di aggiornare? [S/n]:
if /i "!DOBK!"=="n" goto after_backup
set PGDUMP=
for /f "delims=" %%p in ('dir /b /s "C:\Program Files\PostgreSQL\pg_dump.exe" 2^>nul') do set PGDUMP=%%p
if not defined PGDUMP echo [avviso] pg_dump non trovato: salto il backup. & goto after_backup
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
set STAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%
set STAMP=!STAMP: =0!
echo Backup in %BACKUP_DIR%\%PG_DB%_!STAMP!.dump (chiede la password postgres)...
"!PGDUMP!" -U %PG_USER% -d %PG_DB% -F c -f "%BACKUP_DIR%\%PG_DB%_!STAMP!.dump" || goto :err

:after_backup

REM --- [2/6] Stop servizi ---
echo.
echo === [2/6] Fermo i servizi ===
if "!USE_SVC!"=="1" goto svc_stop
echo Nessun servizio rilevato. Se il backend gira in una finestra, CHIUDILA ora.
pause
goto pull

:svc_stop
"!NSSM!" stop %SVC_FE% >nul 2>nul
"!NSSM!" stop %SVC_BE% >nul 2>nul
timeout /t 3 /nobreak >nul

:pull
REM --- [3/6] Allineo il codice ---
echo.
echo === [3/6] Aggiorno il codice ===
git fetch origin || goto :err
REM Se ci sono modifiche locali tracciate, le metto da parte (stash) per non perderle
git diff --quiet
if not errorlevel 1 goto no_stash
echo Modifiche locali rilevate: le salvo in stash...
git stash push -u -m "deploy-prod auto-stash" || goto :err
:no_stash
git merge --ff-only origin/master
if errorlevel 1 goto diverged

REM --- [4/6] Backend: dipendenze + migrate + build ---
echo.
echo === [4/6] Backend ===
cd backend || goto :err
call npm ci || goto :err
call npx prisma generate || goto :err
call npx prisma migrate deploy || goto :err
call npm run build || goto :err

REM --- [5/6] Frontend: dipendenze + build ---
echo.
echo === [5/6] Frontend ===
cd ..\frontend || goto :err
call npm ci || goto :err
call npm run build || goto :err
cd ..

REM --- [6/6] Restart ---
echo.
echo === [6/6] Riavvio ===
if "!USE_SVC!"=="1" goto svc_start
start "Portale B2B Backend" cmd /k "cd /d %~dp0backend && npm run start:prod"
start "Portale B2B Frontend" cmd /k "cd /d %~dp0frontend && npm run start"
goto done

:svc_start
"!NSSM!" start %SVC_BE% || goto :err
"!NSSM!" start %SVC_FE% || goto :err
if defined NSSM "!NSSM!" status %SVC_CADDY% >nul 2>nul && "!NSSM!" restart %SVC_CADDY% >nul 2>nul

:done
echo.
echo === AGGIORNAMENTO COMPLETATO ===
echo (Se prima e' stato fatto uno stash: recuperalo con "git stash pop" se ti serviva.)
echo.
pause
goto :eof

:diverged
echo.
echo *** Il branch locale diverge da origin/master (commit locali non pushati). ***
echo *** Risolvi a mano: git log --oneline origin/master..HEAD   poi decidi merge/reset. ***
echo *** I servizi sono FERMI: riavviali con  nssm start %SVC_BE% ^&^& nssm start %SVC_FE% ***
pause
exit /b 1

:err
echo.
echo *** ERRORE durante l'aggiornamento (codice %errorlevel%). Interrotto. ***
if "!USE_SVC!"=="1" echo *** Servizi fermi: riavviali con  nssm start %SVC_BE% ^&^& nssm start %SVC_FE% ***
pause
exit /b %errorlevel%
