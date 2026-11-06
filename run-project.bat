@echo off
cd /d "%~dp0"
echo ========================================================
echo   Starting Arshith Connect All-in-One Workforce Portal
echo ========================================================
echo.
echo Website URL: http://localhost:8000
echo Swagger API: http://localhost:8000/docs
echo.

start http://localhost:8000
cd backend && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
