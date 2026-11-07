"""S&R synthetic-only source intake: text, URL references, and sanitized PNG attachments.

No external links are fetched; photographs are private and not interpreted.
Submitted claims never automatically alter forecasts, scenarios, or public reports.
Not suitable for real personal data or production field evidence.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import ipaddress
import re
import struct
import zlib
from datetime import datetime, timezone
from typing import Callable, Literal
from urllib.parse import urlsplit, urlunsplit

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

MAX_SOURCE = 2200
MAX_PHOTO_BYTES = 1024 * 1024
MAX_PHOTO_PIXELS = 1280 * 1280
PREVIEW_NOTICE = (
    "Heuristic extraction from supplied text only. Links are not fetched and images "
    "are not interpreted. Review all fields; submitted claims are not verified facts."
)
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def safe_demo_text(value: str) -> str:
    """Best-effort redaction; not a verified PII filter. Use fictional material only."""
    val = value.strip()
    val = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[removed]", val)
    val = re.sub(r"(?<!\w)(?:\+\d[\d\s().-]{8,}\d|\b\d{3}[-. ]\d{3}[-. ]\d{4}\b)", "[removed]", val)
    val = re.sub(r"(?im)^\s*(?:from|call me on|tel|phone|email|contact)\s*:\s*[^\n]*$", "[redacted contact line]", val)
    return val[:MAX_SOURCE]


def sanitized_reference(raw: str) -> str:
    """Store a plain HTTPS reference with credentials, query and fragments excluded.

    The URL is NEVER visited by the server. No claim that the URL is trustworthy.
    """
    value = raw.strip()
    try:
        parts = urlsplit(value)
        port = parts.port
    except ValueError as exc:
        raise HTTPException(400, "Invalid source URL") from exc
    host = (parts.hostname or "").lower().rstrip(".")
    if parts.scheme.lower() != "https" or not host or parts.username or parts.password:
        raise HTTPException(400, "Use an HTTPS URL with no username or password")
    if port not in (None, 443) or len(host) > 253 or not re.fullmatch(r"[a-z0-9.-]+", host):
        raise HTTPException(400, "Unsupported source URL host or port")
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal")) or "." not in host:
        raise HTTPException(400, "Use a public-looking HTTPS reference, not a local address")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise HTTPException(400, "IP addresses are not supported as source references")
    if any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise HTTPException(400, "Source URL contains invalid characters")
    reference = urlunsplit(("https", host, parts.path or "/", "", ""))
    if len(reference) > MAX_SOURCE or "@" in reference:
        raise HTTPException(400, "Source URL is too long or contains identifiers")
    return reference


def canonical_text(source_type: str, raw: str) -> str:
    return sanitized_reference(raw) if source_type == "link" else safe_demo_text(raw)


def extract_fields(text: str) -> dict:
    clean = safe_demo_text(text)
    lower = clean.lower()
    count = re.search(
        r"\b(?:about|approximately|around|roughly)?\s*(\d{1,3}(?:,\d{3})+|\d{2,6})\s+"
        r"(?:new\s+)?(?:arrivals|people|individuals|displaced|refugees)\b", lower
    )
    reported_count = int(count.group(1).replace(",", "")) if count else None
    place = next((p for p in ("Iriba", "Adré", "Ouaddaï", "Abéché", "Chad") if p.lower() in lower), "")
    explicit_day = re.search(r"\b20\d{2}-\d{2}-\d{2}\b", clean)
    date_text = explicit_day.group(0) if explicit_day else next(
        (d for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday") if d.lower() in lower), ""
    )
    event = "Reported population movement" if any(w in lower for w in ("arrival", "displac", "refugee")) else "Reported field observation"
    suggested_risk = "R1043" if any(w in lower for w in ("iriba", "adré", "chad", "sudan", "arrival", "displac")) else None
    return {
        "sanitized_preview": clean, "reported_count": reported_count, "reported_place": place,
        "reported_date": date_text, "event": event, "suggested_risk_id": suggested_risk,
        "notice": PREVIEW_NOTICE, "redaction_automatically_verified": False,
    }


def decode_synthetic_png(encoded: str) -> tuple[bytes, str]:
    """Check a small, metadata-free 8-bit PNG produced by an in-browser canvas.

    Reject EXIF/text chunks and invalid PNG structures. Browser rendering or
    additional server-side image processing is NOT performed at intake.
    """
    if len(encoded) > (MAX_PHOTO_BYTES * 4 // 3) + 32:
        raise HTTPException(413, "Photo exceeds the 1 MiB maximum")
    try:
        blob = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(400, "Photo data is not valid base64") from exc
    if not blob.startswith(PNG_SIGNATURE):
        raise HTTPException(400, "Use a PNG image generated from the browser's photo preview")
    if len(blob) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Photo exceeds the 1 MiB maximum")
    pos = len(PNG_SIGNATURE)
    chunk_count = 0
    idat = bytearray()
    width = height = 0
    seen_header = seen_end = False
    allowed = {b"IHDR", b"IDAT", b"IEND", b"sRGB", b"gAMA", b"pHYs", b"cHRM"}
    while pos < len(blob):
        if pos + 12 > len(blob):
            raise HTTPException(400, "Incomplete PNG")
        length = struct.unpack(">I", blob[pos:pos+4])[0]
        kind = blob[pos+4:pos+8]
        pos += 8
        if length > MAX_PHOTO_BYTES or pos + length + 4 > len(blob) or kind not in allowed:
            raise HTTPException(400, "PNG is invalid or contains unsupported metadata")
        data = blob[pos:pos+length]
        crc = struct.unpack(">I", blob[pos+length:pos+length+4])[0]
        if zlib.crc32(kind + data) & 0xffffffff != crc:
            raise HTTPException(400, "PNG integrity check failed")
        pos += length + 4
        chunk_count += 1
        if kind == b"IHDR":
            if seen_header or chunk_count != 1 or length != 13:
                raise HTTPException(400, "Invalid PNG header")
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", data)
            if not (1 <= width <= 1280 and 1 <= height <= 1280 and width*height <= MAX_PHOTO_PIXELS):
                raise HTTPException(400, "Image dimensions exceed the synthetic demo limit")
            if (depth, color, compression, filtering, interlace) not in {
                (8, 2, 0, 0, 0), (8, 6, 0, 0, 0), (8, 0, 0, 0, 0), (8, 4, 0, 0, 0)
            }:
                raise HTTPException(400, "Unsupported PNG encoding")
            seen_header = True
        elif kind == b"IDAT":
            if not seen_header or seen_end:
                raise HTTPException(400, "Invalid PNG image data")
            idat.extend(data)
        elif kind == b"IEND":
            if length != 0 or not idat or pos != len(blob):
                raise HTTPException(400, "Invalid PNG ending")
            seen_end = True
        elif not seen_header or seen_end:
            raise HTTPException(400, "Invalid PNG chunk ordering")
    if not (seen_header and seen_end):
        raise HTTPException(400, "Incomplete PNG image")
    # Validate decompression size; no unbounded decoding of compressed input.
    color_channels = {0: 1, 2: 3, 4: 2, 6: 4}[color]
    row_length = width * color_channels + 1
    maximum = row_length * height
    try:
        decompressor = zlib.decompressobj()
        decoded = decompressor.decompress(bytes(idat), maximum + 1)
        if len(decoded) != maximum or not decompressor.eof or decompressor.unused_data:
            raise ValueError("PNG pixel data length mismatch")
    except (zlib.error, ValueError) as exc:
        raise HTTPException(400, "PNG pixel data is invalid") from exc
    return blob, hashlib.sha256(blob).hexdigest()


class PreviewInput(BaseModel):
    source_type: Literal["email", "note", "link", "photo"]
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
    photo_png_base64: str | None = Field(default=None, max_length=(MAX_PHOTO_BYTES*4//3)+32)


class ReviewInput(BaseModel):
    decision: Literal["accepted_for_analysis", "needs_more_evidence", "rejected"]
    note: str = Field(default="", max_length=500)
    expected_version: int = Field(ge=0)


class FollowupInput(BaseModel):
    """Append-only, fictional clarification. Never overwrite the original claim."""
    message: str = Field(min_length=15, max_length=1200)
    expected_version: int = Field(ge=0)
    confirmed_synthetic: Literal[True]
    confirmed_no_pii: Literal[True]


def followup_view(row) -> dict:
    x = dict(row)
    x["evidence_id"] = f"EV-{x['source_id']:04d}"
    # An immutable follow-up has its own row id; it is not a revised forecast.
    return x


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
    CREATE TABLE IF NOT EXISTS sr_source_photo (
        source_id INTEGER PRIMARY KEY REFERENCES sr_source_intake(id) ON DELETE CASCADE,
        png_data BLOB NOT NULL,
        sha256 TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sr_source_followup (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL REFERENCES sr_source_intake(id),
        expert_id TEXT NOT NULL,
        redacted_message TEXT NOT NULL,
        request_note TEXT NOT NULL,
        previous_version INTEGER NOT NULL,
        created_at TEXT NOT NULL
    );
    """)


