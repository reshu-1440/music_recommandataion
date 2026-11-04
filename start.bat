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
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

:: 2. Check Node / npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
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

:: 4. Check virtual environment
set "VENV_ACTIVATE="
if exist "venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%ROOT_DIR%venv\Scripts\activate.bat"
) else if exist ".venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%ROOT_DIR%.venv\Scripts\activate.bat"
) else if exist "backend\venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%ROOT_DIR%backend\venv\Scripts\activate.bat"
)

:: 5. Check if index files exist, if not build them
if not exist "backend\data\faiss_index.bin" (
    echo [INFO] Catalog index not found. Building FAISS index and RQ-KMeans codebooks...
    if defined VENV_ACTIVATE (
        call "%VENV_ACTIVATE%"
    )
    python -m backend.app.scripts.build_index
)

:: 6. Check frontend dependencies
if not exist "sonora-frontend\node_modules" (
    echo [INFO] Installing frontend dependencies via npm install...
    cd /d "%ROOT_DIR%sonora-frontend"
    call npm install
    cd /d "%ROOT_DIR%"
)

echo.
echo [1/3] Starting Sonora FastAPI Backend on http://127.0.0.1:8000 ...
if defined VENV_ACTIVATE (
    start "Sonora Backend (FastAPI)" /D "%ROOT_DIR%" cmd /k "call "%VENV_ACTIVATE%" && python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"
) else (
    start "Sonora Backend (FastAPI)" /D "%ROOT_DIR%" cmd /k "python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"
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
