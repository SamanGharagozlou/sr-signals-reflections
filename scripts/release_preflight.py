#!/usr/bin/env python3
"""Read-only local release preflight for SIGNAL. No logins, writes or state resets."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SENSITIVE_SUFFIXES = (".sqlite", ".sqlite3", ".db", ".pem", ".key")
SENSITIVE_NAMES = {".env", "risk-radar-export.csv", "inform-severity-2026-09-crises.json", "inform-severity-matches.json"}


def request_json(base: str, path: str) -> tuple[int, dict]:
    req = Request(base.rstrip("/") + path, headers={"Accept": "application/json"})
    try:
        with urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        try:
            payload = json.loads(error.read().decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            payload = {}
        return error.code, payload


def run(args: argparse.Namespace) -> int:
    failed = False

    def report(ok: bool, message: str) -> None:
        nonlocal failed
        print(("PASS" if ok else "FAIL") + " | " + message)
        failed |= not ok

    required = ["README.md", "requirements.txt", "app.py", "frontend/package.json", "docs/PHASE11B_JURY_PITCH.md", "docs/PHASE11B_DEMO_RUNBOOK.md"]
    for name in required:
        report((ROOT / name).is_file(), "File present: " + name)

    try:
        git = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True)
        tracked = [path.strip() for path in git.stdout.splitlines() if path.strip()]
        bad = [path for path in tracked if Path(path).name in SENSITIVE_NAMES or Path(path).suffix.lower() in SENSITIVE_SUFFIXES or Path(path).name.startswith(".env.")]
        report(not bad, "No sensitive/local dataset paths tracked" + (" — " + ", ".join(bad) if bad else ""))
    except (subprocess.CalledProcessError, OSError):
        print("WARN | Git tracked-file check unavailable (run inside a Git checkout)")

    try:
        health_code, health = request_json(args.api_base, "/api/health")
        report(health_code == 200 and health.get("status") == "ok", "Backend /api/health")
        code, risks = request_json(args.api_base, "/api/risks")
        report(code == 200 and isinstance(risks.get("count"), int) and risks["count"] >= 1, "Risk inventory readable")
        if code == 200:
            print(f"INFO | Risk inventory: count={risks.get('count')} source={risks.get('source')!r}")
        restricted_code, _ = request_json(args.api_base, "/api/moderator/situation-room")
        report(restricted_code in (401, 403), "Moderator-only room denies unsigned requests")
        public_code, public = request_json(args.api_base, "/api/public-summary")
        report(public_code == 200 and isinstance(public.get("available"), bool), "Public summary has approved/unavailable contract")
        private_keys = {"expert_id", "expert_ids", "raw_notes", "submissions", "individual_forecasts", "revisions", "invite_code", "anonymity"}
        report(not (private_keys & set(public.keys())), "Public summary contains no known raw expert keys")
        if public.get("available"):
            report(public.get("forecast_round") in ("initial_panel", "revised_panel"), "Published aggregate names its panel version")
        else:
            print("INFO | No approved public snapshot yet; publication workflow still requires browser verification")
    except (URLError, TimeoutError, ConnectionError, ValueError, KeyError) as exc:
        report(False, f"Backend unavailable or invalid JSON at {args.api_base}: {exc}")

    print("\nPRE-FLIGHT " + ("FAILED" if failed else "PASSED") + ": see manual checklist for remaining role/workflow tests.")
    return 1 if failed else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-base", default="http://127.0.0.1:8765", help="Local FastAPI base URL")
    sys.exit(run(parser.parse_args()))
