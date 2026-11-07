"""Deterministic source-field completeness checks for moderator triage.

These flags identify *review opportunities*, not incorrect ACAPS assessments,
verified evidence gaps, or automated changes to humanitarian risk levels.
No LLMs, news ingestion, or external requests. Source rows remain unchanged.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from typing import Mapping


# Only fields known in the organizer-provided Risk Radar contract are checked.
# A missing *column* is not automatically treated as missing evidence in reality.
CHECKS = (
    ("risk_title", "Risk Title", "Risk title absent", "Confirm the risk title in the source record."),
    ("country", "Country", "Country / area absent", "Confirm the geographic label against the source."),
    ("status", "Status", "Record status absent", "Verify whether this record is active or resolved."),
)
ACTIVE_CHECKS = (
    ("risk_level", "Risk Level", "Qualitative risk level absent", "Ask an analyst to verify the source risk classification."),
    ("probability", "Probability", "Qualitative probability absent", "Check the original qualitative probability assessment; do not infer a percentage."),
    ("impact", "Impact", "Impact category absent", "Verify the recorded impact category against the source."),
    ("triggers", "Triggers", "Trigger field empty", "Check whether trigger information exists elsewhere in the source material."),
)


def _missing(value: object) -> bool:
    return value is None or str(value).strip().lower() in {"", "nan", "none", "null", "n/a", "na", "-"}


def _flag(record: Mapping[str, object], risk_id: str, code: str, field: str, title: str,
          next_step: str, priority: str) -> dict:
    # The fingerprint expires a triage decision if this *specific source field* changes.
    payload = [risk_id, code, field, str(record.get(field, "<absent>"))]
    digest = hashlib.sha256(json.dumps(payload, ensure_ascii=False).encode("utf-8")).hexdigest()[:24]
    field_exists = field in record
    return {
        "code": code, "label": title, "priority": priority, "source_field": field,
        "field_present": field_exists,
        "reason": (f"The '{field}' column is present but this record has no stated value."
                   if field_exists else f"The '{field}' column is not included in this export."),
        "suggested_review": next_step,
        "fingerprint": digest,
    }


def evaluate_records(records: list[dict], source: str) -> dict:
    """Return a deterministic read-only queue; no source values are modified."""
    if not source.startswith("official organizer-provided"):
        return {
            "available": False, "source": source, "total_records": len(records),
            "items": [], "reason": "The full organizer-provided Risk Radar CSV is not loaded.",
            "methodology": "Flags are field-completeness prompts, not assessed evidence quality.",
        }

    items: list[dict] = []
    for i, record in enumerate(records, start=2):  # CSV header is row 1
        source_risk_id = str(record.get("Risk ID", "") or "").strip()
        risk_id = source_risk_id or f"EXPORT-ROW-{i}"
        status = str(record.get("Status", "") or "").strip()
        active = status.casefold() == "active"
        flags = []
        if _missing(record.get("Risk ID")):
            flags.append(_flag(record, risk_id, "risk_id", "Risk ID", "Risk identifier absent",
                               "Confirm the source row ID before linking records.", "review-first"))
        for code, field, title, next_step in CHECKS:
            if _missing(record.get(field)):
                flags.append(_flag(record, risk_id, code, field, title, next_step,
                                   "review-first" if active and code in {"risk_title", "country"} else "review"))
        if active:
            for code, field, title, next_step in ACTIVE_CHECKS:
                if _missing(record.get(field)):
                    flags.append(_flag(record, risk_id, code, field, title, next_step, "review-first"))
        # Never flag absence of Source unless an explicit Source column exists.
        if active and "Source" in record and _missing(record.get("Source")):
            flags.append(_flag(record, risk_id, "source_field", "Source", "Source field empty",
                               "Look for source references in other export fields or the original record.", "review"))

        if flags:
            items.append({
                "risk_id": risk_id, "source_risk_id_present": bool(source_risk_id),
                "title": str(record.get("Risk Title", "") or "").strip() or "Untitled source record",
                "country": str(record.get("Country", "") or "").strip() or "Country not recorded",
                "status": status or "Not recorded", "risk_level": str(record.get("Risk Level", "") or "").strip() or "Not recorded",
                "priority": "review-first" if any(f["priority"] == "review-first" for f in flags) else "review",
                "flags": flags,
            })
    items.sort(key=lambda item: (0 if item["priority"] == "review-first" else 1,
                                 0 if item["status"].casefold() == "active" else 1,
                                 item["country"].casefold(), item["risk_id"]))
    return {
        "available": True, "source": source, "total_records": len(records),
        "items": items, "reason": None,
        "methodology": (
            "Deterministic completeness checks on exported fields only. A missing value does NOT prove "
            "missing evidence or a mistaken assessment. No risk levels, probabilities or source records are modified. "
            "The queue excludes private expert responses and does not estimate forecast accuracy."
        ),
    }


def decorate_review_state(queue: dict, states: Mapping[tuple[str, str], Mapping]) -> dict:
    """Attach persisted moderator triage; changed-source fingerprints reopen alerts."""
    if not queue["available"]:
        return {**queue, "summary": {"open_flags": 0, "triaged_flags": 0, "flagged_records": 0, "review_first_records": 0, "by_rule": {}}}
    open_count = triaged_count = 0
    rule_counts: Counter[str] = Counter()
    items = []
    for item in queue["items"]:
        decorated = []
        for flag in item["flags"]:
            state = states.get((item["risk_id"], flag["code"]))
            triaged = bool(state and state["fingerprint"] == flag["fingerprint"] and state["disposition"] == "triaged")
            if triaged:
                triaged_count += 1
            else:
                open_count += 1
            rule_counts[flag["code"]] += 1
            decorated.append({**flag, "triaged": triaged, "triaged_at": state["updated_at"] if triaged else None})
        items.append({**item, "flags": decorated, "open_flags": sum(not f["triaged"] for f in decorated)})
    items.sort(key=lambda item: (item["open_flags"] == 0, 0 if item["priority"] == "review-first" else 1,
                                 item["country"].casefold(), item["risk_id"]))
    return {**queue, "items": items, "summary": {
        "open_flags": open_count, "triaged_flags": triaged_count,
        "flagged_records": len(items), "review_first_records": sum(i["priority"] == "review-first" for i in items),
        "by_rule": dict(sorted(rule_counts.items())),
    }}
