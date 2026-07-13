@echo off
REM ============================================================
REM  Crea i servizi Windows di backend e frontend (via nssm)
REM  Eseguire come Administrator dalla root del repo, DOPO setup-prod.cmd
REM  (serve la build gia' fatta: backend\dist e frontend\.next).
REM  Idempotente: rimuove e ricrea i servizi.
REM ============================================================
setlocal enabledelayedexpansion

set SVC_BE=LuisBackend
set SVC_FE=LuisFrontend
set SVC_CADDY=LuisCaddy
set FE_PORT=3000

cd /d "%~dp0"
set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

echo.
echo === Trovo node ===
set NODE_EXE=
for /f "delims=" %%n in ('where node 2^>nul') do if not defined NODE_EXE set NODE_EXE=%%n
if not defined NODE_EXE echo [ERRORE] node non e' nel PATH. & goto err
echo node: !NODE_EXE!

echo.
echo === Trovo nssm ===
set NSSM=
for /f "delims=" %%n in ('where nssm 2^>nul') do if not defined NSSM set NSSM=%%n
if not defined NSSM if exist "%ROOT%\nssm.exe" set NSSM=%ROOT%\nssm.exe
if defined NSSM goto have_nssm

echo nssm non trovato: lo scarico da nssm.cc...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest 'https://nssm.cc/release/nssm-2.24.zip' -OutFile \"$env:TEMP\nssm.zip\"; Expand-Archive -Force \"$env:TEMP\nssm.zip\" \"$env:TEMP\nssm\"; Copy-Item \"$env:TEMP\nssm\nssm-2.24\win64\nssm.exe\" \"%ROOT%\nssm.exe\" -Force } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 echo [ERRORE] download nssm fallito. Scaricalo a mano da https://nssm.cc e metti nssm.exe nella root. & goto err
set NSSM=%ROOT%\nssm.exe

:have_nssm
echo nssm: !NSSM!

echo.
echo === Servizio backend (%SVC_BE%) ===
"!NSSM!" stop %SVC_BE% >nul 2>nul
"!NSSM!" remove %SVC_BE% confirm >nul 2>nul
"!NSSM!" install %SVC_BE% "!NODE_EXE!" "dist\src\main.js" || goto err
"!NSSM!" set %SVC_BE% AppDirectory "%ROOT%\backend" || goto err
"!NSSM!" set %SVC_BE% AppEnvironmentExtra NODE_ENV=production
"!NSSM!" set %SVC_BE% Start SERVICE_AUTO_START
"!NSSM!" set %SVC_BE% AppStdout "%ROOT%\backend\service-out.log"
"!NSSM!" set %SVC_BE% AppStderr "%ROOT%\backend\service-err.log"

echo.
echo === Servizio frontend (%SVC_FE%) ===
"!NSSM!" stop %SVC_FE% >nul 2>nul
"!NSSM!" remove %SVC_FE% confirm >nul 2>nul
"!NSSM!" install %SVC_FE% "!NODE_EXE!" "node_modules\next\dist\bin\next" start || goto err
"!NSSM!" set %SVC_FE% AppDirectory "%ROOT%\frontend" || goto err
"!NSSM!" set %SVC_FE% AppEnvironmentExtra NODE_ENV=production PORT=%FE_PORT%
"!NSSM!" set %SVC_FE% Start SERVICE_AUTO_START
"!NSSM!" set %SVC_FE% AppStdout "%ROOT%\frontend\service-out.log"
"!NSSM!" set %SVC_FE% AppStderr "%ROOT%\frontend\service-err.log"

echo.
echo === Avvio i servizi ===
"!NSSM!" start %SVC_BE% || goto err
"!NSSM!" start %SVC_FE% || goto err

echo.
echo === Reverse proxy HTTP/HTTPS (Caddy) ===
set DOMAIN=
set /p DOMAIN=Dominio pubblico per HTTPS automatico (es. portale.tuazienda.it) - invio per LAN (HTTPS self-signed su porta alta):

REM Trovo/scarico caddy
set CADDY=
for /f "delims=" %%n in ('where caddy 2^>nul') do if not defined CADDY set CADDY=%%n
if not defined CADDY if exist "%ROOT%\caddy.exe" set CADDY=%ROOT%\caddy.exe
if defined CADDY goto have_caddy
echo caddy non trovato: lo scarico...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile \"%ROOT%\caddy.exe\" } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 echo [avviso] download caddy fallito: salto il reverse proxy. Scaricalo da https://caddyserver.com/download & goto caddy_skip
set CADDY=%ROOT%\caddy.exe

:have_caddy
echo caddy: !CADDY!
if "!DOMAIN!"=="" goto caddy_lan

REM --- Con dominio: HTTPS automatico Let's Encrypt (la 80 reindirizza alla 443) ---
(
  echo !DOMAIN! {
  echo     reverse_proxy localhost:%FE_PORT%
  echo }
)>"%ROOT%\Caddyfile"
goto caddy_svc

:caddy_lan
REM --- Solo LAN: HTTPS self-signed su una porta alta (niente bisogno di 80/443) ---
set HTTPS_PORT=
set /p HTTPS_PORT=Porta HTTPS (invio = 8443):
if "!HTTPS_PORT!"=="" set HTTPS_PORT=8443
(
  echo :!HTTPS_PORT! {
  echo     tls internal
  echo     reverse_proxy localhost:%FE_PORT%
  echo }
)>"%ROOT%\Caddyfile"
echo Accederai da: https://IP-DEL-SERVER:!HTTPS_PORT!  (certificato self-signed: accetta l'avviso)

:caddy_svc
echo Caddyfile scritto in %ROOT%\Caddyfile
"!NSSM!" stop %SVC_CADDY% >nul 2>nul
"!NSSM!" remove %SVC_CADDY% confirm >nul 2>nul
REM Config relativo (AppDirectory = root): evita gli spazi nel percorso che rompono i parametri
"!NSSM!" install %SVC_CADDY% "!CADDY!" run --config Caddyfile --adapter caddyfile || goto err
"!NSSM!" set %SVC_CADDY% AppDirectory "%ROOT%" || goto err
"!NSSM!" set %SVC_CADDY% Start SERVICE_AUTO_START
"!NSSM!" set %SVC_CADDY% AppStdout "%ROOT%\caddy-out.log"
"!NSSM!" set %SVC_CADDY% AppStderr "%ROOT%\caddy-err.log"
"!NSSM!" start %SVC_CADDY% || goto err
if defined DOMAIN echo Ricorda: apri sul firewall le porte 80 e 443 (ingresso).
if not defined HTTPS_PORT goto caddy_done
echo Ricorda: assicurati che la porta !HTTPS_PORT! sia raggiungibile (firewall).
goto caddy_done

:caddy_skip
echo Reverse proxy saltato: configura Caddy/IIS a mano (vedi DEPLOY.md).

:caddy_done
echo.
echo === FATTO ===
echo Servizi creati e avviati: %SVC_BE% (API), %SVC_FE% (porta %FE_PORT%), %SVC_CADDY% (reverse proxy HTTPS).
echo Partono da soli al riavvio del server.
echo Comandi utili:
echo   nssm restart %SVC_BE%   ^| nssm status %SVC_FE%   ^| nssm restart %SVC_CADDY%
echo   log: backend\service-*.log  frontend\service-*.log  caddy-*.log
echo.
pause
goto :eof

:err
echo.
echo *** ERRORE creazione servizi (codice %errorlevel%). ***
pause
exit /b %errorlevel%
