@echo off
title Luis B2B - Portale (HTTPS)
cd /d "%~dp0"

echo Fermo eventuali istanze gia' attive...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [1/2] Avvio backend (NestJS)...
start "Luis Backend" cmd /c "cd /d backend && npm run start:dev"

echo [2/2] Avvio frontend (Next.js) in HTTPS...
start "Luis Frontend HTTPS" cmd /c "cd /d frontend && npm run dev:https"

echo.
echo Portale B2B Luis S.r.l. - modalita' HTTPS
echo   Frontend: https://localhost:3000
echo   Backend:  http://localhost:3001  (interno, non aprire nel browser)
echo.
echo Nota: certificato self-signed. Alla prima apertura il browser
echo       mostra un avviso di sicurezza: procedi/accetta per continuare.
echo.
pause
