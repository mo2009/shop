#!/usr/bin/env bash
# Launches the bulk emailer on macOS / Linux. First run installs dependencies.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
    python3 -m venv .venv
    # shellcheck disable=SC1091
    source .venv/bin/activate
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
else
    # shellcheck disable=SC1091
    source .venv/bin/activate
fi
python main.py
