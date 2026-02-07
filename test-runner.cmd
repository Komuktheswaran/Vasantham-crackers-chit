@echo off
echo ==========================================
echo      STARTING CHIT SCHEME TEST SUITE
echo ==========================================

echo.
echo [1/2] Running Backend Unit/Functional Tests...
cd "f:\React Dev\chit\chit-scheme-backend"
call npm test
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend tests failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Running Frontend E2E/Non-functional Tests...
cd "f:\React Dev\chit\chit-scheme-frontend"
call npx playwright test
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend tests failed!
    exit /b %ERRORLEVEL%
)

echo.
echo ==========================================
echo      ALL TESTS PASSED SUCCESSFULLY
echo ==========================================
pause
