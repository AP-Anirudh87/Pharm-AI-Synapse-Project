# Pharm AI Synapse — PowerShell Launcher
# Lead Architect: A.P. Anirudh

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"
$portableNode = Join-Path $frontendDir "node_portable\node-v20.15.0-win-x64"
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Pharm AI Synapse - Autonomous Drug Discovery Engine" -ForegroundColor Green
Write-Host "  Lead Architect: A.P. Anirudh" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Start Backend in a new window
Write-Host "`n[1/3] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; & '$pythonExe' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

# 2. Wait for backend
Start-Sleep -Seconds 3

# 3. Start Frontend in a new window
Write-Host "[2/3] Starting React + Vite Frontend on http://localhost:5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = '$portableNode;' + `$env:Path; cd '$frontendDir'; npm run dev"

# 4. Open default browser
Start-Sleep -Seconds 2
Write-Host "[3/3] Opening browser at http://localhost:5173..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  Servers Launched Successfully!" -ForegroundColor Green
Write-Host "  Frontend UI: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Green
