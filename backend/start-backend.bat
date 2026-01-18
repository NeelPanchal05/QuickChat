@echo off
echo Starting QuickChat Backend Server...
echo Server will be accessible on all network interfaces at port 8000
echo.
echo To access from other devices on your network:
echo 1. Find your IP address with: ipconfig
echo 2. Update frontend/.env with: REACT_APP_BACKEND_URL=http://YOUR_IP:8000
echo.

cd /d "%~dp0"

REM Activate virtual environment if it exists
if exist ".venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
) else if exist "..\.venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call ..\.venv\Scripts\activate.bat
)

echo Starting uvicorn server...
uvicorn server:app_asgi --host 0.0.0.0 --port 8000 --reload
