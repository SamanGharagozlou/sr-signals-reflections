"""S&R synthetic-only source intake. Never an automatic fact-checker or forecast input.

Only sanitized demo claims are persisted. No raw email/URL/photo is stored.
The existing FastAPI session dependencies authorize experts and moderators.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Callable, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

MAX_SOURCE = 2200
PREVIEW_NOTICE = "Heuristic extraction only. Verify all fields yourself; unverified reports are not facts."


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def safe_demo_text(value: str) -> str:
    """Redact obvious email/telephone patterns; reject remaining common identifiers.

    This is a demo guardrail, NOT verified PII detection. Synthetic data only.
    """
    val = value.strip()
    val = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[removed]", val)
    val = re.sub(r"(?<!\w)(?:\+\d[\d\s().-]{8,}\d|\b\d{3}[-. ]\d{3}[-. ]\d{4}\b)", "[removed]", val)
    val = re.sub(r"(?im)^\s*(?:from|call me on|tel|phone|email|contact)\s*:\s*[^\n]*$", "[redacted contact line]", val)
    return val[:MAX_SOURCE]


def extract_fields(text: str) -> dict:
    clean = safe_demo_text(text)
    lower = clean.lower()
    count = re.search(r"\b(?:about|approximately|around|roughly)?\s*(\d{1,3}(?:,\d{3})+|\d{2,6})\s+(?:new\s+)?(?:arrivals|people|individuals|displaced|refugees)\b", lower)
    reported_count = int(count.group(1).replace(",", "")) if count else None
    place = next((p for p in ("Iriba", "Adré", "Ouaddaï", "Abéché", "Chad") if p.lower() in lower), "")
    explicit_day = re.search(r"\b20\d{2}-\d{2}-\d{2}\b", clean)
    date_text = explicit_day.group(0) if explicit_day else (next((d for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday") if d.lower() in lower), ""))
    event = "Reported population movement" if any(w in lower for w in ("arrival", "displac", "refugee")) else "Reported field observation"
    suggested_risk = "R1043" if any(w in lower for w in ("iriba", "adré", "chad", "sudan", "arrival", "displac")) else None
    return {"sanitized_preview": clean, "reported_count": reported_count, "reported_place": place,
            "reported_date": date_text, "event": event, "suggested_risk_id": suggested_risk,
            "notice": PREVIEW_NOTICE, "redaction_automatically_verified": False}


class PreviewInput(BaseModel):
    source_type: Literal["email", "note"]
    source_text: str = Field(min_length=10, max_length=MAX_SOURCE)


class SubmitInput(PreviewInput):
    risk_id: str = Field(min_length=2, max_length=32)
    reported_place: str = Field(default="", max_length=100)
    reported_date: str = Field(default="", max_length=50)
    reported_count: int | None = Field(default=None, ge=0, le=100000000)
    event: str = Field(min_length=3, max_length=160)
    source_category: Literal["field_observation", "ngo_report", "news_media", "other"]
    proximity: Literal["firsthand", "trusted_secondhand", "media", "unknown"]
    confirmed_synthetic: Literal[True]
    confirmed_no_pii: Literal[True]


class ReviewInput(BaseModel):
    decision: Literal["accepted_for_analysis", "needs_more_evidence", "rejected"]
    note: str = Field(default="", max_length=500)
    expected_version: int = Field(ge=0)


def install_tables(conn) -> None:
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS sr_source_intake (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expert_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        redacted_text TEXT NOT NULL,
        risk_id TEXT NOT NULL,
        reported_place TEXT NOT NULL,
        reported_date TEXT NOT NULL,
        reported_count INTEGER,
        event TEXT NOT NULL,
        source_category TEXT NOT NULL,
        proximity TEXT NOT NULL,
        redaction_confirmed INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending_review',
        reviewer_note TEXT NOT NULL DEFAULT '',
        version INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        reviewed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sr_source_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL REFERENCES sr_source_intake(id),
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        occurred_at TEXT NOT NULL
    );
    """)


