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

cd /d "%~dp0"

echo.
echo === [1/6] Verifico Node.js (major %NODE_MAJOR%x) ===
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
echo === [2/6] Verifico npm ===
for /f "delims=" %%v in ('npm -v 2^>nul') do set NPM_CUR=%%v
echo npm: !NPM_CUR!

echo.
echo === [3/6] Backend: dipendenze bloccate (npm ci) ===
cd backend || goto :err
call npm ci || goto :err

echo.
echo === [4/6] Backend: Prisma generate + migrate + build ===
call npx prisma generate || goto :err
call npx prisma migrate deploy || goto :err
call npm run build || goto :err

echo.
echo === [5/6] Frontend: dipendenze bloccate (npm ci) + build ===
cd ..\frontend || goto :err
call npm ci || goto :err
call npm run build || goto :err

cd ..

echo.
echo === [6/6] FATTO ===
echo Restano da fare a mano (una tantum):
echo   - Viste Integra:  psql ... -v conn=... -f backend\prisma\restore-b2b-views.sql
echo   - Configurare i file .env di backend e frontend
echo   - Avviare backend (npm run start:prod) e frontend (npm run start)
echo.
pause
goto :eof

:err
echo.
echo *** ERRORE durante il provisioning (codice %errorlevel%). Interrotto. ***
pause
exit /b %errorlevel%
