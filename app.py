"""SIGNAL: standalone synthetic-data prototype for Hackathon for Good #8 / ACAPS.

NOT production software. No real identities, field reports, or sensitive information.
Backend is independent of any other project. Run: uvicorn app:app --reload.
"""
from __future__ import annotations

import csv
import json
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import median, quantiles
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from risk_context import build_risk_context
from historical_evaluation import summarize_historical_outcomes
from moderator_synthesis import build_moderator_synthesis
from severity_index import severity_for_risk
from inform_crisis_context import crises_for_country

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("SIGNAL_DB_PATH", ROOT / "signal_demo.db"))
RISK_CSV = Path(os.environ.get("SIGNAL_RISK_CSV", ROOT / "data" / "risk-radar-export.csv"))
SEVERITY_MANIFEST = Path(os.environ.get("SIGNAL_SEVERITY_MANIFEST", ROOT / "data" / "inform-severity-matches.json"))
INFORM_CONTEXT = Path(os.environ.get("SIGNAL_INFORM_CONTEXT", ROOT / "data" / "inform-severity-2026-09-crises.json"))
if not RISK_CSV.exists():
    sibling = ROOT.parent / "HFG8-ACAPS-Ground-Truth" / "data" / "risk-radar-export.csv"
    if sibling.exists():
        RISK_CSV = sibling

# Authoritative demo fields from the original organizer-supplied Risk Radar workbook.
# This embedded fixture is a minimal fallback, not a substitute for the official CSV.
R1043 = {
    "Risk ID": "R1043",
    "Risk Title": "Escalating cross-border insecurity linked to the Sudan conflict increases protection risks and humanitarian needs in eastern Chad",
    "Country": "Chad",
    "Probability": "High",
    "Impact": "4",
    "Risk Level": "High",
    "Risk trend": "Deteriorated",
    "Status": "Active",
    "Expected exposure": ">500,000",
    "Expected priority needs": "Protection, Food security, Livelihoods, Health",
    "Triggers": "Expansion of cross-border attacks and insecurity near the Chad–Sudan border",
    "Source": "ACAPS Risk Radar export, provided for Hackathon for Good #8",
}

# The demo forecast is authored by SIGNAL, NOT a quoted ACAPS forecast question.
FORECAST_QUESTION = {
    "question": "Will at least one newly documented episode of cross-border attacks cause additional displacement in eastern Chad within the next six months?",
    "deadline": "2027-05-06",
    "resolution": "A moderator identifies an independently documented displacement episode attributed to a cross-border attack after 2026-11-06 and on or before 2027-05-06. Otherwise the result is not automatically resolved: missing evidence remains unresolved.",
    "status": "Proposed demonstration question — not ACAPS-approved",
}

EXPERTS = [
    ("expert-01", "FIELD-01", "Synthetic Expert 01"),
    ("expert-02", "FIELD-02", "Synthetic Expert 02"),
    ("expert-03", "FIELD-03", "Synthetic Expert 03"),
    ("expert-04", "FIELD-04", "Synthetic Expert 04"),
    ("expert-05", "FIELD-05", "Synthetic Expert 05"),
]

SYNTHETIC_RESPONSES = [
    ("expert-01", "about_right", 70, "medium", "Aid access may deteriorate along cross-border routes.", "acaps_only"),
    ("expert-02", "underestimated", 85, "high", "Displacement pressure may be rising.", "anonymous"),
    ("expert-03", "about_right", 60, "medium", "Food security could worsen in host communities.", "pseudonymous"),
    ("expert-04", "overestimated", 45, "low", "Some corridors may remain operational.", "acaps_only"),
]

TAG_WORDS = {
    "Displacement": ("displac", "refuge", "migration"),
    "Humanitarian access": ("access", "corridor", "deliver", "route"),
    "Food security": ("food", "market", "price", "livelihood"),
    "Security": ("attack", "insecurity", "border", "conflict"),
    "Health": ("health", "hospital", "clinic", "medical"),
}

