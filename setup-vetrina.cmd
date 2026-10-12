@echo off
REM ============================================================
REM  Sito vetrina Luis: build + servizio Windows LuisVetrina (via nssm)
REM  Eseguire come Administrator dalla root del repo, UNA volta
REM  (gli aggiornamenti successivi li fa deploy-prod.cmd).
REM  Idempotente: rimuove e ricrea il servizio.
REM
REM  Per ora SOLO INTRANET: http://<ip-server>:3002
REM  Caddy e il portale B2B non vengono toccati.
REM  Requisito: backend LuisBackend attivo su localhost:3001.
REM ============================================================
setlocal enabledelayedexpansion

set SVC_VE=LuisVetrina
set VE_PORT=3002

cd /d "%~dp0"
set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

set NODE_EXE=
for /f "delims=" %%n in ('where node 2^>nul') do if not defined NODE_EXE set NODE_EXE=%%n
if not defined NODE_EXE echo [ERRORE] node non e' nel PATH. & goto err

set NSSM=
for /f "delims=" %%n in ('where nssm 2^>nul') do if not defined NSSM set NSSM=%%n
if not defined NSSM if exist "%ROOT%\nssm.exe" set NSSM=%ROOT%\nssm.exe
if not defined NSSM echo [ERRORE] nssm non trovato: esegui prima setup-services.cmd. & goto err

echo.
echo === [1/3] Build vetrina ===
"!NSSM!" stop %SVC_VE% >nul 2>nul
cd frontend-vetrina || goto err
call npm ci || goto err
call npm run build || goto err
cd ..

echo.
echo === [2/3] Servizio %SVC_VE% (porta %VE_PORT%) ===
"!NSSM!" remove %SVC_VE% confirm >nul 2>nul
"!NSSM!" install %SVC_VE% "!NODE_EXE!" "node_modules\next\dist\bin\next" start -p %VE_PORT% || goto err
"!NSSM!" set %SVC_VE% AppDirectory "%ROOT%\frontend-vetrina" || goto err
"!NSSM!" set %SVC_VE% AppEnvironmentExtra NODE_ENV=production BACKEND_INTERNAL_URL=http://localhost:3001
"!NSSM!" set %SVC_VE% Start SERVICE_AUTO_START
"!NSSM!" set %SVC_VE% AppStdout "%ROOT%\frontend-vetrina\service-out.log"
"!NSSM!" set %SVC_VE% AppStderr "%ROOT%\frontend-vetrina\service-err.log"
"!NSSM!" start %SVC_VE% || goto err

echo.
echo === [3/3] Firewall: porta %VE_PORT% solo rete interna (profili Dominio/Privato) ===
netsh advfirewall firewall delete rule name="Luis Vetrina %VE_PORT%" >nul 2>nul
netsh advfirewall firewall add rule name="Luis Vetrina %VE_PORT%" dir=in action=allow protocol=TCP localport=%VE_PORT% profile=domain,private || goto err

echo.
echo === FATTO ===
echo Vetrina in intranet: http://^<ip-server^>:%VE_PORT%
echo Comandi utili: nssm restart %SVC_VE%  ^|  nssm status %SVC_VE%  ^|  log: frontend-vetrina\service-*.log
echo Quando sara' pronto www.luisbg.it: aggiungere il blocco Caddy (vedi SETUP-PRODUZIONE.md).
echo.
pause
goto :eof

:err
echo.
echo *** ERRORE setup vetrina (codice %errorlevel%). ***
pause
exit /b %errorlevel%
