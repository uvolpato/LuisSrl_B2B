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
powershell -NoProfile -Command "try { Invoke-WebRequest 'https://nssm.cc/release/nssm-2.24.zip' -OutFile \"$env:TEMP\nssm.zip\"; Expand-Archive -Force \"$env:TEMP\nssm.zip\" \"$env:TEMP\nssm\"; Copy-Item \"$env:TEMP\nssm\nssm-2.24\win64\nssm.exe\" \"%ROOT%\nssm.exe\" -Force } catch { exit 1 }"
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
echo === FATTO ===
echo Servizi creati e avviati: %SVC_BE% (API) e %SVC_FE% (porta %FE_PORT%).
echo Partono da soli al riavvio del server.
echo Comandi utili:
echo   nssm restart %SVC_BE%    ^| nssm stop %SVC_BE%    ^| nssm status %SVC_BE%
echo   log: backend\service-*.log  frontend\service-*.log
echo.
pause
goto :eof

:err
echo.
echo *** ERRORE creazione servizi (codice %errorlevel%). ***
pause
exit /b %errorlevel%
