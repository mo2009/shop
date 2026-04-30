@echo off
REM Launches the bulk emailer on Windows. First run installs dependencies.
setlocal
cd /d "%~dp0"
if not exist .venv (
    python -m venv .venv
    call .venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)
python main.py
endlocal
