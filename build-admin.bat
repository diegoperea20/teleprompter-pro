@echo off
echo ========================================
echo   BUILDING TELEPROMPTER PRO (ADMIN)
echo ========================================
echo.
echo This script will run the build process with Administrator privileges
echo to resolve symbolic link permission issues.
echo.
echo WARNING: You will be prompted for Administrator access.
echo.
pause
echo.
echo Building Teleprompter Pro for Windows with admin privileges...
echo.

REM Run npm with administrator privileges
powershell -Command "Start-Process cmd -ArgumentList '/c cd /d \"%~dp0\" && npm run build-win && pause' -Verb RunAs"

echo.
echo Build process launched with Administrator privileges.
echo Check the new window for progress and results.
echo.
pause