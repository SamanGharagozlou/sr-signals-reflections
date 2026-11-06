"""Deterministic, moderator-only next-question suggestions for a synthetic ACAPS panel.

Never interprets a note as verified evidence. The returned content intentionally
contains neither raw notes, individual estimates, identities nor exact theme counts.
This is decision support for a human moderator; no messages are dispatched.
"""
from __future__ import annotations

from typing import Any

# Curated and reviewable questions, not LLM output or extracted expert quotations.
FOLLOWUP_QUESTIONS = {
    "humanitarian_access": {
        "topic": "Humanitarian access",
        "question": "What dated, publicly shareable information would help ACAPS check whether humanitarian access along routes into eastern Chad is becoming more constrained?",
    },
    "displacement": {
        "topic": "Displacement",
        "question": "What dated, publicly shareable evidence could confirm or challenge reports of additional displacement in eastern Chad?",
    },
    "food_security": {
        "topic": "Food security",
        "question": "Which recent, independently checkable observations would best clarify food access or price changes affecting host communities in eastern Chad?",
    },
    "security": {
        "topic": "Security",
        "question": "Which dated, independently documented security developments could most change this six-month assessment of cross-border insecurity?",
    },
    "health": {
        "topic": "Health",
        "question": "What verifiable information is missing about access to essential health services in the affected parts of eastern Chad?",
    },
    "general": {
        "topic": "Verification priority",
        "question": "What is the single most important independently verifiable indicator ACAPS should monitor next, and which dated public source could support it?",
    },
}

THEME_TO_ID = {
    "Humanitarian access": "humanitarian_access",
    "Displacement": "displacement",
    "Food security": "food_security",
    "Security": "security",
    "Health": "health",
}


def build_moderator_synthesis(group: dict[str, Any], feedback_released: bool) -> dict[str, Any]:
    """Prepare a bounded question for analyst review after the first-round release.

    Single keyword mentions cannot nominate a theme because the panel is tiny.
    There is deliberately no extractive summary of identifiable field notes.
    """
    if not group.get("ready") or not feedback_released:
        return {
            "available": False,
            "reason": (
                "Complete the five-expert synthetic panel and release its group feedback first."
            ),
            "approved": None,
        }

    agreement = group["agreement"]
    has_disagreement = sum(v > 0 for v in agreement.values()) > 1
    eligible = [
        (name, int(count))
        for name, count in group["theme_counts"].items()
        if name in THEME_TO_ID and isinstance(count, int) and count >= 2
    ]
    eligible.sort(key=lambda item: (-item[1], item[0]))
    key = THEME_TO_ID[eligible[0][0]] if eligible else "general"
    selected = FOLLOWUP_QUESTIONS[key]
    return {
        "available": True,
        "panel_size": group["count"],
        "disagreement_summary": (
            "Different risk assessments were submitted."
            if has_disagreement else "The submitted risk assessments were similar."
        ),
        "evidence_status": (
            "A recurring keyword theme may deserve verification; it is not confirmed evidence."
            if eligible else "No recurring theme met the minimum signal rule; ask a general verification question."
        ),
        "proposed": {"id": key, **selected},
        "review_notice": (
            "Synthetic demo. This question is a deterministic suggestion, not verified evidence. "
            "Only a moderator may approve it; approval does not contact experts or change ACAPS ratings."
        ),
        "approved": None,
    }
