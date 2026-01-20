@echo off
REM JobPost - Installation Script
REM This batch file installs all dependencies

echo.
echo ========================================
echo     JobPost - Installation
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

echo Installing backend dependencies...
wsl -e bash -c "cd ~/w/jobpost/backend && npm install"
if %errorlevel% neq 0 (
    echo Backend installation failed!
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
wsl -e bash -c "cd ~/w/jobpost/frontend && npm install"
if %errorlevel% neq 0 (
    echo Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure MongoDB is running
echo 2. Run: start.bat
echo.
pause
