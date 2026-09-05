#!/bin/bash
# =============================================================================
# Pharm AI Synapse — 1-Click Universal Linux / macOS / GitHub Codespaces Runner
# Architected by A.P. Anirudh (@AP-Anirudh87)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🧬 [Pharm AI Synapse] Initializing Cross-Platform Environment..."

# 1. Setup Backend Python Virtual Environment
if [ ! -d "backend/.venv" ]; then
    echo "📦 Creating Python virtual environment in backend/.venv..."
    python3 -m venv backend/.venv
fi

echo "⬇️  Installing Python backend dependencies (FastAPI, RDKit, scikit-learn)..."
backend/.venv/bin/pip install --upgrade pip
backend/.venv/bin/pip install -r backend/requirements.txt

# 2. Setup Frontend Dependencies
echo "⬇️  Installing Frontend NPM dependencies (React 18, Three.js, Vite)..."
cd frontend
npm install
cd ..

# 3. Start Backend in Background
echo "🚀 Starting FastAPI + RDKit backend server on http://0.0.0.0:8000..."
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

cleanup() {
    echo ""
    echo "🛑 Stopping Pharm AI Synapse background services..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Give backend a moment to boot
sleep 2

# 4. Start Frontend
echo "🌐 Starting Vite frontend server on http://localhost:5173..."
cd frontend
npm run dev -- --host
