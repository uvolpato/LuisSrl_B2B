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

REM Versione Node richiesta (deve combaciare con .nvmrc)
set NODE_REQ=v24.15.0

cd /d "%~dp0"

echo.
echo === [1/6] Verifico Node.js (%NODE_REQ%) ===
set NODE_CUR=
for /f "delims=" %%v in ('node -v 2^>nul') do set NODE_CUR=%%v
echo Node installato: "!NODE_CUR!"  richiesto: "%NODE_REQ%"

if /i "!NODE_CUR!"=="%NODE_REQ%" (
  echo Node gia' alla versione corretta.
) else (
  echo Installo Node %NODE_REQ% via winget...
  where winget >nul 2>nul || (
    echo [ERRORE] winget non disponibile.
    echo Installa manualmente Node %NODE_REQ% da https://nodejs.org/dist/%NODE_REQ%/
    goto :err
  )
  winget install --id OpenJS.NodeJS --version 24.15.0 --exact --silent --accept-source-agreements --accept-package-agreements || goto :err
  echo.
  echo *** Node installato. CHIUDI e RIAPRI questo terminale (per aggiornare il PATH), poi rilancia setup-prod.cmd ***
  pause
  goto :eof
)

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
