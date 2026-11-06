"""Structure organizer-provided ACAPS Risk Radar records for moderator review.

No network calls, LLM interpretation, guessed evidence, automatic scoring, or
live data. All output is derived from the selected source record and flagged
where fields are missing. Intended for synthetic-data hackathon use only.
"""
from __future__ import annotations

import html
import re
from urllib.parse import urlparse

from acaps_methodology import methodology_metadata


_TRIGGER_BOUNDARY = re.compile(r"(?=\bTrigger\s+ID\s*:)", re.IGNORECASE)
_FIELD = re.compile(r"(?im)^\s*(Trigger\s+ID|Title|Description|Sources|Completion\s+rate)\s*:\s*")
_MARKDOWN_LINK = re.compile(r"\[([^\]]+)\]\((https?://[^\s)\\]+)", re.IGNORECASE)
_BARE_URL = re.compile(r"https?://[^\s<>\]\[()\\]+", re.IGNORECASE)


def clean_text(raw: object) -> str:
    """Normalize the main artifacts of the organizers' original XLSX export."""
    if raw is None:
        return ""
    val = str(raw).replace("_x000D_", "").replace("\r\n", "\n").replace("\r", "\n")
    if val.lower() in ("nan", "none", "null"):
        return ""
    return html.unescape(val).strip()


def extract_sources(raw: object, *, limit: int = 25) -> list[dict[str, str]]:
    """Return source URLs already present in the source text, without fetching them."""
    text = clean_text(raw)
    sources: list[dict[str, str]] = []
    used = set()
    for pattern, kind in ((_MARKDOWN_LINK, "markdown"), (_BARE_URL, "bare")):
        for match in pattern.finditer(text):
            url = (match.group(2) if kind == "markdown" else match.group(0)).rstrip(".,;\\")
            url = url.rstrip(")")
            parts = urlparse(url)
            if parts.scheme not in ("http", "https") or not parts.netloc or url in used:
                continue
            used.add(url)
            sources.append({"label": clean_text(match.group(1)) if kind == "markdown" else parts.netloc,
                            "url": url})
            if len(sources) >= limit:
                return sources
    return sources


def parse_triggers(raw: object) -> list[dict]:
    """Parse structured Trigger ID / Title / Description blocks if available."""
    text = clean_text(raw)
    parts = [s.strip() for s in _TRIGGER_BOUNDARY.split(text) if s.strip()]
    result: list[dict] = []
    for part in parts:
        if not re.match(r"^Trigger\s+ID\s*:", part, re.IGNORECASE):
            continue
        matches = list(_FIELD.finditer(part))
        fields: dict[str, str] = {}
        for i, match in enumerate(matches):
            key = re.sub(r"\s+", " ", match.group(1)).lower()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(part)
            fields[key] = clean_text(part[match.end():end]).lstrip(": ")
        result.append({
            "id": fields.get("trigger id") or None,
            "title": fields.get("title") or None,
            "description": fields.get("description") or None,
            "sources": extract_sources(fields.get("sources", "")),
        })
    return result


def build_risk_context(record: dict[str, str], origin: str) -> dict:
    """Structure an ACAPS row, preserving official labels and explicit absences."""
    def get(key: str) -> str | None:
        return clean_text(record.get(key)) or None

    raw_triggers = get("Triggers")
    parsed_triggers = parse_triggers(raw_triggers)
    evidence_fields = {
        "rationale": "Source",
        "vulnerability_and_coping": "Current vulnerability / Coping capacities sources",
        "expected_impact": "Expected impact sources",
        "materialisation": "Materialisation sources",
    }
    evidence = {
        name: {"text": get(txt), "sources": extract_sources(record.get(source_key))}
        for name, txt, source_key in (
            ("rationale", "Rationale", evidence_fields["rationale"]),
            ("vulnerability_and_coping", "Current vulnerability / Coping capacities", evidence_fields["vulnerability_and_coping"]),
            ("expected_impact", "Expected impact", evidence_fields["expected_impact"]),
            ("materialisation", "Hazard materialisation", evidence_fields["materialisation"]),
        )
    }
    essential = ("Risk ID", "Risk Title", "Country", "Probability", "Impact", "Risk Level", "Rationale", "Triggers")
    return {
        "risk_id": get("Risk ID"),
        "title": get("Risk Title"),
        "country": get("Country"),
        "source": origin,
        "assessment": {
            "acaps_probability_category": get("Probability"),
            "acaps_impact": get("Impact"),
            "acaps_risk_level": get("Risk Level"),
            "trend": get("Risk trend"),
            "status": get("Status"),
            "expected_exposure": get("Expected exposure"),
            "priority_needs": [x.strip() for x in (get("Expected priority needs") or "").split(",") if x.strip()],
        },
        "evidence": evidence,
        "triggers": parsed_triggers,
        "unstructured_triggers": raw_triggers if raw_triggers and not parsed_triggers else None,
        "missing_fields": [key for key in essential if not get(key)],
        "methodology": methodology_metadata(),
        "warnings": [
            "Not an official updated ACAPS assessment; reflects the supplied Risk Radar record only.",
            "Moderator review required before converting source material into a consultation question.",
            "Do not treat an ACAPS probability category as an expert numerical forecast or derive a risk rating automatically.",
        ],
    }