# Editorial challenge prompts, not evidence, predictions, or statements from panel members.
# Moderator selects exactly one fixed option AFTER first-round feedback is released.
COUNTERPOINTS = (
    {
        "id": "attribution",
        "title": "Test the attribution",
        "text": "Could additional displacement be explained by factors other than a new cross-border attack? What independently dated evidence would establish the cause?",
    },
    {
        "id": "documentation",
        "title": "Test what would count as evidence",
        "text": "Could gaps in reporting make a genuine displacement episode difficult to confirm? What accessible, independent sources would support or challenge the forecast?",
    },
)
COUNTERPOINT_NOTICE = (
    "Moderator-approved reflection prompt, not a claim from another expert, "
    "a verified field report, or an ACAPS conclusion. You can keep your original forecast."
)

SESSION_TTL = timedelta(hours=8)  # Hackathon session expiry; NOT production authentication.

app = FastAPI(title="SIGNAL — ACAPS Ground Truth Demo", version="0.3.0", description="Synthetic-data-only hackathon prototype")


@app.middleware("http")
async def protect_api_caches(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def initialize():
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS experts (
          id TEXT PRIMARY KEY, invite_code TEXT NOT NULL UNIQUE, label TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS submissions (
          expert_id TEXT PRIMARY KEY REFERENCES experts(id), agreement TEXT NOT NULL,
          probability INTEGER NOT NULL, confidence TEXT NOT NULL,
          note TEXT NOT NULL, anonymity TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS revisions (
          expert_id TEXT PRIMARY KEY REFERENCES experts(id), probability INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY, role TEXT NOT NULL,
          expert_id TEXT, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        """)
        for ex in EXPERTS:
            conn.execute("INSERT OR IGNORE INTO experts(id,invite_code,label) VALUES(?,?,?)", ex)
        n = conn.execute("SELECT COUNT(*) FROM submissions").fetchone()[0]
        if n == 0:
            for e in SYNTHETIC_RESPONSES:
                conn.execute("""INSERT INTO submissions
                    (expert_id,agreement,probability,confidence,note,anonymity,created_at)
                    VALUES(?,?,?,?,?,?,?)""", (*e, now()))
        conn.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('feedback_released','false')")
        conn.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('public_approved','false')")
        conn.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('public_snapshot','')")
        conn.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('moderator_followup','')")
        conn.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('delphi_counterpoint','')")
        # Fail closed for local databases created before snapshot support existed.
        if not config(conn, "public_snapshot"):
            set_config(conn, "public_approved", "false")


def config(conn, key):
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row[0] if row else "false"


def set_config(conn, key, val):
    conn.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, val))


def get_risks():
    if RISK_CSV.exists():
        try:
            with open(RISK_CSV, newline="", encoding="utf-8-sig") as f:
                records = list(csv.DictReader(f))
            if any(r.get("Risk ID") == "R1043" for r in records):
                return records, "official organizer-provided CSV"
        except (OSError, UnicodeError, csv.Error):
            pass
    return [R1043], "built-in R1043 fallback (copy the official CSV into data/ for all 139 risks)"


def risk_card(record):
    return {
        "id": record.get("Risk ID", ""),
        "title": record.get("Risk Title", ""),
        "country": record.get("Country", ""),
        "probability_category": record.get("Probability", ""),
        "impact": record.get("Impact", ""),
        "risk_level": record.get("Risk Level", ""),
        "trend": record.get("Risk trend", ""),
        "status": record.get("Status", ""),
        "exposure": record.get("Expected exposure", ""),
        "priority_needs": record.get("Expected priority needs", ""),
        "triggers": record.get("Triggers", "")[:700],
        "sources": record.get("Source", "")[:400],
    }


class Login(BaseModel):
    code: str = Field(min_length=1, max_length=80)


class Contribution(BaseModel):
    agreement: Literal["underestimated", "about_right", "overestimated"]
    probability: int = Field(ge=0, le=100)
    confidence: Literal["low", "medium", "high"]
    note: str = Field(default="", max_length=300)
    anonymity: Literal["acaps_only", "pseudonymous", "anonymous"]


class Revision(BaseModel):
    probability: int = Field(ge=0, le=100)


class FollowupApproval(BaseModel):
    question_id: str = Field(min_length=1, max_length=40)


class CounterpointApproval(BaseModel):
    prompt_id: Literal["attribution", "documentation"]


class ScoreRequest(BaseModel):
    probability: int = Field(ge=0, le=100)
    outcome: Literal[0, 1]


def session(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Demo login required")
    with db() as conn:
        entry = conn.execute("SELECT role,expert_id,created_at FROM sessions WHERE token=?", (authorization[7:],)).fetchone()
        if not entry:
            raise HTTPException(401, "Session expired; sign in again")
        try:
            issued = datetime.fromisoformat(entry["created_at"])
            if issued.tzinfo is None or datetime.now(timezone.utc) - issued > SESSION_TTL or issued > datetime.now(timezone.utc):
                raise ValueError("Invalid or expired token")
        except (ValueError, TypeError):
            conn.execute("DELETE FROM sessions WHERE token=?", (authorization[7:],))
            conn.commit()  # persist revocation before raising 401
            raise HTTPException(401, "Session expired; sign in again")
        return {"role": entry["role"], "expert_id": entry["expert_id"]}


def require_moderator(auth=Depends(session)):
    if auth["role"] != "moderator":
        raise HTTPException(403, "Moderator access required")
    return auth


def require_expert(auth=Depends(session)):
    if auth["role"] != "expert":
        raise HTTPException(403, "Expert access required")
    return auth


def describe_probabilities(values):
    """Describe a small, non-random panel; no population inference or confidence intervals."""
    if not values:
        return {"median": None, "range": [], "average": None, "iqr": None, "mad": None}
    med = median(values)
    # Quartiles for panels with at least four estimates; inclusive interpolation.
    # An IQR is descriptive, NOT a confidence interval or model uncertainty.
    q1, _, q3 = quantiles(values, n=4, method="inclusive") if len(values) >= 4 else (None, None, None)
    return {
        "median": med,
        "range": [min(values), max(values)],
        "average": round(sum(values) / len(values), 1),
        "iqr": round(q3 - q1, 2) if q1 is not None else None,
        "mad": median([abs(x - med) for x in values]),
    }


def compute_group(conn):
    """Calculate complete-panel Delphi comparisons, keeping unrevised estimates.

    Round 2 is a full-panel *current view*, not a median of the people who
    happen to revise. It exists only after at least one revision is received.
    These statistics describe synthetic judgments and are not crisis forecasts.
    """
    submissions = [dict(r) for r in conn.execute("SELECT * FROM submissions ORDER BY expert_id")]
    revisions = {r["expert_id"]: r["probability"] for r in conn.execute("SELECT expert_id,probability FROM revisions")}
    n = len(submissions)
    original = [r["probability"] for r in submissions]
    current = [revisions.get(r["expert_id"], r["probability"]) for r in submissions]
    first = describe_probabilities(original)
    second = describe_probabilities(current) if revisions else None
    agreement = {k: sum(r["agreement"] == k for r in submissions) for k in ("underestimated", "about_right", "overestimated")}
    themes = {name: sum(any(term in r["note"].lower() for term in terms) for r in submissions) for name, terms in TAG_WORDS.items()}
    themes = {k: v for k, v in themes.items() if v}
    return {
        "count": n,
        "expected": len(EXPERTS),
        "ready": n >= len(EXPERTS),
        # Backwards compatible initial-round fields.
        "median": first["median"],
        "range": first["range"],
        "average": first["average"],
        "iqr": first["iqr"],
        "mad": first["mad"],
        "agreement": agreement,
        "theme_counts": themes,
        "round_two_count": len(revisions),
        "round_two_median": second["median"] if second else None,
        "round_two_range": second["range"] if second else [],
        "round_two_iqr": second["iqr"] if second else None,
        "round_two_mad": second["mad"] if second else None,
        "round_two_unrevised_count": n - len(revisions) if second else None,
        "median_change_pp": round(second["median"] - first["median"], 2) if second else None,
        "round_two_method": "All initial panel members retained; unchanged forecasts carried forward" if second else None,
        "public_note": "Aggregate synthetic opinions only. Descriptive panel statistics, not representative estimates or ACAPS-endorsed forecasts.",
    }


def forecast_band(value: float | None) -> str | None:
    """Return a wide non-overlapping bin, never an exact small-panel median."""
    if value is None:
        return None
    lower = min(int(value) // 20 * 20, 80)
    upper = 100 if lower == 80 else lower + 19
    return f"{lower}–{upper}%"


def peer_view(group: dict) -> dict:
    """Fixed, coarse round-one feedback; no single-person breakdowns or evolving revision data.

    A five-person panel is not truly anonymous. This is demo-only data
    minimization, not a privacy or statistical-anonymity guarantee.
    """
    agreement = group["agreement"]
    categories = sum(count > 0 for count in agreement.values())
    return {
        "panel_size": group["count"],
        "forecast_median_band": forecast_band(group["median"]),
        "assessment_pattern": "Different views were expressed" if categories > 1 else "Similar views were expressed",
        "notice": "Synthetic grouped feedback, rounded to reduce disclosure. No individual estimates, notes, subgroup counts or partial revisions.",
    }


def safe_public_snapshot(group: dict) -> dict:
    """Freeze the moderator-selected full-panel view, never a subset of revisers.

    In this fixed synthetic Delphi consultation, if any expert has revised we use
    the complete current panel: revised probabilities replace those experts'
    first submissions, and all other original probabilities carry forward.
    Otherwise we publish the initial full panel. Public metadata identifies the
    view but intentionally omits the count/identity of revisers.
    """
    revised = group["round_two_median"] is not None
    current_median = group["round_two_median"] if revised else group["median"]
    return {
        "available": True,
        "risk_id": "R1043",
        "panel_size": group["count"],
        "forecast_round": "revised_panel" if revised else "initial_panel",
        "forecast_median_band": forecast_band(current_median),
        "approved_at": now(),
        "notice": (
            "Synthetic, moderator-approved Delphi panel view; unaltered forecasts "
            "carry forward when others revise. Rounded aggregate, not a calibrated "
            "prediction or official ACAPS assessment."
        ),
    }


@app.get("/")
def root():
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/styles.css")
def css():
    return FileResponse(ROOT / "static" / "styles.css", media_type="text/css")


@app.get("/app.js")
def js():
    return FileResponse(ROOT / "static" / "app.js", media_type="application/javascript")


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "synthetic demo"}


@app.get("/api/risks")
def risks():
    records, origin = get_risks()
    return {"count": len(records), "source": origin, "risks": [
        {"id": r.get("Risk ID"), "title": r.get("Risk Title"), "country": r.get("Country"),
         "level": r.get("Risk Level"), "status": r.get("Status"), "trend": r.get("Risk trend"),
         "probability_category": r.get("Probability"), "impact": r.get("Impact")}
        for r in records]}


@app.get("/api/risks/{risk_id}")
def selected_risk(risk_id: str):
    records,_ = get_risks()
    r = next((r for r in records if r.get("Risk ID") == risk_id), None)
    if r is None:
        raise HTTPException(404, "Risk not in available dataset")
    return risk_card(r)


@app.get("/api/risks/{risk_id}/severity")
def risk_severity(risk_id: str):
    """Public official-index metadata, only for manually matched crisis records.

    The index is not a probabilistic forecast or SIGNAL-computed severity.
    No AI imputation, country-level substitution, or implicit crisis matching.
    """
    records, _ = get_risks()
    record = next((r for r in records if r.get("Risk ID") == risk_id), None)
    if record is None:
        raise HTTPException(404, "Risk not in available dataset")
    return severity_for_risk(risk_id, str(record.get("Country", "")), SEVERITY_MANIFEST)


@app.get("/api/inform-severity/context")
def inform_severity_context(country: str = ""):
    """Public official country crisis context, never a crisis-to-Risk-Radar join."""
    return crises_for_country(country, INFORM_CONTEXT)


@app.get("/api/risks/{risk_id}/context")
def moderator_risk_context(risk_id: str, auth=Depends(require_moderator)):
    """Moderator-only working Risk Radar context (not public expert feedback)."""
    records, origin = get_risks()
    record = next((r for r in records if r.get("Risk ID") == risk_id), None)
    if record is None:
        raise HTTPException(404, "Risk not in available dataset")
    return build_risk_context(record, origin)


@app.get("/api/moderator/historical-evaluation")
def historical_evaluation(auth=Depends(require_moderator)):
    """Descriptive ACAPS historical outcomes; never infer numeric forecast calibration."""
    records, origin = get_risks()
    if not RISK_CSV.exists() or len(records) < 2 or origin.startswith("built-in"):
        return {
            "available": False,
            "reason": "Official historical Risk Radar CSV not loaded. Add data/risk-radar-export.csv to analyze real past outcomes.",
            "source": origin,
        }
    return summarize_historical_outcomes(records, origin)


@app.get("/api/consultation")
def consultation():
    records, origin = get_risks()
    r = next((r for r in records if r.get("Risk ID") == "R1043"), R1043)
    with db() as conn:
        n = conn.execute("SELECT COUNT(*) FROM submissions").fetchone()[0]
        released = config(conn, "feedback_released") == "true"
        published = config(conn, "public_approved") == "true"
    return {"risk": risk_card(r), "source": origin, "forecast": FORECAST_QUESTION,
            "responded": n, "panel_size": len(EXPERTS), "feedback_released": released,
            "public_approved": published, "synthetic": True}


@app.post("/api/login")
def login(body: Login):
    code = body.code.strip().upper()
    with db() as conn:
        if code == "ACAPS-DEMO":
            role, exp = "moderator", None
        else:
            row = conn.execute("SELECT id FROM experts WHERE invite_code=?", (code,)).fetchone()
            if not row:
                raise HTTPException(401, "Invalid demo invitation code")
            role, exp = "expert", row["id"]
        token = secrets.token_urlsafe(32)
        conn.execute("INSERT INTO sessions(token,role,expert_id,created_at) VALUES(?,?,?,?)", (token,role,exp,now()))
        return {"token": token, "role": role, "expert_id": exp, "synthetic": True}


@app.get("/api/me")
def me(auth=Depends(session)):
    with db() as conn:
        result = {**auth, "demo_mode": True}
        if auth["role"] == "expert":
            resp = conn.execute("SELECT agreement,probability,confidence,anonymity,created_at FROM submissions WHERE expert_id=?", (auth["expert_id"],)).fetchone()
            rev = conn.execute("SELECT probability,created_at FROM revisions WHERE expert_id=?", (auth["expert_id"],)).fetchone()
            result.update({"submission": dict(resp) if resp else None,
                           "revision": dict(rev) if rev else None,
                           "feedback_released": config(conn, "feedback_released") == "true"})
        return result


@app.post("/api/expert/submit")
def submit(body: Contribution, auth=Depends(require_expert)):
    with db() as conn:
        existing = conn.execute("SELECT 1 FROM submissions WHERE expert_id=?", (auth["expert_id"],)).fetchone()
        if existing:
            raise HTTPException(409, "Initial response already recorded. Use revision after feedback release.")
        if config(conn,"feedback_released") == "true":
            raise HTTPException(409, "First round is closed")
        conn.execute("INSERT INTO submissions(expert_id,agreement,probability,confidence,note,anonymity,created_at) VALUES(?,?,?,?,?,?,?)",
                     (auth["expert_id"],body.agreement,body.probability,body.confidence,body.note.strip(),body.anonymity,now()))
        return {"saved": True, "next": "Moderator releases anonymous results when the panel is complete"}


@app.get("/api/expert/feedback")
def feedback(auth=Depends(require_expert)):
    with db() as conn:
        submitted = conn.execute("SELECT 1 FROM submissions WHERE expert_id=?",(auth["expert_id"],)).fetchone()
        if not submitted:
            raise HTTPException(403, "Make your independent contribution before viewing feedback")
        if config(conn,"feedback_released") != "true":
            return {"available": False, "reason": "Feedback not yet released by the moderator"}
        group = compute_group(conn)
        if not group["ready"]:
            return {"available": False, "reason": "Insufficient panel size"}
        chosen = config(conn, "delphi_counterpoint")
        prompt = next((p for p in COUNTERPOINTS if p["id"] == chosen), None)
        # The public summary and unsubmitted experts never receive this prompt.
        return {
            "available": True,
            "group": peer_view(group),
            "counterpoint": {**prompt, "notice": COUNTERPOINT_NOTICE} if prompt else None,
        }


@app.post("/api/expert/revise")
def revise(body: Revision, auth=Depends(require_expert)):
    with db() as conn:
        if config(conn, "public_approved") == "true":
            raise HTTPException(409, "Forecast already approved and frozen; reset demo to start another consultation")
        if config(conn,"feedback_released") != "true" or not compute_group(conn)["ready"]:
            raise HTTPException(409, "Group feedback not yet available")
        if not conn.execute("SELECT 1 FROM submissions WHERE expert_id=?",(auth["expert_id"],)).fetchone():
            raise HTTPException(403, "Original contribution required")
        if conn.execute("SELECT 1 FROM revisions WHERE expert_id=?", (auth["expert_id"],)).fetchone():
            raise HTTPException(409, "One revision per expert in demo")
        conn.execute("INSERT INTO revisions(expert_id,probability,created_at) VALUES(?,?,?)",(auth["expert_id"],body.probability,now()))
        return {"saved": True}


@app.get("/api/moderator/dashboard")
def moderator_dashboard(auth=Depends(require_moderator)):
    with db() as conn:
        group=compute_group(conn)
        return {"group":group, "feedback_released":config(conn,"feedback_released")=="true",
                "public_approved":config(conn,"public_approved")=="true",
                "can_release":group["ready"] and config(conn,"feedback_released")!="true",
                "can_publish":group["ready"] and config(conn,"feedback_released")=="true" and config(conn,"public_approved")!="true",
                "warning":"Moderator sees aggregated synthetic data only; no individual identities or raw notes are exposed by this endpoint."}


@app.get("/api/moderator/synthesis")
def moderator_synthesis(auth=Depends(require_moderator)):
    """Moderator-only, non-generative question suggestion; no private note quotes."""
    with db() as conn:
        result = build_moderator_synthesis(
            compute_group(conn), config(conn, "feedback_released") == "true"
        )
        if result["available"]:
            stored = config(conn, "moderator_followup")
            result["approved"] = json.loads(stored) if stored else None
        return result


@app.post("/api/moderator/follow-up/approve")
def approve_followup(body: FollowupApproval, auth=Depends(require_moderator)):
    """Approve a fixed question for later human use; NEVER dispatch automatically."""
    with db() as conn:
        result = build_moderator_synthesis(
            compute_group(conn), config(conn, "feedback_released") == "true"
        )
        if not result["available"]:
            raise HTTPException(409, result["reason"])
        if config(conn, "moderator_followup"):
            raise HTTPException(409, "Follow-up already approved; reset demo to start again")
        proposed = result["proposed"]
        if body.question_id != proposed["id"]:
            raise HTTPException(400, "Only the current vetted suggestion can be approved")
        approved = {
            "id": proposed["id"],
            "topic": proposed["topic"],
            "question": proposed["question"],
            "approved_at": now(),
            "status": "Approved draft for possible manual follow-up; not sent",
        }
        set_config(conn, "moderator_followup", json.dumps(approved, sort_keys=True))
        return {"approved": True, "followup": approved, "sent": False}


@app.get("/api/moderator/counterpoint")
def moderator_counterpoint(auth=Depends(require_moderator)):
    """Return curated reflection prompts; no raw expert remarks are exposed."""
    with db() as conn:
        ready = compute_group(conn)["ready"] and config(conn, "feedback_released") == "true"
        chosen = config(conn, "delphi_counterpoint")
        return {
            "available": ready,
            "reason": None if ready else "Complete the panel and release feedback before approving a reflection prompt.",
            "options": list(COUNTERPOINTS),
            "approved_id": chosen or None,
            "notice": COUNTERPOINT_NOTICE,
        }


@app.post("/api/moderator/counterpoint/approve")
def approve_counterpoint(body: CounterpointApproval, auth=Depends(require_moderator)):
    """Publish one vetted editorial prompt to submitted experts, never to the public."""
    with db() as conn:
        if not compute_group(conn)["ready"] or config(conn, "feedback_released") != "true":
            raise HTTPException(409, "Complete the panel and release feedback first")
        if config(conn, "delphi_counterpoint"):
            raise HTTPException(409, "Reflection prompt already approved; reset demo to change it")
        selected = next((p for p in COUNTERPOINTS if p["id"] == body.prompt_id), None)
        if not selected:
            raise HTTPException(400, "Unrecognized reflection prompt")
        set_config(conn, "delphi_counterpoint", selected["id"])
        return {"approved": True, "prompt_id": selected["id"], "sent": False}


@app.post("/api/moderator/release")
def release(auth=Depends(require_moderator)):
    with db() as conn:
        if not compute_group(conn)["ready"]:
            raise HTTPException(409, "All 5 demo experts must respond before release")
        set_config(conn,"feedback_released","true")
        return {"released":True}


@app.post("/api/moderator/publish")
def publish(auth=Depends(require_moderator)):
    with db() as conn:
        group = compute_group(conn)
        if not group["ready"] or config(conn,"feedback_released")!="true":
            raise HTTPException(409,"Complete panel and release feedback before approving an aggregate")
        if config(conn, "public_approved") == "true":
            raise HTTPException(409, "Aggregate already approved; frozen publication cannot be recalculated")
        set_config(conn, "public_snapshot", json.dumps(safe_public_snapshot(group), sort_keys=True))
        set_config(conn,"public_approved","true")
        return {"approved":True, "message":"Frozen synthetic, privacy-limited aggregate approved; not an official ACAPS publication"}


@app.get("/api/public-summary")
def public_summary():
    with db() as conn:
        if config(conn,"public_approved")!="true" or not config(conn, "public_snapshot"):
            return {"available":False, "reason":"No moderator-approved aggregate available"}
        # Publication stays byte-identical even if a late Delphi revision follows.
        return json.loads(config(conn, "public_snapshot"))


@app.post("/api/demo/reset")
def reset(auth=Depends(require_moderator)):
    with db() as conn:
        conn.execute("DELETE FROM revisions")
        conn.execute("DELETE FROM submissions")
        conn.execute("DELETE FROM sessions")
        set_config(conn,"feedback_released","false")
        set_config(conn,"public_approved","false")
        set_config(conn,"public_snapshot","")
        set_config(conn,"moderator_followup","")
        set_config(conn,"delphi_counterpoint","")
        for e in SYNTHETIC_RESPONSES:
            conn.execute("INSERT INTO submissions(expert_id,agreement,probability,confidence,note,anonymity,created_at) VALUES(?,?,?,?,?,?,?)",(*e,now()))
    return {"reset":True,"message":"Synthetic demo restored to 4 of 5 responses. Login again."}


@app.post("/api/scoring/brier")
def brier_score(body: ScoreRequest):
    p=body.probability/100.0
    return {"probability":body.probability,"observed_outcome":body.outcome,
            "brier_score":round((p-body.outcome)**2,4),
            "interpretation":"Lower is better (0 = perfect, 1 = maximally wrong). Illustration only; not a measured expert track record."}


initialize()
