# S&R Evidence Intake — synthetic-only multi-source references and images

This updates Phase 12 with working **Paste a link** and **Upload a photo** input modes. The existing **email** and **note** flows, Delphi panel, evidence decisions, Spillovers, and public publication are unchanged.

## What each input actually does

- **Email / Note:** As before, save a user-reviewed, fictional, sanitized text observation, linked to an existing Risk Radar risk.
- **Link:** The user types an HTTPS reference. The backend validates the URL, removes query parameters and fragments, stores a canonical text reference, and **never fetches the page**. No web verification or extraction from the remote URL takes place. Any inferred place/event is based only on URL text, so the user must supply or correct the observation fields.
- **Photo:** The user chooses a **fictional, non-identifying** PNG or JPEG. The browser decodes it, resizes it to at most 960 px on its longest side and re-encodes it as PNG, removing original file metadata (including original GPS/EXIF). The server validates PNG structure, limits storage to 1 MiB, and stores the bytes in a **private SQLite BLOB** table linked to the evidence ID. The accompanying **typed caption** is the only material used for suggested fields; no OCR or AI image analysis occurs. Photos are visible in the moderator-only evidence inbox through a role-guarded image endpoint.

**Important:** Re-encoding removes file metadata but cannot remove **visible** identifying content, such as people, badges, names, license plates, signs or location information. The user must confirm synthetic, non-identifying material. The text redactor is heuristic, not a validated privacy filter. Do not upload real sensitive evidence, use actual identifying photos, or deploy this as a production evidence service.

## Demo

1. Sign in as a demo expert, open **Contribute → Add a source**.
2. Select **Paste a link** and use `https://example.org/synthetic-chad-displacement-report` (a fictional placeholder). Click **Extract & Review**, enter or verify a fictional observation and risk `R1043`, check the two confirmations, and save. See a generated `EV-` receipt.
3. Select **Upload a photo** and choose a synthetic image with no people or identifying content. Add a descriptive fictional caption (at least 10 characters), click **Extract & Review**, confirm fields, and save.
4. Sign in as moderator. In **Analyse → Moderator Workspace → New source evidence**, see both new records. Expand **Inspect private synthetic photo** to view the attachment, and review or request corroboration.
5. The Share report remains unchanged. Source-level URLs, captions, and photos are never published by this feature, and neither link nor photo automatically changes forecasts or spillover coefficients.

## Protected endpoints

Existing endpoints still work:
- `POST /api/evidence/preview`
- `POST /api/evidence/submit`
- `GET /api/evidence/mine`
- `GET /api/moderator/source-intake`
- `POST /api/moderator/source-intake/{id}/review`

New protected endpoints:
- `GET /api/evidence/{id}/photo` — expert can fetch only their own photo.
- `GET /api/moderator/source-intake/{id}/photo` — moderator-only private image response.

The PNG data is not included in list/receipt JSON and is not available from public endpoints. The existing `sr_source_intake` table is preserved; `sr_source_photo` is created with `CREATE TABLE IF NOT EXISTS`, without deleting or modifying existing data.

## Engineering safeguards / limitations

- HTTPS URL, public-looking DNS host, no userinfo or nonstandard ports; no HTTP fetching, redirects, external APIs, screenshots, or access to arbitrary URLs. Query strings and fragments are dropped; the retained path is displayed for manual confirmation.
- Browser photo selection accepts PNG/JPEG up to 8 MiB and re-encodes as PNG. The backend requires a metadata-free, valid 8-bit PNG <=1 MiB and <=1280 px per side, with checked PNG CRC and decompressed length. Rejects text and EXIF chunks. This is not a full image-content security scanner.
- All photo bytes remain in local SQLite, never git. Do **not** commit `.db`, `.sqlite`, local humanitarian datasets, raw photos, or credentials.
- Submission requires existing expert authorization plus synthetic/privacy confirmation. List/review/photo access requires an appropriate demo role. No automatic approval, independent corroboration, scenario modification, or public publication.
- Existing synthetic-demo reset does **not** clear evidence intake records or images. Use a disposable demo database if repeated resets are needed; never delete an existing database without consent and backup.

## Verification

Run from project root:

```bash
python -m unittest discover -s tests -q
cd frontend && bun run test && bun run build
cd .. && git diff --check
```

Then execute the link and photo browser journey, verify the image is private, and check the Share route still contains no source-level data.


## Phase 14 — Clarifications and evidence reflection

S&R now offers **Reflect on source evidence** (below Add a Source inside Contribute): an expert can view their own `EV-` evidence receipts and the latest analyst decision. When a moderator selects **Request corroboration**, a specific note is mandatory; the contributor can submit a fictional clarification.

- The original `sr_source_intake` row is never overwritten by clarifications. Its status returns to `pending_review`, its version increases, and the new note and prior analyst request are stored as an append-only `sr_source_followup` row.
- A moderator sees the clarification history in a private expandable panel and can choose another review decision. The API guards stale versions with HTTP 409 and enforces record ownership.
- Follow-ups are **fictional text only**; if the contributor needs to attach a new synthetic link or photo, create a separate evidence record with its own ID. There is no automatic risk-score, scenario, Delphi forecast, or public brief update.
- Existing source and photo records persist; migration uses `CREATE TABLE IF NOT EXISTS` and does not delete data. Do not reset the existing SQLite database.

### Demonstration

1. Contribute: sign in as a fictional expert and submit an `EV-` source (or use an existing one).
2. Analyse / Moderator Workspace: choose **Request corroboration** and type “Please clarify how this arrival count was estimated.”
3. Contribute (same expert): expand **Reflect on source evidence · My evidence**, click Refresh, and find that `EV-` record. Read the request, add a fictional follow-up, affirm privacy and submit.
4. Analyse / Moderator Workspace: Refresh, expand **Contributor follow-ups** for the record, compare it with the original, then accept for illustrative analysis or request further clarification.
5. Continue the existing five-expert Delphi Reflect → scenario simulation → approved public summary. Evidence follow-up does not automatically change the forecast.

### Protected endpoints

- `GET /api/evidence/{id}/followups` (owner expert only)
- `POST /api/evidence/{id}/followups` (owner expert only, `needs_more_evidence` status, version check)
- `GET /api/moderator/source-intake/{id}/followups` (moderator only)

Privacy note: The pattern matcher is not a comprehensive PII filter. Use only synthetic, pre-redacted material. Do not attach actual personal or sensitive data.
