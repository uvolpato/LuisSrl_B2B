@echo off
REM ============================================================
REM  Aggiornamenti UNA TANTUM per il Portale B2B Luis.
REM  Da lanciare a mano DOPO il primo setup (o dopo un cambio
REM  che li richiede). NON serve a ogni deploy: deploy-prod.cmd
REM  applica gia' le migration idempotenti a ogni aggiornamento.
REM
REM  Eseguire come Administrator dalla root del repo, a servizi AVVIATI
REM  (il backfill usa il DB e le API AI).
REM
REM  Contenuto:
REM   1) embedding-setup.sql  -> tabella pgvector (idempotente, CREATE IF NOT EXISTS)
REM   2) backfill embedding   -> indicizza gli articoli gia' configurati (salta gli invariati)
REM
REM  Requisiti: GEMINI_API_KEY in backend\.env (gia' usata per le descrizioni AI),
REM  pgvector installabile sul DB (il CREATE EXTENSION richiede un utente superuser).
REM ============================================================
setlocal

cd /d "%~dp0"

echo.
echo === [1/2] Migration pgvector (articolo_embedding) ===
cd backend || goto :err
call npx prisma db execute --file prisma/embedding-setup.sql || goto :err

echo.
echo === [2/2] Backfill embedding articoli (una tantum) ===
echo Genera gli embedding via AI: puo' richiedere qualche minuto secondo il numero di articoli.
call npm run embeddings:backfill || goto :err

cd ..
echo.
echo === AGGIORNAMENTI UNA TANTUM COMPLETATI ===
echo Da ora gli articoli nuovi/modificati si reindicizzano da soli al salvataggio.
echo.
pause
goto :eof

:err
echo.
echo *** ERRORE durante gli aggiornamenti (codice %errorlevel%). Interrotto. ***
pause
exit /b %errorlevel%
