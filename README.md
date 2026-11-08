# S&R — Signals & Reflections

**Trusted Expert Ground Truth & Anticipatory Forecasting**

<!-- SIGNAL_JURY_START -->
## For judges — S&R at a glance

**S&R (Signals & Reflections)** is a hackathon prototype for **ACAPS — Ground Truth for Anticipatory Action**. It connects regional risk exploration, structured six-month expert forecasts, transparent aggregation, and **human-controlled review and publication**.

**Demonstrated flow:** explore a synthetic Ukraine region scenario → inspect its knowledge graph → contribute to a separate synthetic Chad forecast panel → review the panel in a protected moderator workspace → release bounded group feedback → proceed to a **separate, approval-gated** public-intelligence step (final browser approval still to be verified).

| Verification evidence (7 Nov 2026, 20:59 CET) | Result |
|---|---:|
| Python backend unit tests | **120 passed** |
| React/frontend unit tests | **54 passed** across 12 test files |
| Total automated tests | **174 passed** |
| Release checks | **10/10 passed**, 0 failures, 0 warnings |
| Synthetic expert contributions in the demonstrated panel | **5/5** |

The test results are a dated snapshot; **rerun after the final feature merge**. They are *not* a code-coverage percentage, independent security certification, or evidence of real-world forecast accuracy.

**Stack:** Python / FastAPI · React / TypeScript · deterministic statistics and source checking · backend-enforced moderator authorization and publication approval.

**Transparency:** The Ukraine risk scores and regional relationships, Crisis Agenda rankings, and conversational expert-exchange examples are **synthetic**. Curated ACAPS publications are genuine source references, not an automatically refreshed feed. ReliefWeb live report discovery is **not active** because the API requires approved access. We do not claim a verified deployed LLM predicts crises, independently validated six-month forecast accuracy, or an external security audit.

**Reviewer guide:** [Architecture, tests, reproduction steps, data provenance and limitations](docs/JURY_TECHNICAL_VERIFICATION.md).

**Suggested live demo order:** `Ukraine Zoom` → `Expert Contribution` → `Moderator Review` → `Share / Approved Intelligence`. A local running backend and frontend are required; these route names are not public hosted URLs.
<!-- SIGNAL_JURY_END -->


**Working, local-first demo** for **Hackathon for Good #8 — ACAPS Ground Truth**, November 6–8, 2026.

> ⚠️ **Synthetic data only**. This is a hackathon prototype with publicly documented demo invitation codes and simplified access controls. It is **NOT** secure enough for real humanitarian experts, real testimony, production personal data, sensitive field information, or deployment to a public website.

## Quick start: VS Code / terminal (Mac, Windows, Linux)

```bash
cd SIGNAL_ACAPS_Prototype
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8765
```

Open **http://127.0.0.1:8765** (Swagger docs: **http://127.0.0.1:8765/docs**).

**No Node.js, Lovable, cloud account, API key, or LLM are required.**

## Phase 2A: statistically valid panel comparisons

The moderator's **round-two median** now describes the entire original panel:
experts who revise use their updated estimate; experts who do not revise keep
(their previously recorded) initial estimate. It is **not** the median of the
subset who happened to revise. The API also reports IQR (inclusive quartiles),
median absolute deviation (MAD), and the change in panel median in percentage
points, without making inferential claims about the population.

When fewer than all five experts have revised, the peer-facing API suppresses
second-round numerical details to avoid revealing early individual revisions.
This patch does **not** implement production anonymity: small-panel privacy,
role policies, output snapshots, and deployment security need further work.

Run statistical and workflow tests:

```bash
python3 -m unittest discover -s tests -v
```

## Phase 2B: privacy-limited access and publication

- Demo bearer sessions expire after **8 hours**; sessions remain local-only and use publicly known synthetic login codes. This is **not secure authentication** and must never be used with real contributors.
- Expert-facing Delphi feedback now returns only a **coarse 20-point-wide median probability band**, participation size, and a broad agreement message. It never returns exact forecasts, counts by opinion, raw comments, themes, or incremental round-two statistics. Small panels still carry re-identification risks.
- A moderator gets the original detailed group statistics (still no individually linked notes or names through the dashboard endpoint).
- After approval, the public API serves a **frozen, minimal snapshot**. Late revisions cannot silently change a previously approved publication. The snapshot is cleared on demo reset.
- API responses are flagged `Cache-Control: no-store`. A prior demo database approved without a snapshot fails closed until a new approval.
- **Known limitation:** the selected anonymity preference is stored but not sufficient for production-grade privacy. A real deployment needs independent security design, protected invitations, key rotation, consent, retention policies, and professional threat modeling.

