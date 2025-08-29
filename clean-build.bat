@echo off
echo ========================================
echo   CLEAN BUILD - TELEPROMPTER PRO
echo ========================================
echo.
echo This script will:
echo 1. Clear electron-builder cache
echo 2. Clear npm cache
echo 3. Reinstall dependencies
echo 4. Build the application
echo.
pause
echo.

echo Step 1: Clearing electron-builder cache...
rmdir /S /Q "%APPDATA%\electron-builder\Cache" 2>nul
rmdir /S /Q "%LOCALAPPDATA%\electron-builder\Cache" 2>nul
echo Cache cleared.
echo.

echo Step 2: Clearing npm cache...
npm cache clean --force
echo.

echo Step 3: Reinstalling dependencies...
npm install
echo.

echo Step 4: Building application (without code signing)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build-win
echo.

echo Build process completed!
pause