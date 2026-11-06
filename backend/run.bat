@echo off
cd /d "%~dp0"
echo ========================================================
echo   Starting Arshith Connect (All-in-One: http://localhost:8000)
echo ========================================================
start http://localhost:8000
call .venv\Scripts\activate.bat
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