Run `python -m unittest discover -s tests -v` after installing dependencies. Keep the server bound to `127.0.0.1`; **do not expose this prototype to the public Internet**.

## Exact live demo sequence

1. Open app. Read official ACAPS risk **R1043** (Chad, high risk, active).
2. Click **Moderator view** and sign in using `ACAPS-DEMO`. Notice the **4 / 5** synthetic initial responses.
3. Switch to **Expert view**, sign in using `FIELD-05`. Choose anonymity, disagreement, a **numeric probability**, confidence, and a short missing factor. Submit.
4. Switch to **Moderator view**, sign in again as `ACAPS-DEMO`. See 5 / 5, agreement/disagreement, probability spread and qualitative theme counts.
5. Click **Release anonymous feedback**. As the expert, view the group summary and optionally send **one second-round probability**.
6. Moderator reviews updated aggregate and clicks **Approve safe aggregate**. Use **Public summary** to show a minimal published view.
7. Use **Reset demo** (moderator action) to return to the original 4/5 state. This invalidates old demo sessions.

Other synthetic invitation codes: `FIELD-01`, `FIELD-02`, `FIELD-03`, `FIELD-04` (already seeded). **Do not use these codes or this auth scheme in production.**

## Official data — 139 records

The demo runs immediately with a faithful single-record fallback for **R1043**.

For the complete organizer dataset, copy the official **`risk-radar-export.csv`** into `data/` and restart. The app reads all 139 risks (57 country entries) and shows them in **Risk library**; the consultation itself remains fixed on R1043 for demo reliability.

Source: https://github.com/Hackathon-for-Good-The-Hague/HFG8-ACAPS-Ground-Truth

## API surface

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Status |
| GET | `/api/risks` | Dataset catalog; full 139 if official CSV is copied |
| GET | `/api/risks/R1043` | Verified risk fields |
| GET | `/api/consultation` | Demo consultation and progress |
| POST | `/api/login` | Demo invitation code → session |
| GET | `/api/me` | Current demo role and own submission |
| POST | `/api/expert/submit` | Independent initial contribution |
| GET | `/api/expert/feedback` | Privacy-gated, released aggregate |
| POST | `/api/expert/revise` | One optional second-round probability |
| GET | `/api/moderator/dashboard` | Authorized aggregate review |
| POST | `/api/moderator/release` | Release group feedback after 5 responses |
| POST | `/api/moderator/publish` | Approve minimal public group summary |
| GET | `/api/public-summary` | Only moderator-approved, grouped information |
| POST | `/api/scoring/brier` | Brier score illustration |
| POST | `/api/demo/reset` | Restore synthetic seed, moderator only |

See `/docs` for request schemas. Demo sessions use the `Authorization: Bearer <token>` header. The frontend handles this automatically.

## How to use Lovable credits safely

**Start with this working project in VS Code.** Lovable is an optional **UI builder**, not required to run this server.

If the team wants to polish UI using Lovable:

1. Create a **separate new Lovable project** using the interface-only prompt in `LOVABLE_PROMPT.md`.
2. Link the Lovable-created frontend to a dedicated team GitHub repo if desired.
3. Run this Python backend in VS Code. Since Lovable runs separately, local `127.0.0.1` will not be reachable by its hosted preview; you would need an accessible backend deployment and carefully restricted CORS, or transfer the frontend files into the same Python-served directory.
4. **Never place secrets, API keys, expert identities, or private humanitarian reports in Lovable prompts, frontend source, or a public repo.**

The simplest hackathon path is to use **the provided working frontend for the initial demo** and polish its `static/` files in VS Code. Only spend Lovable credits if the team has time and a clear integration owner.

## Privacy/safety boundaries

- Preseeded contributions and expert personas are fictional; the official risk record is source data, not a real expert contribution.
- First-round responses are collected independently; no one sees group feedback until a moderator releases it and 5/5 demo experts have contributed.
- Expert reports are shown only through aggregate counts and deterministic themes; no raw sensitive notes are published.
- No LLM, personal data, claims of verified crisis predictions, or automatic changes to ACAPS risk assessments.
- **This is not production-grade anonymity**. Real deployment needs threat modeling, safer authentication, data minimization, audited role access, retention controls, small-panel inference protections, consent, and ACAPS review.
- The historical Risk Radar shows outcomes for past risks; our example Brier scoring is **illustrative**, not claimed validation against real experts.

