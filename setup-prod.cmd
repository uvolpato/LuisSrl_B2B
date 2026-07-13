@echo off
REM ============================================================
REM  PROVISIONING PRODUZIONE DA ZERO - Portale B2B Luis
REM  Eseguire come Administrator dalla root del repo.
REM
REM  Installa Node alla versione ESATTA di sviluppo e tutte le
REM  dipendenze bloccate dai package-lock.json (npm ci).
REM  NON usa mai "npm install" per evitare drift di versione
REM  (es. il salto Prisma 6 -> 7 successo con npm install).
REM ============================================================
setlocal enabledelayedexpansion

REM Major Node richiesta (vincolo package.json: >=24.15.0 <25). Va bene qualsiasi v24.x.
set NODE_MAJOR=v24.

REM --- Connessione DB locale del portale (adatta se serve) ---
set PG_HOST=localhost
set PG_PORT=5432
set PG_USER=postgres
set PG_DB=LuisSrlDb
REM --- Connessione al DB Integra (per le viste dblink) ---
set INTEGRA_HOST=192.168.1.41
set INTEGRA_PORT=5432
set INTEGRA_DB=integra
set INTEGRA_USER=postgres

cd /d "%~dp0"

REM Localizzo psql una volta (per fixup DB e viste Integra)
set PSQL=
for /f "delims=" %%p in ('dir /b /s "C:\Program Files\PostgreSQL\psql.exe" 2^>nul') do set PSQL=%%p

echo.
echo === [1/8] Verifico Node.js (major %NODE_MAJOR%x) ===
set NODE_CUR=
for /f "delims=" %%v in ('node -v 2^>nul') do set NODE_CUR=%%v
echo Node installato: "!NODE_CUR!"  richiesto: "%NODE_MAJOR%x (>=v24.15.0)"

echo !NODE_CUR! | findstr /b /c:"%NODE_MAJOR%" >nul && goto node_ok

echo Installo Node LTS via winget...
where winget >nul 2>nul
if errorlevel 1 goto no_winget
winget install --id OpenJS.NodeJS --version 24.15.0 --exact --silent --accept-source-agreements --accept-package-agreements
if errorlevel 1 goto err
echo.
echo *** Node installato. CHIUDI e RIAPRI questo terminale (per aggiornare il PATH), poi rilancia setup-prod.cmd ***
pause
goto :eof

:no_winget
echo [ERRORE] winget non disponibile e Node major diversa da v24.
echo Installa Node v24.x da https://nodejs.org/dist/latest-v24.x/ e rilancia.
goto err

:node_ok
echo Node OK (major v24).

echo.
echo === [2/8] Verifico npm ===
for /f "delims=" %%v in ('npm -v 2^>nul') do set NPM_CUR=%%v
echo npm: !NPM_CUR!

echo.
echo === [3/8] Backend: dipendenze bloccate (npm ci) ===
cd backend || goto :err
call npm ci || goto :err

echo.
echo === [4/8] Backend: Prisma generate + migrate + seed ===
call npx prisma generate || goto :err
call npx prisma migrate deploy || goto :err
REM Seed idempotente: crea l'admin (ADMIN_EMAIL/ADMIN_PASSWORD dal .env) solo se manca
call npm run db:seed || goto :err

echo.
echo === [5/8] Fixup DB non coperti dalle migration (idempotente) ===
if not defined PSQL echo [avviso] psql non trovato: applica a mano backend\prisma\manual-fixups.sql & goto after_fixups
echo Applico backend\prisma\manual-fixups.sql (chiede la password postgres locale)...
"!PSQL!" -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DB% -f "%~dp0backend\prisma\manual-fixups.sql" || goto :err
:after_fixups

echo.
echo === [6/8] Backend: build ===
call npm run build || goto :err

echo.
echo === [7/8] Frontend: dipendenze bloccate (npm ci) + build ===
cd ..\frontend || goto :err
call npm ci || goto :err
call npm run build || goto :err

cd ..

echo.
echo === [8/8] Viste Integra (dblink) ===
if not defined PSQL goto no_psql
echo psql: !PSQL!
set INTEGRA_PWD=
set /p INTEGRA_PWD=Password dblink Integra (utente %INTEGRA_USER%@%INTEGRA_HOST%) - invio per SALTARE:
if "!INTEGRA_PWD!"=="" goto skip_views
echo Verra' chiesta la password del Postgres locale (utente %PG_USER%)...
"!PSQL!" -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DB% -v conn="host=%INTEGRA_HOST% port=%INTEGRA_PORT% dbname=%INTEGRA_DB% user=%INTEGRA_USER% password=!INTEGRA_PWD!" -f "%~dp0backend\prisma\restore-b2b-views.sql" || goto :err
goto done

:no_psql
echo [avviso] psql.exe non trovato: salto la creazione delle viste.
echo   Poi lancia a mano: psql ... -v conn=... -f backend\prisma\restore-b2b-views.sql
goto done

:skip_views
echo Saltata la creazione delle viste.

:done
echo.
echo === FATTO ===
echo Restano da fare a mano:
echo   - Configurare i file .env di backend e frontend (se non gia' fatto)
echo   - Creare i servizi Windows: setup-services.cmd (consigliato)
echo     oppure avviare a mano: backend "npm run start:prod", frontend "npm run start"
echo.
echo Comandi utili servizi:
echo   nssm restart LuisBackend   ^| nssm status LuisFrontend
echo   nssm stop LuisBackend      ^| nssm start LuisFrontend
echo   Log: backend\service-*.log   frontend\service-*.log
echo.
pause
goto :eof

:err
echo.
echo *** ERRORE durante il provisioning (codice %errorlevel%). Interrotto. ***
pause
exit /b %errorlevel%
