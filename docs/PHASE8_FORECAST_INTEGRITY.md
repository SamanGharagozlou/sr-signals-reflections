# Phase 8 — Forecast publication integrity

## Correctness contract

- The approved public panel band is calculated from **the full five-person panel**.
- If no expert revised before approval, the original full-panel median is published; `forecast_round = initial_panel`.
- If one or more experts revised, the current panel is used: their revised values replace originals; all non-revisers' original values carry forward. `forecast_round = revised_panel`.
- The public **does not receive** individuals, exact median, raw notes, revision counts, or interim estimates. Only a 20-percentage-point band and coarse round label are published.
- Only moderators may approve the public snapshot after the full panel and released feedback. Publication creates a frozen saved SQLite snapshot; repeat publication and further revisions return HTTP 409.
- Older approved snapshots remain intact and display an explicitly unrecorded round in the UI. Never silently rewrite an approved snapshot; reset the *synthetic demo* to publish a newly versioned view.
- A revised panel is not statistically calibrated, and unanimity or convergence is not implied by the label.

## Scope and limitations

This corrects a known mismatch where `safe_public_snapshot()` previously used the first-round median even when round-two revisions existed. It does **not** add a trained model, real human experts, formal question versioning, production authentication, verified outcome adjudication or Brier calibration. The built-in R1043 event is a proposed demonstration question, not ACAPS-approved.

Run `python -m unittest discover -s tests -q` from the project root and `bun run test && bun run build` in `frontend`. Test the full UI with a fresh reset: log in as FIELD-05, submit; release feedback as moderator; revise FIELD-01 or FIELD-03; approve and check `/public`. Check 409 on subsequent revise and publish. The reset revokes existing demo sessions.

The browser-only mock is nonpersistent, but now matches the 20-point backend bands and approval/freeze semantics more closely. Frontend `forecastRound` is optional to preserve compatibility with older SQLite snapshots.