## Source references

- Organizer repo: https://github.com/Hackathon-for-Good-The-Hague/HFG8-ACAPS-Ground-Truth
- Official brief: https://github.com/Hackathon-for-Good-The-Hague/HFG8-ACAPS-Ground-Truth/blob/main/docs/challenge-brief.md
- ACAPS evaluation: https://github.com/Hackathon-for-Good-The-Hague/HFG8-ACAPS-Ground-Truth/blob/main/docs/evaluation-criteria.md
- Dataset dictionary: https://github.com/Hackathon-for-Good-The-Hague/HFG8-ACAPS-Ground-Truth/blob/main/docs/data-dictionary.md

All application code in this folder is standalone, written for this example; **no existing private product code was reused**.

## Phase 3D: methodology-aware moderator risk context

The moderator-only `GET /api/risks/{risk_id}/context` endpoint returns the
original Risk Radar fields in a structured briefing: original probability and
impact categories, hazard triggers, source links already present in the export,
expected exposure and priority needs, and **explicitly marked missing fields**.
The extraction is deterministic. It never downloads URLs or invents claims.

`acaps_methodology.py` implements the probability-category boundaries from
**ACAPS' May 2019 methodology (p. 11)** solely as historical interpretive
context: 0-9 Very low, 10-33 Low, 34-66 Moderate, 67-90 High, 91-100 Very high.
It does not recompute ACAPS' overall risk level or turn qualitative Risk Radar
ratings into expert forecasts. Confirm any current methodology changes with ACAPS.

`risk_context.py` parses `Trigger ID` / `Title` / `Description` sections from
organizer data, retains supported source URLs and marks missing material. Use
**the cleaned organizer CSV** for correct encoding rather than the raw XLSX.
The new endpoint uses the current **demo moderator token** and must **not** be
exposed to a public website with these synthetic login credentials.

Tests: `python -m unittest discover -s tests -v`.


## Phase 4A — historical outcomes (moderator-only)

The integrated frontend now shows a historical ACAPS outcomes panel after a moderator
logs in. `GET /api/moderator/historical-evaluation` reads the organizer's **cleaned**
`data/risk-radar-export.csv` using the existing loader, groups selected records
by the original *overall risk level*, and counts materialised / not materialised /
active / unknown outcomes. The UI suppresses percentage bars for groups with
fewer than 10 resolved records. If the CSV is absent, the endpoint returns
`available: false` rather than fabricated statistics.

This is **not a reliability chart, Brier-calibrated forecast, or proof of prediction
skill**. The original qualitative risk level combines probability *and* impact;
older risks may have different monitoring horizons. The selected Risk Radar
records also omit potential risks never entered in the radar.

`historical_evaluation.py` contains a versioned, descriptive risk-matrix lookup
(from the official 2026 challenge repository's `docs/risk-methodology.md`) and
a Brier score helper that only accepts explicit numerical probability / resolved
binary-outcome pairs. Neither helper overwrites an original ACAPS risk rating,
and the Risk Radar export is never converted to made-up percentage forecasts.

Run `python -m unittest discover -s tests -q` before merging.

## Phase 4B — Moderator-reviewed verification question (synthetic demo)

SIGNAL adds a bounded **moderator-only** decision-support endpoint:

- `GET /api/moderator/synthesis` — after all five fictional experts contribute and feedback is released, describes whether views differ and nominates **one** curated follow-up question based on recurring keyword themes in fictional notes. Single mentions do not nominate a theme. It does not expose raw notes, identities, exact individual forecasts, or evidence quotations.
- `POST /api/moderator/follow-up/approve` with `{ "question_id": "..." }` — a moderator may approve **only the current proposed question**. Approval is stored in the synthetic SQLite database, is one-time per reset, and **does not notify experts**, alter the ACAPS risk rating, or publish the question. This is a proposed manual follow-up only.
- Resetting the demo clears the approval. The existing public snapshot remains unrelated and never incorporates this moderator-only question.

This is a deterministic, prewritten question library, **not AI evidence generation or verified humanitarian reporting**. Keyword matches are unverified and are not citations. Never use this hackathon demo with real field reports or personal data.
