@echo off
title Luis B2B — Portale
cd /d "%~dp0"

echo [1/2] Avvio backend (NestJS)...
start "Luis Backend" cmd /c "cd /d backend && npm run start:dev"

echo [2/2] Avvio frontend (Next.js)...
start "Luis Frontend" cmd /c "cd /d frontend && npm run dev"

echo.
echo Portale B2B Luis S.r.l.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
pause
