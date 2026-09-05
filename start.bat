@echo off
title Pharm AI Synapse Launcher
echo ========================================================
echo   Pharm AI Synapse - Autonomous Drug Discovery Engine
echo   Lead Architect: A.P. Anirudh
echo ========================================================
echo.

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend
set PORTABLE_NODE=%FRONTEND_DIR%\node_portable\node-v20.15.0-win-x64

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Pharm AI Synapse - Backend (FastAPI + RDKit)" cmd /k "cd /d "%BACKEND_DIR%" && "%BACKEND_DIR%\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/3] Waiting for backend initialization...
ping -n 3 127.0.0.1 >nul 2>&1

echo [3/3] Starting React + Vite Frontend on http://localhost:5173 ...
start "Pharm AI Synapse - Frontend (Vite)" cmd /k "cd /d "%FRONTEND_DIR%" && set "PATH=%PORTABLE_NODE%;%PATH%" && npm run dev"

echo.
echo ========================================================
echo   Servers Launched Successfully!
echo   Frontend: http://localhost:5173
echo   Backend:  http://127.0.0.1:8000
echo   API Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.
ping -n 3 127.0.0.1 >nul 2>&1
start http://localhost:5173
