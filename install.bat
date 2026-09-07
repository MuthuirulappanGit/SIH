@echo off
setlocal enabledelayedexpansion

cd /d "c:\Users\rshri\wattwise"

REM Bypass the interactive prompt by answering "A" (Yes to All)
echo A | npm install --no-fund --no-audit

if %errorlevel% neq 0 (
    echo Installation may have issues, but proceeding with build check...
)

echo.
echo Installation check complete. Type the following commands to continue:
echo npm run build
echo npm run dev
echo npm run start
