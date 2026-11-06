"""Versioned, deterministic ACAPS methodology helpers.

The ranges below come from the ACAPS risk analysis methodology dated May 2019,
page 11. They are *historical explanatory labels*, not an official 2026
forecasting calibration or a replacement for impact-based risk assessment.
"""
from __future__ import annotations

from typing import TypedDict


class ProbabilityBand(TypedDict):
    label: str
    minimum: int
    maximum: int


METHODOLOGY_VERSION = "ACAPS May 2019 risk analysis methodology"
METHODOLOGY_NOTE = (
    "Historical 2019 probability classification, supplied for context only. "
    "An expert forecast is not an ACAPS risk level; risk also considers impact. "
    "Verify current terminology and boundaries with ACAPS before operational use."
)

BANDS: tuple[ProbabilityBand, ...] = (
    {"label": "Very low", "minimum": 0, "maximum": 9},
    {"label": "Low", "minimum": 10, "maximum": 33},
    {"label": "Moderate", "minimum": 34, "maximum": 66},
    {"label": "High", "minimum": 67, "maximum": 90},
    {"label": "Very high", "minimum": 91, "maximum": 100},
)


def probability_band(percent: int) -> str:
    """Classify a whole-number percentage without changing the input forecast."""
    if isinstance(percent, bool) or not isinstance(percent, int) or not 0 <= percent <= 100:
        raise ValueError("Probability must be an integer between 0 and 100")
    for band in BANDS:
        if band["minimum"] <= percent <= band["maximum"]:
            return band["label"]
    raise AssertionError("Uncovered probability range")


def methodology_metadata() -> dict:
    return {
        "version": METHODOLOGY_VERSION,
        "probability_bands": [dict(band) for band in BANDS],
        "note": METHODOLOGY_NOTE,
        "risk_formula": "Risk combines probability and potential humanitarian impact; no automatic risk rating is computed.",
    }
