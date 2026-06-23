@echo off
echo ===========================================
echo WorkforceOS Enterprise - WFH Tracking App
echo ===========================================
echo.

echo [1/3] Starting Backend Server...
start "WFH Backend" cmd /k "cd backend && npm start"

echo [2/3] Starting Frontend Server (Headless)...
start "WFH Frontend" cmd /k "cd frontend && set BROWSER=none && npm start"

echo Waiting for Frontend to initialize (10 seconds)...
timeout /t 10 /nobreak > nul

echo [3/3] Starting Desktop App...
start "WFH Desktop Agent" cmd /k "cd desktop-agent && npm start"

echo.
echo All services started! You can close this window.
exit
