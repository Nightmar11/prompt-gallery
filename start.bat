@echo off
cd /d D:\Downloads\prompt-gallery

echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Error: npm install failed
    pause
    exit /b 1
)

echo Starting server...
start "Prompt Gallery" cmd /k "npm start"

echo Waiting for server...
timeout /t 5 /nobreak >nul

echo Opening browser...
start http://localhost:3001

exit