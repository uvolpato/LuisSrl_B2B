@echo off
REM ============================================================
REM  Rigenerazione embedding ricerca semantica (produzione)
REM  Da eseguire DOPO deploy-prod.cmd, come Administrator,
REM  dalla root del repo.
REM
REM  Idempotente: rigenera solo gli articoli il cui blob e'
REM  cambiato (fonte_hash). Rilanciabile in sicurezza, anche
REM  con il backend attivo. Nessun riavvio servizi necessario
REM  (il ranking legge gli embedding dal DB a ogni query).
REM  Durata: da pochi minuti a qualche decina (1 chiamata
REM  Gemini per articolo, sequenziale).
REM ============================================================
setlocal

cd /d "%~dp0"

if not exist "backend\package.json" (
  echo *** Cartella backend non trovata: esegui questo file dalla root del repo. ***
  pause
  exit /b 1
)

REM --- Avviso se la chiave Gemini manca (gli embedding fallirebbero) ---
if not exist "backend\.env" (
  echo *** [avviso] backend\.env non trovato: gli embedding falliranno. ***
  echo *** Valorizza GEMINI_API_KEY e DATABASE_URL, poi rilancia. ***
) else (
  findstr /i "GEMINI_API_KEY=" "backend\.env" >nul
  if errorlevel 1 (
    echo *** [avviso] GEMINI_API_KEY non valorizzata in backend\.env: ***
    echo *** gli embedding falliranno. Verifica e rilancia. ***
  )
)

echo.
echo === Rigenero gli embedding (attendere: avanzamento ogni 20 articoli) ===
cd backend || goto :err
call npm run embeddings:backfill
if errorlevel 1 goto :err

cd ..
echo.
echo === FINE: embedding rigenerati. ===
echo.
echo Verifica attesa: l'ultima riga deve essere "processati=N errori=0".
echo - Se errori=0        : tutto ok, niente altro da fare.
echo - Se errori^>0        : rilancia questo file (riprova solo i mancanti).
echo - Se articoli=0       : nessun articolo visibile, controlla i dati.
echo.
pause
exit /b 0

:err
cd .. 2>nul
echo.
echo *** ERRORE durante il backfill (codice %errorlevel%). ***
echo *** Il backend resta funzionante con i vecchi embedding: ***
echo *** rilancia questo file quando vuoi riprovare. ***
pause
exit /b %errorlevel%
