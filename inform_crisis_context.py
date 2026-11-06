"""Read-only official INFORM crisis-level contextual records.

Never infer that a Risk Radar risk is identical to a crisis because its country matches.
All data is drawn from a local, versioned public release. Missing/invalid data is explicit.
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path
from urllib.parse import urlparse

PORTAL_URL = "https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Severity/Results-and-data"
LEVELS = {"Very Low", "Low", "Medium", "High", "Very High"}
DIMENSIONS = ("impact", "conditions", "complexity")


def _missing(country: str, reason: str) -> dict:
    return {"available": False, "country": country, "release": None,
            "release_date": None, "source_url": PORTAL_URL, "crises": [],
            "note": "Country-level crisis context, not a verified match to any Risk Radar risk or an event forecast.",
            "reason": reason}


def _value(v):
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    if not math.isfinite(v) or not 0 <= v <= 10:
        return None
    return float(v)


def crises_for_country(country: str, dataset_path: Path) -> dict:
    """Read official crisis records for a country; never return a risk-specific severity match."""
    country = str(country).strip()[:150]
    if not country:
        return _missing(country, "Choose a country to see official crisis context.")
    if not dataset_path.is_file():
        return _missing(country, "Official September 2026 INFORM crisis export is not installed locally.")
    try:
        data = json.loads(dataset_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError):
        return _missing(country, "Official crisis export could not be read or validated.")
    if not isinstance(data, dict) or not isinstance(data.get("crises"), list):
        return _missing(country, "Official crisis export has an invalid structure.")
    if data.get("release") != "2026-09" or data.get("dataset") != "INFORM Severity Index":
        return _missing(country, "Official crisis export has an unrecognized release or index.")
    source = data.get("source_url", "")
    parsed = urlparse(source) if isinstance(source, str) else None
    if not parsed or parsed.scheme != "https" or parsed.hostname != "drmkc.jrc.ec.europa.eu":
        return _missing(country, "Official crisis export has invalid source metadata.")
    found = []
    for item in data["crises"]:
        if not isinstance(item, dict) or str(item.get("country", "")).casefold().strip() != country.casefold():
            continue
        score = _value(item.get("score"))
        dims = item.get("dimensions", {})
        if (score is None or not isinstance(dims, dict) or
            any(_value(dims.get(x)) is None for x in DIMENSIONS) or
            item.get("level") not in LEVELS or
            not isinstance(item.get("crisis_id"), str) or
            not re.fullmatch(r"[A-Z]{3}[0-9]{3}", item["crisis_id"]) or
            not isinstance(item.get("crisis_name"), str) or not item["crisis_name"].strip() or
            not isinstance(item.get("last_updated"), str) or
            not re.fullmatch(r"20\d{2}-\d{2}-\d{2}", item["last_updated"])):
            continue
        found.append({
            "crisis_id": item["crisis_id"], "crisis_name": item["crisis_name"],
            "score": score, "level": item["level"],
            "trend": str(item.get("trend") or "Not reported"),
            "reliability": str(item.get("reliability") or "Not reported"),
            "last_updated": item["last_updated"],
            "dimensions": {name: _value(dims[name]) for name in DIMENSIONS},
            "geographic_scope": item.get("geographic_scope"),
            "subnational_areas": [str(x) for x in item.get("subnational_areas", []) if isinstance(x, str)][:20]
                if isinstance(item.get("subnational_areas"), list) else [],
            "source_row": item.get("source_row"),
        })
    found.sort(key=lambda x: (-x["score"], x["crisis_name"]))
    return {"available": True, "country": country, "release": data["release"],
            "release_date": data.get("release_date"), "source_url": source,
            "crises": found,
            "note": "These are existing humanitarian crises in the selected country, not a verified match to this Risk Radar event or a six-month forecast."}
