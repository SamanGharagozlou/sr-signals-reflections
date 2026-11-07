# SIGNAL — 3-minute demo runbook and backup

## Before the jury arrives

1. `git switch main && git pull --ff-only origin main`; only do this well before the presentation and if the working tree is safe. Confirm Phase 8 forecast integrity tests and Phase 10C Situation Room are present.
2. Open two terminals from the repository root: `source .venv/bin/activate && python -m uvicorn app:app --reload --host 127.0.0.1 --port 8765`; in another: `cd frontend && bun run dev`.
3. Verify `http://127.0.0.1:8765/api/health` returns `status: ok` and the frontend's printed Local URL opens.
4. Confirm optional local dataset files only if you intend to demonstrate full catalogue/severity context: `data/risk-radar-export.csv`, `data/inform-severity-2026-09-crises.json`. These are **not** bundled with the GitHub source.
5. Prepare the *synthetic* demo in advance. If resetting, do it **before** the rehearsal because reset clears submissions/revisions/sessions and returns the panel to 4/5. Restore your desired approved state using the actual workflow. Do not reset onstage.
6. Prepare tabs in this order: `/explore` → `/expert` → `/moderator` → `/situation-room` → `/public` (or keep at most three tabs if navigating quickly). Use separate browser profiles if different sessions collide.
7. Ensure the approved panel band is visible in the public view. In `/situation-room`, check that switching to Analyst requires moderator login; switching to Public does not display private data.
8. Take a screenshot of each key state and record a **90-second backup video** (QuickTime or macOS screen recording); store locally. Don't record unrelated account information.

## Recommended demo: pre-approved state, reliable live navigation

| Clock | Screen | One thing to show |
| --- | --- | --- |
| 0:00–0:25 | `/explore` | Select Chad / R1043 from official Risk Radar context |
| 0:25–0:55 | `/expert` | Concise independent forecast flow; explain it is synthetic |
| 0:55–1:35 | `/moderator` | Panel distribution and revision controls; distinguish round one/final panel |
| 1:35–2:15 | `/moderator` | Evidence review + human approval; no auto-publication |
| 2:15–2:45 | `/situation-room` Public | Frozen band, separated source information, no individual expert values |
| 2:45–3:00 | Final screen | Benefit and pilot-ready roadmap, no unsupported production claims |

**Do not attempt a full five-expert interactive submission live** unless it is rehearsed and comfortably fits. The prepared workflow is a more reliable demonstration, and the tests show the underlying logic.

## Optional live interaction (extra time / judge request)

- Moderator `/api/demo/reset` returns synthetic state to 4/5 and **invalidates sessions**; only use intentionally.
- Expert `FIELD-05` submits the fifth independent estimate.
- Moderator (`ACAPS-DEMO`) releases feedback; expert revises; moderator approves a frozen public view.
- The public forecast should identify initial vs revised panel appropriately, but not identify revisers or expose raw notes.

## Failure plan

- **Frontend blank?** Check `bun run dev` terminal, open the printed Local URL, reload once.
- **No data?** Check FastAPI health and `data/risk-radar-export.csv`. One-record R1043 fallback is expected without the full CSV.
- **Severity empty?** Not a crash. It can be unavailable when the crisis context data is absent or unmatched.
- **Permission denied in Analyst?** Expected until moderator role is signed in. Do not bypass authorization to fix the demo.
- **Public forecast unavailable?** It is intentionally hidden until publication approval. Use a previously rehearsed database or show the captured approved screen; do not claim it published if it did not.
- **Network failure?** Local FastAPI + Vite should still serve the synthetic demo, provided dependencies are already installed. Use the backup video if needed.
- **A public-dataset license question?** Explain source and attribution, and that you have excluded local source copies from GitHub pending sharing review.

## Freeze the demo state

Never run reset or destructive database cleanup right before the presentation. If you need a backup of the local demo database, stop FastAPI first and copy `signal_demo.db` to a **private location outside the Git repository**. Never commit that database.
