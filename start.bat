@echo off
REM JobPost - Start Script
REM This batch file starts both backend and frontend

echo.
echo ========================================
echo     JobPost - Development Server
echo ========================================
echo.

REM Check if WSL is available
where wsl >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: WSL (Windows Subsystem for Linux) is not installed or not in PATH
    echo Please install WSL first: https://docs.microsoft.com/en-us/windows/wsl/install
    pause
    exit /b 1
)

echo Starting JobPost services...
echo.

REM Open first window for backend
echo Launching backend server on port 5000...
start "JobPost Backend" wsl -e bash -c "cd ~/w/jobpost/backend && npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Open second window for frontend
echo Launching frontend server on port 3000...
start "JobPost Frontend" wsl -e bash -c "cd ~/w/jobpost/frontend && npm run dev"

echo.
echo ========================================
echo Services starting:
echo - Backend:  http://localhost:5000
echo - Frontend: http://localhost:3000
echo ========================================
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak

start http://localhost:3000

echo.
echo Done! Both services are running.
echo.
pause
