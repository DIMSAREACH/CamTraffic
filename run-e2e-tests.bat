@echo off
echo ========================================
echo CamTraffic E2E Tests - Windows Setup
echo ========================================
echo.

echo Step 1: Checking if servers are running...
echo.

REM Check if backend is running
curl -s http://127.0.0.1:8000/health/ > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Backend is NOT running on port 8000
    echo.
    echo Please start backend in a separate terminal:
    echo   cd src\backend
    echo   python manage.py runserver 127.0.0.1:8000
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Backend is running on port 8000
)

REM Check if admin frontend is running
curl -s http://127.0.0.1:5184/ > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Admin frontend is NOT running on port 5184
    echo.
    echo Please start admin frontend in a separate terminal:
    echo   npm run dev:admin
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Admin frontend is running on port 5184
)

REM Check if user frontend is running
curl -s http://127.0.0.1:5183/ > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] User frontend is NOT running on port 5183
    echo.
    echo Please start user frontend in a separate terminal:
    echo   npm run dev:user
    echo.
    pause
    exit /b 1
) else (
    echo [OK] User frontend is running on port 5183
)

echo.
echo ========================================
echo All servers are running!
echo Starting E2E tests...
echo ========================================
echo.

cd tests\e2e
npx playwright test --reporter=list

echo.
echo ========================================
echo E2E Tests Complete!
echo ========================================
pause
