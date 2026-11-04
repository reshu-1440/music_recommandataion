#!/usr/bin/env bash

# Resolve project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo "          SONORA MUSIC DISCOVERY LAUNCHER"
echo "============================================================"
echo ""

# 1. Check Python
PYTHON_CMD=""
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo "[ERROR] Python 3 is not installed or not in your PATH."
    echo "Please install Python 3.10+ from https://www.python.org/"
    exit 1
fi

# 2. Check Node & npm
if ! command -v npm &>/dev/null; then
    echo "[ERROR] Node.js / npm is not installed or not in your PATH."
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# 3. Prepare backend .env if missing
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        echo "[INFO] Creating backend/.env from template..."
        cp "backend/.env.example" "backend/.env"
    fi
fi

# 4. Activate virtual environment if present or create one
VENV_DIR=""
if [ -f "venv/bin/activate" ]; then
    echo "[INFO] Activating virtual environment (venv)..."
    source "venv/bin/activate"
    VENV_DIR="venv"
elif [ -f ".venv/bin/activate" ]; then
    echo "[INFO] Activating virtual environment (.venv)..."
    source ".venv/bin/activate"
    VENV_DIR=".venv"
elif [ -f "backend/venv/bin/activate" ]; then
    echo "[INFO] Activating virtual environment (backend/venv)..."
    source "backend/venv/bin/activate"
    VENV_DIR="backend/venv"
elif [ -f "venv/Scripts/activate" ]; then
    echo "[INFO] Activating virtual environment (venv/Scripts)..."
    source "venv/Scripts/activate"
    VENV_DIR="venv"
elif [ -f ".venv/Scripts/activate" ]; then
    echo "[INFO] Activating virtual environment (.venv/Scripts)..."
    source ".venv/Scripts/activate"
    VENV_DIR=".venv"
else
    echo "[INFO] Virtual environment not found. Creating 'venv'..."
    $PYTHON_CMD -m venv venv
    if [ -f "venv/bin/activate" ]; then
        source "venv/bin/activate"
        VENV_DIR="venv"
        echo "[INFO] Virtual environment created successfully."
    elif [ -f "venv/Scripts/activate" ]; then
        source "venv/Scripts/activate"
        VENV_DIR="venv"
        echo "[INFO] Virtual environment created successfully."
    else
        echo "[WARNING] Could not create virtual environment. Proceeding with system Python..."
    fi
fi

# 5. Check and install backend dependencies from requirements.txt
STAMP_FILE="${VENV_DIR:-backend}/.requirements_installed"
NEED_REQ_INSTALL=0
if [ ! -f "$STAMP_FILE" ]; then
    NEED_REQ_INSTALL=1
elif ! $PYTHON_CMD -c "import os, sys, importlib.util; stamp, req = sys.argv[1], sys.argv[2]; ok = os.path.exists(stamp) and os.path.getmtime(stamp) >= os.path.getmtime(req) and importlib.util.find_spec('fastapi') is not None and importlib.util.find_spec('uvicorn') is not None; sys.exit(0 if ok else 1)" "$STAMP_FILE" "backend/requirements.txt" &>/dev/null; then
    NEED_REQ_INSTALL=1
fi

if [ "$NEED_REQ_INSTALL" -eq 1 ]; then
    echo "[INFO] Installing backend dependencies from backend/requirements.txt..."
    echo "[INFO] This might take a few minutes on first run. Please wait..."
    $PYTHON_CMD -m pip install --upgrade pip &>/dev/null || true
    if ! $PYTHON_CMD -m pip install -r backend/requirements.txt; then
        echo "[ERROR] Failed to install backend dependencies from backend/requirements.txt."
        exit 1
    fi
    echo "installed" > "$STAMP_FILE"
    echo "[INFO] Backend dependencies installed successfully."
fi

# 6. Check if index files exist, build if missing
if [ ! -f "backend/data/faiss_index.bin" ]; then
    echo "[INFO] Catalog index not found. Building FAISS index and RQ-KMeans codebooks..."
    $PYTHON_CMD -m backend.app.scripts.build_index
fi

# 7. Check frontend dependencies
if [ ! -d "sonora-frontend/node_modules" ]; then
    echo "[INFO] Installing frontend dependencies (npm install)..."
    (cd sonora-frontend && npm install)
fi

# Cleanup on exit (Ctrl+C)
cleanup() {
    echo ""
    echo "[INFO] Shutting down Sonora services..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    echo "[INFO] All services stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 8. Start backend
echo "[1/3] Starting Sonora FastAPI Backend on http://127.0.0.1:8000 ..."
$PYTHON_CMD -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# 9. Start frontend
echo "[2/3] Starting Sonora Frontend on http://localhost:5173 ..."
(cd sonora-frontend && npm run dev) &
FRONTEND_PID=$!

# 10. Wait and open browser
echo "[3/3] Waiting for servers to initialize and opening browser..."
sleep 4

if command -v xdg-open &>/dev/null; then
    xdg-open "http://localhost:5173" &>/dev/null &
elif command -v open &>/dev/null; then
    open "http://localhost:5173" &>/dev/null &
elif command -v start &>/dev/null; then
    start "http://localhost:5173" &>/dev/null &
fi

echo ""
echo "============================================================"
echo "  Sonora Music Discovery is now running!"
echo ""
echo "  - Web UI:      http://localhost:5173"
echo "  - Backend API: http://127.0.0.1:8000"
echo "  - API Docs:    http://127.0.0.1:8000/docs"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "============================================================"
echo ""

# Keep running and wait for background processes
wait
