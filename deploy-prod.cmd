@echo off
REM ============================================================
REM  Aggiornamento produzione Portale B2B Luis (selettivo)
REM  Eseguire come Administrator dalla root del repo.
REM
REM  1) backup DB  2) scelta: 0 tutto, 1 solo B2B, 2 solo vetrina
REM  3) stop dei soli servizi coinvolti  4) allinea codice
REM  5) npm ci + migrate + build del solo target  6) restart + health
REM  Usa SEMPRE npm ci (versioni bloccate): mai npm install a mano.
REM ============================================================
setlocal enabledelayedexpansion

set SVC_BE=LuisBackend
set SVC_FE=LuisFrontend
set SVC_CADDY=LuisCaddy
set SVC_VE=LuisVetrina
set PG_USER=postgres
set PG_DB=LuisSrlDb
set BACKUP_DIR=C:\backup
set FE_PORT=3000
set VE_PORT=3012
set TARGET=0
set DO_BE=0
set DO_FE=0
set DO_VE=0

cd /d "%~dp0"

REM --- Rilevo nssm e i servizi ---
set NSSM=
for /f "delims=" %%n in ('where nssm 2^>nul') do if not defined NSSM set NSSM=%%n
if not defined NSSM if exist "%~dp0nssm.exe" set NSSM=%~dp0nssm.exe
set USE_SVC=0
if defined NSSM "!NSSM!" status %SVC_BE% >nul 2>nul && set USE_SVC=1
REM Vetrina: inclusa solo se il servizio esiste (creato da setup-vetrina.cmd)
set USE_VE=0
if defined NSSM "!NSSM!" status %SVC_VE% >nul 2>nul && set USE_VE=1

REM --- [1/8] Backup DB (facoltativo) ---
echo.
echo === [1/8] Backup del database ===
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

REM --- [2/8] Scelta cosa aggiornare ---
echo.
echo === [2/8] Cosa aggiornare ===
echo   0 = tutto (portale B2B + sito vetrina)
echo   1 = solo portale B2B
echo   2 = solo sito vetrina
set /p TARGET=Scelta [0/1/2] (invio = 0):
if "!TARGET!"=="" set TARGET=0
if "!TARGET!"=="0" goto scelta_ok
if "!TARGET!"=="1" goto scelta_ok
if "!TARGET!"=="2" goto scelta_ok
echo [ERRORE] Scelta non valida: usare 0, 1 o 2.
goto :err_scelta

:scelta_ok
if "!TARGET!"=="0" set DO_BE=1
if "!TARGET!"=="0" set DO_FE=1
if "!TARGET!"=="0" set DO_VE=1
if "!TARGET!"=="1" set DO_BE=1
if "!TARGET!"=="1" set DO_FE=1
if "!TARGET!"=="2" set DO_VE=1

if "!TARGET!"=="0" if "!USE_VE!"=="0" (
  echo [avviso] Sito vetrina non installato: aggiorno solo il portale B2B.
  set DO_VE=0
)
if "!TARGET!"=="2" if "!USE_VE!"=="0" (
  echo [ERRORE] Sito vetrina non installato: servizio %SVC_VE% assente.
  echo          Eseguire una volta, come Administrator: setup-vetrina.cmd
  goto :err_scelta
)

if "!TARGET!"=="0" if "!DO_VE!"=="1" echo Aggiorno: portale B2B + sito vetrina.
if "!TARGET!"=="0" if "!DO_VE!"=="0" echo Aggiorno: solo portale B2B (vetrina non installata).
if "!TARGET!"=="1" echo Aggiorno: solo portale B2B (la vetrina non viene ricostruita).
if "!TARGET!"=="2" echo Aggiorno: solo sito vetrina (il backend condiviso non viene ricostruito).
if "!TARGET!"=="2" echo [nota] La vetrina usa le API del portale: se il backend e' cambiato, aggiorna prima il B2B.

REM --- [3/8] Stop dei soli servizi coinvolti ---
echo.
echo === [3/8] Fermo i servizi ===
if not exist "%~dp0maintenance" mkdir "%~dp0maintenance"
REM Flag condiviso dai due siti: Caddy mostra la cortesia a entrambi.
if "!DO_FE!"=="1" echo maintenance>"%~dp0maintenance\maintenance.flag"
if "!DO_VE!"=="1" echo maintenance>"%~dp0maintenance\maintenance.flag"
if "!DO_FE!"=="1" echo Pagina di cortesia ATTIVA (portale e vetrina: flag condiviso).
if "!DO_FE!"=="0" if "!DO_VE!"=="1" echo Pagina di cortesia ATTIVA (vetrina e portale: flag condiviso).

if "!USE_SVC!"=="1" goto svc_stop
echo Nessun servizio rilevato. Se il portale gira in una finestra, CHIUDILA ora.
pause
goto pull

:svc_stop
if "!DO_FE!"=="1" "!NSSM!" stop %SVC_FE% >nul 2>nul
if "!DO_VE!"=="1" "!NSSM!" stop %SVC_VE% >nul 2>nul
if "!DO_BE!"=="1" "!NSSM!" stop %SVC_BE% >nul 2>nul
timeout /t 3 /nobreak >nul

:pull
REM --- [4/8] Allineo il codice ---
echo.
echo === [4/8] Aggiorno il codice ===
git fetch origin || goto :err
REM Se ci sono modifiche locali tracciate, le metto da parte (stash) per non perderle
git diff --quiet
if not errorlevel 1 goto no_stash
echo Modifiche locali rilevate: le salvo in stash...
git stash push -u -m "deploy-prod auto-stash" || goto :err
:no_stash
git merge --ff-only origin/master
if errorlevel 1 goto diverged

