@echo off
setlocal enabledelayedexpansion
title Sonora Music Discovery Launcher

echo ============================================================
echo          SONORA MUSIC DISCOVERY LAUNCHER
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: 1. Check Python
set "PYTHON_CMD="
where python >nul 2>&1
if !ERRORLEVEL! equ 0 (
    python --version >nul 2>&1
    if !ERRORLEVEL! equ 0 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
    where py >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        py --version >nul 2>&1
        if !ERRORLEVEL! equ 0 set "PYTHON_CMD=py"
    )
)

if not defined PYTHON_CMD (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

:: 2. Check Node / npm
where npm >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in your PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: 3. Prepare backend .env if missing
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo [INFO] Creating backend\.env from template...
        copy "backend\.env.example" "backend\.env" >nul
    )
)

:: 4. Check or create virtual environment
set "VENV_ACTIVATE="
set "VENV_DIR="
if exist "venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%ROOT_DIR%venv\Scripts\activate.bat"
    set "VENV_DIR=%ROOT_DIR%venv"
) else if exist ".venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%ROOT_DIR%.venv\Scripts\activate.bat"
    set "VENV_DIR=%ROOT_DIR%.venv"
) else if exist "backend\venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%ROOT_DIR%backend\venv\Scripts\activate.bat"
    set "VENV_DIR=%ROOT_DIR%backend\venv"
) else (
    echo [INFO] Python virtual environment not found. Creating 'venv'...
    !PYTHON_CMD! -m venv "%ROOT_DIR%venv"
    if exist "venv\Scripts\activate.bat" (
        set "VENV_ACTIVATE=%ROOT_DIR%venv\Scripts\activate.bat"
        set "VENV_DIR=%ROOT_DIR%venv"
        echo [INFO] Virtual environment created successfully at %ROOT_DIR%venv.
    ) else (
        echo [WARNING] Could not create virtual environment. Proceeding with system Python...
    )
)

:: Activate virtual environment if available
if defined VENV_ACTIVATE (
    call "!VENV_ACTIVATE!"
    set "PYTHON_CMD=python"
)

:: 5. Check and install backend dependencies from backend\requirements.txt
set "STAMP_FILE="
if defined VENV_DIR (
    set "STAMP_FILE=!VENV_DIR!\.requirements_installed"
) else (
    set "STAMP_FILE=%ROOT_DIR%backend\.requirements_installed"
)

set "NEED_REQ_INSTALL=0"
if not exist "!STAMP_FILE!" (
    set "NEED_REQ_INSTALL=1"
) else (
    !PYTHON_CMD! -c "import os, sys, importlib.util; stamp, req = sys.argv[1], sys.argv[2]; ok = os.path.exists(stamp) and os.path.getmtime(stamp) >= os.path.getmtime(req) and importlib.util.find_spec('fastapi') is not None and importlib.util.find_spec('uvicorn') is not None; sys.exit(0 if ok else 1)" "!STAMP_FILE!" "%ROOT_DIR%backend\requirements.txt" >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        set "NEED_REQ_INSTALL=1"
    )
)

if "!NEED_REQ_INSTALL!"=="1" (
    echo [INFO] Installing backend dependencies from backend\requirements.txt...
    echo [INFO] This might take a few minutes on first run. Please wait...
    !PYTHON_CMD! -m pip install --upgrade pip >nul 2>&1
    !PYTHON_CMD! -m pip install -r "%ROOT_DIR%backend\requirements.txt"
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to install backend dependencies from backend\requirements.txt.
        echo Please ensure you have an active internet connection and try running:
        echo   pip install -r backend\requirements.txt
        pause
        exit /b 1
    )
    echo installed > "!STAMP_FILE!"
    echo [INFO] Backend dependencies installed successfully.
)

:: 6. Check if index files exist, if not build them
if not exist "backend\data\faiss_index.bin" (
    echo [INFO] Catalog index not found. Building FAISS index and RQ-KMeans codebooks...
    !PYTHON_CMD! -m backend.app.scripts.build_index
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to build catalog index.
        pause
        exit /b 1
    )
)

:: 7. Check frontend dependencies
if not exist "sonora-frontend\node_modules" (
    echo [INFO] Installing frontend dependencies via npm install...
    cd /d "%ROOT_DIR%sonora-frontend"
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to install frontend dependencies via npm install.
        cd /d "%ROOT_DIR%"
        pause
        exit /b 1
    )
    cd /d "%ROOT_DIR%"
)

echo.
echo [1/3] Starting Sonora FastAPI Backend on http://127.0.0.1:8000 ...
if defined VENV_ACTIVATE (
    start "Sonora Backend (FastAPI)" /D "%ROOT_DIR%" cmd /k "call "!VENV_ACTIVATE!" && python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"
) else (
    start "Sonora Backend (FastAPI)" /D "%ROOT_DIR%" cmd /k "!PYTHON_CMD! -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"
)

echo [2/3] Starting Sonora Frontend on http://localhost:5173 ...
start "Sonora Frontend (Vite)" /D "%ROOT_DIR%sonora-frontend" cmd /k "npm run dev"

echo [3/3] Waiting for servers to initialize and opening browser...
ping -n 5 127.0.0.1 >nul

start http://localhost:5173

echo.
echo ============================================================
echo   Sonora Music Discovery is now running!
echo.
echo   - Web UI:      http://localhost:5173
echo   - Backend API: http://127.0.0.1:8000
echo   - API Docs:    http://127.0.0.1:8000/docs
echo.
echo   Keep the backend and frontend terminal windows open.
echo   To stop Sonora, close the respective windows.
echo ============================================================
echo.
echo Press any key to close this launcher window (services keep running)...
pause >nul
exit /b 0
