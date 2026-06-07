@echo off
cd /d "%~dp0"
echo Building project...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo.
echo Starting development server...
start cmd /k npm run dev
set "SHORTCUT=%~dp0run-dev.lnk"
set "ICON=%~dp0mowgli-icon.ico"
if exist "%ICON%" (
    powershell -NoProfile -Command " $s = New-Object -ComObject WScript.Shell; $lnk = $s.CreateShortcut('%SHORTCUT%'); $lnk.TargetPath = '%~dp0run-dev.bat'; $lnk.WorkingDirectory = '%~dp0'; $lnk.IconLocation = '%ICON%'; $lnk.Save(); "
)
timeout /t 3
echo Opening Chrome...
start chrome http://localhost:3000
echo.
echo Server should be running at http://localhost:3000
pause
