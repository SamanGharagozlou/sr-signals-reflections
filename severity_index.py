"""Source-matched INFORM Severity data for SIGNAL's synthetic-only demo.

INFORM Severity (crisis-level, observed conditions) is distinct from ACAPS Risk
Radar (qualitative forward risk) and SIGNAL's event forecast (expert probability).
Only an explicitly human-verified risk-to-crisis crosswalk can display a score.
No country-name-based imputation, generated data, or remote calls.
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path
from urllib.parse import urlsplit

PORTAL_URL = "https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Severity/Results-and-data"
LEVELS = {"very low", "low", "medium", "high", "very high"}
DIMENSIONS = ("impact", "conditions", "complexity")


def _unavailable(reason: str) -> dict:
    return {
        "available": False,
        "metric": "INFORM Severity Index",
        "reason": reason,
        "methodology_url": PORTAL_URL,
        "score_scale": "0–10 (methodology updated February 2026)",
    }


def _valid_source_url(url: object) -> bool:
    if not isinstance(url, str):
        return False
    p = urlsplit(url)
    return p.scheme == "https" and p.hostname in {"drmkc.jrc.ec.europa.eu", "www.acaps.org"} and not p.username and not p.password


def _score(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        return None
    value = float(value)
    return round(value, 2) if math.isfinite(value) and 0 <= value <= 10 else None


def severity_for_risk(risk_id: str, country: str, manifest_path: Path) -> dict:
    """Return a display-safe matched crisis score, or an explicit unavailable state.

    Manifest is maintained manually from an official release with a documented
    matching rationale. We intentionally never match a crisis from country alone.
    """
    if not manifest_path.is_file():
        return _unavailable("Official crisis-to-risk severity matching has not been connected.")
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (ValueError, OSError, UnicodeError):
        return _unavailable("Severity source could not be validated; no score is shown.")
    if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
        return _unavailable("Severity source has an invalid format; no score is shown.")
    release = payload.get("release")
    source_url = payload.get("source_url")
    if not isinstance(release, str) or not re.fullmatch(r"20\d\d-(?:0[1-9]|1[0-2])", release) or release < "2026-02" or not _valid_source_url(source_url):
        return _unavailable("Severity release metadata is invalid or uses an incompatible scale.")
    matching = [r for r in payload["records"] if isinstance(r, dict) and r.get("acaps_risk_id") == risk_id]
    if not matching:
        return _unavailable("No individually verified crisis match exists for this risk.")
    if len(matching) != 1:
        return _unavailable("More than one crisis match was supplied; no ambiguous score is shown.")
    r = matching[0]
    score = _score(r.get("score"))
    level = r.get("level")
    fields_ok = all(isinstance(r.get(k), str) and r[k].strip() for k in ("crisis_id", "crisis_name", "match_note", "country"))
    if (
        not fields_ok or r["country"].strip().casefold() != country.strip().casefold()
        or score is None or not isinstance(level, str) or level.lower() not in LEVELS
    ):
        return _unavailable("Crisis match or severity score failed validation; no score is shown.")
    raw_dimensions = r.get("dimensions", {})
    if not isinstance(raw_dimensions, dict):
        return _unavailable("Severity component values failed validation; no score is shown.")
    dimensions: dict[str, float | None] = {}
    for name in DIMENSIONS:
        raw = raw_dimensions.get(name)
        if raw is not None and _score(raw) is None:
            return _unavailable("Severity component values failed validation; no score is shown.")
        dimensions[name] = _score(raw)
    return {
        "available": True,
        "metric": "INFORM Severity Index",
        "risk_id": risk_id,
        "country": r["country"].strip(),
        "crisis_id": r["crisis_id"].strip(),
        "crisis_name": r["crisis_name"].strip(),
        "score": score,
        "level": level,
        "dimensions": dimensions,
        "release": release,
        "source_url": source_url,
        "match_note": r["match_note"].strip(),
        "score_scale": "0–10 (methodology updated February 2026)",
        "methodology_url": PORTAL_URL,
    }
