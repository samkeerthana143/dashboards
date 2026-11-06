@echo off
cd /d "%~dp0"
echo ========================================================
echo   Pushing Arshith Connect to GitHub:
echo   https://github.com/samkeerthana143/dashboards
echo ========================================================
echo.
set "PATH=C:\Users\keert\AppData\Local\Programs\Git\cmd;%PATH%"
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo   SUCCESS! All files and folders pushed to GitHub.
    echo ========================================================
) else (
    echo [ERROR] Push failed. If prompted, please authorize in the browser or check credentials.
)
pause