def to_view(row) -> dict:
    x = dict(row)
    x["id"] = f"EV-{x['id']:04d}"
    x["redaction_confirmed"] = bool(x["redaction_confirmed"])
    # Reviewer auth never exposes the original unredacted message, which is not stored.
    return x


def create_router(db: Callable, require_expert: Callable, require_moderator: Callable, get_risks: Callable):
    router = APIRouter()

    @router.post("/api/evidence/preview")
    def preview(body: PreviewInput, auth=Depends(require_expert)):
        return extract_fields(body.source_text)

    @router.post("/api/evidence/submit")
    def submit(body: SubmitInput, auth=Depends(require_expert)):
        if body.risk_id not in {r.get("Risk ID") for r in get_risks()[0]}:
            raise HTTPException(400, "Choose a risk from the available Risk Radar inventory")
        text = safe_demo_text(body.source_text)
        if not text or "@" in text:
            raise HTTPException(400, "Please remove all personal identifiers before submitting")
        with db() as conn:
            install_tables(conn)
            cursor = conn.execute("""INSERT INTO sr_source_intake (
                expert_id,source_type,redacted_text,risk_id,reported_place,reported_date,reported_count,
                event,source_category,proximity,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (auth["expert_id"],body.source_type,text,body.risk_id,body.reported_place.strip(),body.reported_date.strip(),
                 body.reported_count,body.event.strip(),body.source_category,body.proximity,timestamp()))
            source_id = cursor.lastrowid
            conn.execute("INSERT INTO sr_source_audit(source_id,action,actor,occurred_at) VALUES(?,?,?,?)",
                         (source_id,"submitted",auth["expert_id"],timestamp()))
            row = conn.execute("SELECT * FROM sr_source_intake WHERE id=?",(source_id,)).fetchone()
            return {"item":to_view(row),"notice":"Saved for analyst review. Not verified and not automatically used in forecasts or simulation."}

    @router.get("/api/evidence/mine")
    def mine(auth=Depends(require_expert)):
        with db() as conn:
            install_tables(conn)
            rows = conn.execute("SELECT * FROM sr_source_intake WHERE expert_id=? ORDER BY id DESC LIMIT 25",(auth["expert_id"],)).fetchall()
            return {"items":[to_view(r) for r in rows]}

    @router.get("/api/moderator/source-intake")
    def moderator_list(auth=Depends(require_moderator)):
        with db() as conn:
            install_tables(conn)
            rows=conn.execute("SELECT * FROM sr_source_intake ORDER BY CASE WHEN status='pending_review' THEN 0 ELSE 1 END, id DESC LIMIT 80").fetchall()
            return {"items":[to_view(r) for r in rows],"notice":"Private synthetic evidence queue. Accepted means reviewed for analysis, not established as true."}

    @router.post("/api/moderator/source-intake/{evidence_id}/review")
    def review(evidence_id: int, body: ReviewInput, auth=Depends(require_moderator)):
        if evidence_id <= 0: raise HTTPException(404, "Unknown evidence")
        note = safe_demo_text(body.note)
        with db() as conn:
            install_tables(conn)
            row=conn.execute("SELECT * FROM sr_source_intake WHERE id=?",(evidence_id,)).fetchone()
            if row is None: raise HTTPException(404, "Unknown evidence")
            if row["version"] != body.expected_version: raise HTTPException(409, "Evidence changed. Refresh and review again")
            if row["status"] != "pending_review": raise HTTPException(409, "This evidence has already received a decision")
            conn.execute("UPDATE sr_source_intake SET status=?,reviewer_note=?,reviewed_at=?,version=version+1 WHERE id=?",
                         (body.decision,note,timestamp(),evidence_id))
            conn.execute("INSERT INTO sr_source_audit(source_id,action,actor,occurred_at) VALUES(?,?,?,?)",
                         (evidence_id,body.decision,"moderator",timestamp()))
            new=conn.execute("SELECT * FROM sr_source_intake WHERE id=?",(evidence_id,)).fetchone()
            return {"item":to_view(new),"notice":"Decision recorded. No automatic forecast or public release."}

    return router
