"""Responsible descriptive evaluation of historical ACAPS Risk Radar outcomes.

Do not treat ACAPS qualitative *overall risk level* as a numeric forecast.
The historical export mixes time horizons and includes selected risks only.
This module reports descriptive frequencies, not calibration or prediction skill.
"""
from __future__ import annotations

from collections.abc import Mapping, Sequence
from decimal import Decimal, ROUND_HALF_UP

LEVELS = ("High", "Medium", "Low", "Unknown")
RESOLVED = ("Materialised", "Not materialised")
MATRIX_VERSION = "Challenge repository: docs/risk-methodology.md (2026 resource pack)"
# Rows: qualitative probability; columns: impact levels 1..5.
RISK_MATRIX = {
    "Very high": ("Medium", "Medium", "High", "High", "High"),
    "High": ("Low", "Medium", "Medium", "High", "High"),
    "Medium": ("Low", "Medium", "Medium", "Medium", "High"),
    "Low": ("Low", "Low", "Medium", "Medium", "Medium"),
    "Very low": ("Low", "Low", "Low", "Low", "Medium"),
}


def risk_matrix_lookup(probability_category: str, impact: int) -> str:
    """Illustrative documented lookup, never a replacement for an original ACAPS rating."""
    if not isinstance(probability_category, str):
        raise ValueError("Unrecognized qualitative probability")
    label = probability_category.strip().casefold()
    band = next((key for key in RISK_MATRIX if key.casefold() == label), None)
    if band is None or isinstance(impact, bool) or type(impact) is not int or impact not in range(1, 6):
        raise ValueError("Expected a documented probability category and impact 1..5")
    return RISK_MATRIX[band][impact - 1]


def score_binary_forecasts(pairs: Sequence[tuple[int, int]]) -> dict:
    """Brier score ONLY for documented numeric forecasts with resolved binary outcomes.

    This function deliberately accepts no Risk Radar qualitative ratings.
    It is not called on historical ACAPS categories.
    """
    if not pairs:
        raise ValueError("At least one resolved numeric forecast is required")
    scores = []
    for probability, outcome in pairs:
        if type(probability) is not int or probability not in range(101):
            raise ValueError("Forecast must be an integer percentage (0..100)")
        if type(outcome) is not int or outcome not in (0, 1):
            raise ValueError("Outcome must be resolved as 0 or 1")
        scores.append((Decimal(probability) / 100 - Decimal(outcome)) ** 2)
    return {"count": len(scores), "mean_brier": float((sum(scores) / len(scores)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)), "lower_is_better": True}


def summarize_historical_outcomes(records: Sequence[Mapping[str, object]], source: str) -> dict:
    """Historical frequencies grouped by *overall risk level*, without invented probabilities."""
    counts = {level: {"total": 0, "resolved": 0, "materialised": 0, "not_materialised": 0, "active": 0, "unknown_status": 0}
              for level in LEVELS}
    for item in records:
        raw_level = str(item.get("Risk Level") or "").strip().casefold()
        level = next((candidate for candidate in LEVELS[:-1] if candidate.casefold() == raw_level), "Unknown")
        raw_status = str(item.get("Status") or "").strip().casefold()
        row = counts[level]
        row["total"] += 1
        if raw_status == "materialised":
            row["materialised"] += 1
            row["resolved"] += 1
        elif raw_status == "not materialised":
            row["not_materialised"] += 1
            row["resolved"] += 1
        elif raw_status == "active":
            row["active"] += 1
        else:
            row["unknown_status"] += 1

    rows = []
    for level in LEVELS:
        row = counts[level]
        n = row["resolved"]
        rows.append({
            "level": level, **row,
            "observed_materialisation_pct": round(100 * row["materialised"] / n, 1) if n else None,
            "small_sample": n < 10,
            "rate_displayable": n >= 10,
        })
    totals = {key: sum(r[key] for r in rows) for key in ("total", "resolved", "materialised", "not_materialised", "active", "unknown_status")}
    return {
        "available": True,
        "source": source,
        "population": "Selected historical ACAPS risk records; not all considered or rejected candidate risks",
        "totals": totals,
        "by_risk_level": rows,
        "risk_matrix_version": MATRIX_VERSION,
        "limitations": [
            "Overall risk categories combine qualitative probability and impact; they are NOT numeric probability forecasts.",
            "Materialisation percentages are descriptive historical frequencies, NOT Brier scores or calibration curves.",
            "Records have different monitoring horizons; they cannot all be treated as six-month resolutions.",
            "Active and unknown-status records are excluded from resolved-outcome percentages.",
            "Groups with fewer than 10 resolved records are suppressed from rate visualisations.",
            "The Risk Radar export omits potential risks that were considered but not entered; selection bias limits comparisons.",
        ],
        "brier_evaluation": "Not computed: this export does not contain comparable original numerical forecasts and resolution dates for all records.",
    }
