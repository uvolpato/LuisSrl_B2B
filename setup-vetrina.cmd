@echo off
REM ============================================================
REM  Sito vetrina Luis: build + servizio Windows LuisVetrina + Caddy
REM  Eseguire come Administrator dalla root del repo, UNA volta
REM  (gli aggiornamenti successivi li fa deploy-prod.cmd).
REM  Idempotente: rimuove e ricrea il servizio, riscrive Caddyfile.vetrina.
REM
REM  Per ora SOLO INTRANET: http://<ip-server>:3002
REM    browser -> Caddy :3002 -> Next 127.0.0.1:3012 (non raggiungibile dalla rete)
REM  Caddy serve la pagina di cortesia maintenance\vetrina.html durante deploy-prod.cmd
REM  (stesso flag del portale). Il Caddyfile esistente NON viene riscritto: si aggiunge
REM  solo la riga "import Caddyfile.vetrina" (con backup e validazione prima del riavvio).
REM  Requisito: backend LuisBackend attivo su localhost:3001, servizio LuisCaddy.
REM ============================================================
setlocal enabledelayedexpansion

set SVC_VE=LuisVetrina
set SVC_CADDY=LuisCaddy
set VE_PORT=3002
set VE_INT_PORT=3012
REM Indirizzo del sito in Caddy. Go-live: set VE_SITE=www.luisbg.it (HTTPS automatico, porte 80/443).
set VE_SITE=http://:%VE_PORT%

cd /d "%~dp0"
set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%
set ROOT_FWD=%ROOT:\=/%

set NODE_EXE=
for /f "delims=" %%n in ('where node 2^>nul') do if not defined NODE_EXE set NODE_EXE=%%n
if not defined NODE_EXE echo [ERRORE] node non e' nel PATH. & goto err

set NSSM=
for /f "delims=" %%n in ('where nssm 2^>nul') do if not defined NSSM set NSSM=%%n
if not defined NSSM if exist "%ROOT%\nssm.exe" set NSSM=%ROOT%\nssm.exe
if not defined NSSM echo [ERRORE] nssm non trovato: esegui prima setup-services.cmd. & goto err

set CADDY=
for /f "delims=" %%n in ('where caddy 2^>nul') do if not defined CADDY set CADDY=%%n
if not defined CADDY if exist "%ROOT%\caddy.exe" set CADDY=%ROOT%\caddy.exe
if not defined CADDY echo [ERRORE] caddy non trovato: esegui prima setup-services.cmd. & goto err
if not exist "%ROOT%\Caddyfile" echo [ERRORE] Caddyfile non trovato in %ROOT%. & goto err

echo.
echo === [1/4] Build vetrina ===
REM Fermo il servizio: libera la porta e i file in uso durante npm ci.
"!NSSM!" stop %SVC_VE% >nul 2>nul
cd frontend-vetrina || goto err
call npm ci || goto err
call npm run build || goto err
cd ..

echo.
echo === [2/4] Servizio %SVC_VE% (127.0.0.1:%VE_INT_PORT%, solo locale) ===
"!NSSM!" remove %SVC_VE% confirm >nul 2>nul
"!NSSM!" install %SVC_VE% "!NODE_EXE!" "node_modules\next\dist\bin\next" start -p %VE_INT_PORT% -H 127.0.0.1 || goto err
"!NSSM!" set %SVC_VE% AppDirectory "%ROOT%\frontend-vetrina" || goto err
"!NSSM!" set %SVC_VE% AppEnvironmentExtra NODE_ENV=production BACKEND_INTERNAL_URL=http://localhost:3001
"!NSSM!" set %SVC_VE% Start SERVICE_AUTO_START
"!NSSM!" set %SVC_VE% AppStdout "%ROOT%\frontend-vetrina\service-out.log"
"!NSSM!" set %SVC_VE% AppStderr "%ROOT%\frontend-vetrina\service-err.log"
"!NSSM!" start %SVC_VE% || goto err

echo.
echo === [3/4] Caddy: porta %VE_PORT% con pagina di cortesia ===
(
  echo # Generato da setup-vetrina.cmd: sito vetrina in intranet. Non modificare a mano.
  echo # Indirizzo da VE_SITE in setup-vetrina.cmd ^(go-live: www.luisbg.it, vedi SETUP-PRODUZIONE.md^).
  echo %VE_SITE% {
  echo     @maintenance file {
  echo         root "!ROOT_FWD!/maintenance"
  echo         try_files /maintenance.flag
  echo     }
  echo     handle @maintenance {
  echo         root * "!ROOT_FWD!/maintenance"
  echo         rewrite * /vetrina.html
  echo         file_server
  echo         header Retry-After 120
  echo         header Cache-Control "no-store"
  echo     }
  echo     handle {
  echo         reverse_proxy 127.0.0.1:%VE_INT_PORT%
  echo     }
  echo }
)>"%ROOT%\Caddyfile.vetrina"

copy /y "%ROOT%\Caddyfile" "%ROOT%\Caddyfile.bak-vetrina" >nul || goto err
findstr /x /c:"import Caddyfile.vetrina" "%ROOT%\Caddyfile" >nul 2>nul
if errorlevel 1 (
  >>"%ROOT%\Caddyfile" echo.
  >>"%ROOT%\Caddyfile" echo import Caddyfile.vetrina
)
"!CADDY!" validate --config "%ROOT%\Caddyfile" --adapter caddyfile >nul 2>"%ROOT%\caddy-validate.log"
if errorlevel 1 (
  copy /y "%ROOT%\Caddyfile.bak-vetrina" "%ROOT%\Caddyfile" >nul
  echo [ERRORE] Configurazione Caddy non valida: Caddyfile ripristinato, Caddy NON riavviato.
  echo          Dettagli in caddy-validate.log
  goto err
)
"!NSSM!" restart %SVC_CADDY% || goto err

echo.
echo === [4/4] Firewall: porta %VE_PORT% solo rete interna (profili Dominio/Privato) ===
netsh advfirewall firewall delete rule name="Luis Vetrina %VE_PORT%" >nul 2>nul
netsh advfirewall firewall add rule name="Luis Vetrina %VE_PORT%" dir=in action=allow protocol=TCP localport=%VE_PORT% profile=domain,private || goto err

echo.
echo === FATTO ===
echo Vetrina in intranet: http://^<ip-server^>:%VE_PORT%   ^(sul server: http://localhost:%VE_PORT%^)
echo Durante deploy-prod.cmd compare la pagina di cortesia maintenance\vetrina.html.
echo Comandi utili: nssm restart %SVC_VE%  ^|  nssm status %SVC_VE%  ^|  log: frontend-vetrina\service-*.log
echo.
pause
goto :eof

:err
echo.
echo *** ERRORE setup vetrina (codice %errorlevel%). ***
pause
exit /b %errorlevel%
