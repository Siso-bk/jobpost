@echo off
cd /d "\\wsl.localhost\Ubuntu\home\ssybk\w\jobpost\frontend"
echo Installing frontend dependencies...
call npm install
if %errorlevel% equ 0 (
    echo.
    echo Installation successful!
    echo.
    echo To start the frontend, run:
    echo npm run dev
) else (
    echo Installation failed!
    pause
)
