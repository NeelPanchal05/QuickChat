@echo off
echo ========================================================
echo Starting QuickChat in SECURE CONTEXT (HTTPS) mode...
echo This ensures Camera/Mic/Location work on mobile devices.
echo ========================================================

REM 1. Activate backend environment and run certification generation
echo [1/3] Checking/Generating SSL Certificates...
cd backend
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else if exist "..\.venv\Scripts\activate.bat" (
    call ..\.venv\Scripts\activate.bat
) else (
    echo Virtual environment not found in backend\.venv or ..\.venv.
    exit /b 1
)

pip install pyOpenSSL > nul 2>&1
cd ..
python generate_cert.py

REM 2. Start Backend using uvicorn with SSL
echo.
echo [2/3] Starting Backend Server on HTTPS (0.0.0.0:8000)...
cd backend
start cmd /k "if exist .venv\Scripts\activate (call .venv\Scripts\activate) else (call ..\.venv\Scripts\activate) && uvicorn server:app_asgi --host 0.0.0.0 --port 8000 --reload"

REM 3. Start Frontend using HTTPS
echo.
echo [3/3] Starting Frontend React Server on HTTPS (0.0.0.0:3000)...
cd ../frontend
set HTTPS=true
set SSL_CRT_FILE=../cert.pem
set SSL_KEY_FILE=../key.pem

echo.
echo ----------------------------------------------------------------------------------
echo Note: When opening on your phone, ignore the browser's "Not Secure" warning.
echo This is expected for local self-signed certificates.
echo ----------------------------------------------------------------------------------
echo.

npm start
