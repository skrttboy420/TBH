@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem --- Build the distributable tbh-agent.exe (run on a Windows PC with Python) ---

set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY where py >nul 2>nul && set "PY=py"
if not defined PY (
  echo [!] Python not found. Install Python 3.11+ from python.org first.
  pause
  exit /b 1
)

echo === Building tbh-agent.exe ===
echo Installing runtime + build dependencies...
%PY% -m pip install -q -r requirements.txt pyinstaller
if errorlevel 1 (
  echo [!] Dependency install failed.
  pause
  exit /b 1
)

echo Running PyInstaller...
%PY% -m PyInstaller --clean --noconfirm tbh-agent.spec
if errorlevel 1 (
  echo [!] Build failed. See the PyInstaller output above.
  pause
  exit /b 1
)

echo.
echo [OK] Built: dist\tbh-agent.exe
echo Hand this single file to a player; they double-click it and paste their token.
pause
