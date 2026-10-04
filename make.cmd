@echo off
setlocal
cd /d "%~dp0"
set PYTHONUTF8=1
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" scripts\manage.py %*
) else (
  python scripts\manage.py %*
)
exit /b %errorlevel%