def to_view(row) -> dict:
    x = dict(row)
    x["id"] = f"EV-{x['id']:04d}"
    x["redaction_confirmed"] = bool(x["redaction_confirmed"])
    x["has_photo"] = x["source_type"] == "photo"
    # PNG bytes are intentionally excluded from list and public endpoints.
    return x


def create_router(db: Callable, require_expert: Callable, require_moderator: Callable, get_risks: Callable):
    router = APIRouter()

    @router.post("/api/evidence/preview")
    def preview(body: PreviewInput, auth=Depends(require_expert)):
        clean = canonical_text(body.source_type, body.source_text)
        result = extract_fields(clean)
        result["sanitized_preview"] = clean
        if body.source_type == "link":
            result["notice"] = "URL reference only. No site fetched, downloaded or verified. Query and fragment were removed."
        if body.source_type == "photo":
            result["notice"] = "Extraction is from your typed caption only, not from image recognition. Synthetic PNG must be attached at save."
        return result

    @router.post("/api/evidence/submit")
    def submit(body: SubmitInput, auth=Depends(require_expert)):
        if body.risk_id not in {r.get("Risk ID") for r in get_risks()[0]}:
            raise HTTPException(400, "Choose a risk from the available Risk Radar inventory")
        clean = canonical_text(body.source_type, body.source_text)
        if not clean or "@" in clean:
            raise HTTPException(400, "Remove personal identifiers before submitting")
        photo = digest = None
        if body.source_type == "photo":
            if not body.photo_png_base64:
                raise HTTPException(400, "Please attach a synthetic PNG photo")
            photo, digest = decode_synthetic_png(body.photo_png_base64)
        elif body.photo_png_base64 is not None:
            raise HTTPException(400, "Photo attachment is only allowed with photo source type")
        with db() as conn:
            install_tables(conn)
            cursor = conn.execute("""INSERT INTO sr_source_intake (
                expert_id,source_type,redacted_text,risk_id,reported_place,reported_date,reported_count,
                event,source_category,proximity,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (auth["expert_id"],body.source_type,clean,body.risk_id,body.reported_place.strip(),body.reported_date.strip(),
                 body.reported_count,body.event.strip(),body.source_category,body.proximity,timestamp()))
            source_id = cursor.lastrowid
            if photo is not None:
                conn.execute("INSERT INTO sr_source_photo(source_id,png_data,sha256,created_at) VALUES(?,?,?,?)",
                             (source_id,photo,digest,timestamp()))
            conn.execute("INSERT INTO sr_source_audit(source_id,action,actor,occurred_at) VALUES(?,?,?,?)",
                         (source_id,"submitted",auth["expert_id"],timestamp()))
            row = conn.execute("SELECT * FROM sr_source_intake WHERE id=?",(source_id,)).fetchone()
            return {"item":to_view(row),"notice":"Saved for analyst review; not independently verified or automatically fed into models."}

    @router.get("/api/evidence/mine")
    def mine(auth=Depends(require_expert)):
        with db() as conn:
            install_tables(conn)
            rows = conn.execute("SELECT * FROM sr_source_intake WHERE expert_id=? ORDER BY id DESC LIMIT 25",(auth["expert_id"],)).fetchall()
            return {"items":[to_view(r) for r in rows]}

    def get_photo(evidence_id: int, expert_id: str | None = None):
        if evidence_id <= 0:
            raise HTTPException(404, "Unknown evidence")
        with db() as conn:
            install_tables(conn)
            if expert_id is not None:
                row = conn.execute("SELECT id FROM sr_source_intake WHERE id=? AND expert_id=?",(evidence_id, expert_id)).fetchone()
            else:
                row = conn.execute("SELECT id FROM sr_source_intake WHERE id=?",(evidence_id,)).fetchone()
            if row is None:
                raise HTTPException(404, "Unknown evidence")
            photo = conn.execute("SELECT png_data FROM sr_source_photo WHERE source_id=?",(evidence_id,)).fetchone()
            if photo is None:
                raise HTTPException(404, "No photo attachment for this evidence")
            return Response(content=photo["png_data"],media_type="image/png",headers={
                "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff",
                "Content-Security-Policy":"default-src 'none'", "Content-Disposition":"inline",
            })

    @router.get("/api/evidence/{evidence_id}/photo")
    def expert_photo(evidence_id: int, auth=Depends(require_expert)):
        return get_photo(evidence_id, auth["expert_id"])

    @router.get("/api/moderator/source-intake/{evidence_id}/photo")
    def moderator_photo(evidence_id: int, auth=Depends(require_moderator)):
        return get_photo(evidence_id)

    @router.get("/api/evidence/{evidence_id}/followups")
    def own_followups(evidence_id: int, auth=Depends(require_expert)):
        """Owner-only clarification history. Moderator correspondence is not public."""
        if evidence_id <= 0:
            raise HTTPException(404, "Unknown evidence")
        with db() as conn:
            install_tables(conn)
            row = conn.execute("SELECT id FROM sr_source_intake WHERE id=? AND expert_id=?",
                               (evidence_id,auth["expert_id"])).fetchone()
            if row is None:
                raise HTTPException(404, "Unknown evidence")
            history = conn.execute("SELECT * FROM sr_source_followup WHERE source_id=? ORDER BY id ASC",
                                   (evidence_id,)).fetchall()
            return {"items": [followup_view(x) for x in history]}

    @router.post("/api/evidence/{evidence_id}/followups")
    def add_followup(evidence_id: int, body: FollowupInput, auth=Depends(require_expert)):
        """Submit clarification only after a moderator explicitly requests it.

        Preserve the original evidence as written and bump its version to ensure
        any reviewer holding an old snapshot must refresh before deciding.
        """
        if evidence_id <= 0:
            raise HTTPException(404, "Unknown evidence")
        cleaned = safe_demo_text(body.message)
        if len(cleaned) < 15 or "@" in cleaned:
            raise HTTPException(400, "Use a fictional clarification without personal identifiers")
        with db() as conn:
            install_tables(conn)
            row = conn.execute("SELECT * FROM sr_source_intake WHERE id=? AND expert_id=?",
                               (evidence_id,auth["expert_id"])).fetchone()
            if row is None:
                raise HTTPException(404, "Unknown evidence")
            if row["version"] != body.expected_version:
                raise HTTPException(409, "Evidence changed. Refresh before submitting a follow-up")
            if row["status"] != "needs_more_evidence":
                raise HTTPException(409, "Follow-up requires an analyst corroboration request")
            now = timestamp()
            cur = conn.execute("UPDATE sr_source_intake SET status='pending_review', reviewed_at=NULL, version=version+1 "
                               "WHERE id=? AND expert_id=? AND version=? AND status='needs_more_evidence'",
                               (evidence_id,auth["expert_id"],body.expected_version))
            if cur.rowcount != 1:
                raise HTTPException(409, "Evidence changed. Refresh before submitting a follow-up")
            conn.execute("INSERT INTO sr_source_followup "
                         "(source_id,expert_id,redacted_message,request_note,previous_version,created_at) "
                         "VALUES(?,?,?,?,?,?)",
                         (evidence_id,auth["expert_id"],cleaned,row["reviewer_note"],body.expected_version,now))
            conn.execute("INSERT INTO sr_source_audit(source_id,action,actor,occurred_at) VALUES(?,?,?,?)",
                         (evidence_id,"followup_submitted",auth["expert_id"],now))
            updated = conn.execute("SELECT * FROM sr_source_intake WHERE id=?",(evidence_id,)).fetchone()
            return {"item":to_view(updated), "notice":"Clarification queued for human re-review. Original source is unchanged."}

    @router.get("/api/moderator/source-intake/{evidence_id}/followups")
    def moderator_followups(evidence_id: int, auth=Depends(require_moderator)):
        if evidence_id <= 0:
            raise HTTPException(404, "Unknown evidence")
        with db() as conn:
            install_tables(conn)
            if conn.execute("SELECT 1 FROM sr_source_intake WHERE id=?",(evidence_id,)).fetchone() is None:
                raise HTTPException(404, "Unknown evidence")
            history = conn.execute("SELECT * FROM sr_source_followup WHERE source_id=? ORDER BY id ASC",
                                   (evidence_id,)).fetchall()
            return {"items": [followup_view(x) for x in history]}

    @router.get("/api/moderator/source-intake")
    def moderator_list(auth=Depends(require_moderator)):
        with db() as conn:
            install_tables(conn)
            rows = conn.execute("SELECT * FROM sr_source_intake ORDER BY CASE WHEN status='pending_review' THEN 0 ELSE 1 END, id DESC LIMIT 80").fetchall()
            return {"items":[to_view(r) for r in rows],"notice":"Private synthetic evidence queue; acceptance is not independent corroboration."}

    @router.post("/api/moderator/source-intake/{evidence_id}/review")
    def review(evidence_id: int, body: ReviewInput, auth=Depends(require_moderator)):
        if evidence_id <= 0:
            raise HTTPException(404, "Unknown evidence")
        note = safe_demo_text(body.note)
        if body.decision == "needs_more_evidence" and len(note.strip()) < 10:
            raise HTTPException(400, "Explain what the contributor needs to clarify")
        with db() as conn:
            install_tables(conn)
            row = conn.execute("SELECT * FROM sr_source_intake WHERE id=?",(evidence_id,)).fetchone()
            if row is None:
                raise HTTPException(404, "Unknown evidence")
            if row["version"] != body.expected_version:
                raise HTTPException(409, "Evidence changed. Refresh and review again")
            if row["status"] != "pending_review":
                raise HTTPException(409, "This evidence has already received a decision")
            conn.execute("UPDATE sr_source_intake SET status=?,reviewer_note=?,reviewed_at=?,version=version+1 WHERE id=?",
                         (body.decision,note,timestamp(),evidence_id))
            conn.execute("INSERT INTO sr_source_audit(source_id,action,actor,occurred_at) VALUES(?,?,?,?)",
                         (evidence_id,body.decision,"moderator",timestamp()))
            new=conn.execute("SELECT * FROM sr_source_intake WHERE id=?",(evidence_id,)).fetchone()
            return {"item":to_view(new),"notice":"Decision recorded. No automatic forecast or public release."}

    return router
