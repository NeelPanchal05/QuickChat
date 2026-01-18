@echo off
echo ========================================
echo  QuickChat Mobile Access Diagnostics
echo ========================================
echo.

echo Step 1: Checking Backend Status...
echo ----------------------------------------
netstat -ano | findstr :8000
echo.
echo Expected: "TCP    0.0.0.0:8000"
echo If you see "127.0.0.1:8000" instead, backend needs restart!
echo.
pause

echo Step 2: Your Network IP...
echo ----------------------------------------
ipconfig | findstr IPv4
echo.
pause

echo Step 3: Testing Backend from Network IP...
echo ----------------------------------------
echo Testing: http://192.168.0.199:8000/api/auth/me
echo.
curl -v http://192.168.0.199:8000/api/auth/me
echo.
echo Expected: Should show response (even if "Not authenticated")
echo If "Connection refused", backend is NOT accessible on network!
echo.
pause

echo Step 4: Checking Frontend .env...
echo ----------------------------------------
type ..\frontend\.env
echo.
echo Expected: REACT_APP_BACKEND_URL=http://192.168.0.199:8000
echo.
pause

echo.
echo ========================================
echo  Diagnostic Complete!
echo ========================================
echo.
echo If backend shows 127.0.0.1:8000, run: backend\start-backend.bat
echo If frontend .env is wrong, update it and restart npm start
echo.
pause
