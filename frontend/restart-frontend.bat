@echo off
echo ========================================
echo  QuickChat Frontend Restart Helper
echo ========================================
echo.
echo This will restart your React app to pick up .env changes
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Clearing React cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo Cache cleared!
) else (
    echo No cache found to clear
)

echo.
echo Current .env configuration:
type .env
echo.

echo Starting frontend server...
echo Press Ctrl+C to stop the server when needed
echo.
npm start
