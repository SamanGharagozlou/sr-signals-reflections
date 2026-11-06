# SIGNAL — Trusted Expert Ground Truth & Forecasting

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

## Before submission

- [ ] Confirm scope and event definition with an ACAPS representative.
- [ ] Add official cleaned CSV (139 risks).
- [ ] Get team agreement on roles, ownership, and submission repo.
- [ ] Test initial contribution → aggregate → moderator release → feedback → revision → approval.
- [ ] Record fallback screencast in case of Wi-Fi failure.
- [ ] Prepare **3-minute pitch** for challenge jury; general participant guide refers to **5 minutes**, so verify format.
- [ ] Keep this project separate from any other private commercial codebases.

## Source references

- Organizer repo: https://github.com/Hackathon-for-Good-The-Hague/HFG8-ACAPS-Ground-Truth
- Official brief: https://github.com/Hackathon-for-Good-The-Hague/HFG8-ACAPS-Ground-Truth/blob/main/docs/challenge-brief.md
- ACAPS evaluation: https://github.com/Hackathon-for-Good-The-Hague/HFG8-ACAPS-Ground-Truth/blob/main/docs/evaluation-criteria.md
- Dataset dictionary: https://github.com/Hackathon-for-Good-The-Hague/HFG8-ACAPS-Ground-Truth/blob/main/docs/data-dictionary.md

All application code in this folder is standalone, written for this example; **no existing private product code was reused**.