REM --- [5/8] Backend: dipendenze + migrate + build (solo se si aggiorna il B2B) ---
if not "!DO_BE!"=="1" goto after_be
echo.
echo === [5/8] Backend ===
cd backend || goto :err
call npm ci || goto :err
call npx prisma generate || goto :err
call npx prisma migrate deploy || goto :err
REM SQL manuali idempotenti (non gestiti dalle migration Prisma): sicuri a ogni deploy.
REM   - embedding-setup.sql: tabella pgvector per la ricerca semantica (CREATE ... IF NOT EXISTS)
call npx prisma db execute --file prisma/embedding-setup.sql || goto :err
call npm run build || goto :err
cd ..
:after_be

REM --- [6/8] Frontend B2B: dipendenze + build (solo se si aggiorna il B2B) ---
if not "!DO_FE!"=="1" goto after_fe
echo.
echo === [6/8] Frontend B2B ===
cd frontend || goto :err
call npm ci || goto :err
call npm run build || goto :err
cd ..
:after_fe

REM --- [7/8] Vetrina: dipendenze + build (solo se si aggiorna la vetrina) ---
if not "!DO_VE!"=="1" goto after_ve
echo.
echo === [7/8] Sito vetrina ===
cd frontend-vetrina || goto :err
call npm ci || goto :err
call npm run build || goto :err
cd ..
:after_ve

REM --- [8/8] Restart ---
echo.
echo === [8/8] Riavvio ===
if "!USE_SVC!"=="1" goto svc_start
if "!DO_BE!"=="1" start "Portale B2B Backend" cmd /k "cd /d %~dp0backend && npm run start:prod"
if "!DO_FE!"=="1" start "Portale B2B Frontend" cmd /k "cd /d %~dp0frontend && npm run start"
goto healthwait_start

:svc_start
if "!DO_BE!"=="1" "!NSSM!" start %SVC_BE% || goto :err
if "!DO_FE!"=="1" "!NSSM!" start %SVC_FE% || goto :err
if "!DO_VE!"=="1" "!NSSM!" start %SVC_VE% || goto :err
REM Caddy non serve riavviarlo per un rilascio parziale: si tocca solo con l'aggiornamento completo.
if "!TARGET!"=="0" if defined NSSM "!NSSM!" restart %SVC_CADDY% >nul 2>nul

:healthwait_start
REM --- Attendo che i siti aggiornati rispondano davvero, poi tolgo la pagina di cortesia ---
echo.
echo === Attendo che i siti aggiornati siano online... ===
set /a TRIES=0
:healthwait
set /a TRIES+=1
set OK=1
if "!DO_FE!"=="1" (
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing 'http://localhost:%FE_PORT%/api/health' -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
  if errorlevel 1 set OK=0
)
if "!DO_VE!"=="1" (
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:%VE_PORT%' -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
  if errorlevel 1 set OK=0
)
if "!OK!"=="1" goto healthok
if !TRIES! geq 30 goto healthtimeout
timeout /t 2 /nobreak >nul
goto healthwait

:healthtimeout
echo [avviso] i siti aggiornati non hanno risposto entro il timeout: lascio ATTIVA la pagina di cortesia.
echo          Verifica i servizi, poi togli il flag:  del "%~dp0maintenance\maintenance.flag"
goto done

:healthok
del "%~dp0maintenance\maintenance.flag" >nul 2>nul
echo Siti aggiornati online: pagina di cortesia disattivata.

:done
echo.
echo === AGGIORNAMENTO COMPLETATO ===
echo (Se prima e' stato fatto uno stash: recuperalo con "git stash pop" se ti serviva.)
echo.
if "!TARGET!"=="0" if "!DO_VE!"=="1" echo Aggiornati: portale B2B ^(shop^) e sito vetrina ^(www^).
if "!TARGET!"=="0" if "!DO_VE!"=="0" echo Aggiornato: solo portale B2B ^(vetrina non installata^).
if "!TARGET!"=="1" echo Aggiornato: solo portale B2B. La vetrina NON e' stata ricostruita.
if "!TARGET!"=="2" echo Aggiornato: solo sito vetrina. Il portale B2B NON e' stato ricostruito.
if "!DO_FE!"=="1" echo Portale B2B: http://localhost:%FE_PORT%
if "!DO_VE!"=="1" echo Sito vetrina: http://localhost:%VE_PORT%
echo.
pause
goto :eof

:diverged
echo.
echo *** Il branch locale diverge da origin/master (commit locali non pushati). ***
echo *** Risolvi a mano: git log --oneline origin/master..HEAD   poi decidi merge/reset. ***
echo *** I servizi sono FERMI: riavviali con i comandi sotto. ***
if "!DO_BE!"=="1" echo ***   nssm start %SVC_BE%
if "!DO_FE!"=="1" echo ***   nssm start %SVC_FE%
if "!DO_VE!"=="1" echo ***   nssm start %SVC_VE%
echo *** Pagina di cortesia ancora ATTIVA: dopo aver riavviato togli  del "%~dp0maintenance\maintenance.flag" ***
pause
exit /b 1

:err_scelta
echo.
echo *** Aggiornamento annullato: nessun servizio fermato. ***
pause
exit /b 1

:err
echo.
echo *** ERRORE durante l'aggiornamento (codice %errorlevel%). Interrotto. ***
echo *** I servizi fermati vanno riavviati a mano: ***
if "!DO_BE!"=="1" echo ***   nssm start %SVC_BE%
if "!DO_FE!"=="1" echo ***   nssm start %SVC_FE%
if "!DO_VE!"=="1" echo ***   nssm start %SVC_VE%
echo *** La pagina di cortesia resta ATTIVA (sito non pronto). Quando tutto e' ok togli il flag: ***
echo ***   del "%~dp0maintenance\maintenance.flag" ***
pause
exit /b %errorlevel%
