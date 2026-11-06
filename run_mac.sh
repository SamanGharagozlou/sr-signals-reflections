#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
python -m pip install -r requirements.txt
printf '\nSIGNAL is ready at http://127.0.0.1:8765\n'
printf 'Press Ctrl+C to stop the server.\n\n'
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8765
