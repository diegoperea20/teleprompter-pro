@echo off
echo Building Teleprompter Pro for Windows (without code signing)...
echo.
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build-win
echo.
echo Build completed. Check the 'dist' folder for the installer.
pause