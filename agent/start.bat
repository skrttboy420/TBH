@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem --- TBH Companion Agent: double-click launcher for players who have Python ---
rem (No-Python users should use the packaged tbh-agent.exe instead.)

rem Find Python: prefer "python", fall back to the "py" launcher.
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY where py >nul 2>nul && set "PY=py"
if not defined PY (
  echo [!] Python not found. Install Python 3.11+ from python.org,
  echo     tick "Add Python to PATH", then double-click this file again.
  pause
  exit /b 1
)

echo === TBH Companion Agent ===
echo Preparing libraries, first run may take a moment...
%PY% -m pip install -q -r requirements.txt
if errorlevel 1 (
  echo [!] Could not install libraries. Check your Python / pip setup.
  pause
  exit /b 1
)

rem No args: run.py auto-runs the token-only quickstart on a fresh machine,
rem then starts the agent in this same window.
%PY% run.py
pause
