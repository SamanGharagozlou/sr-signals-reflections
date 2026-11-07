# SIGNAL Phase 10A — Evidence quality and analyst triage

## Why

Add source-field completeness checks to the existing **moderator-only** workflow. The source is the organizer-provided ACAPS Risk Radar CSV already loaded by `/api/risks`. This is *not* an ML classifier, independent evidence verification, or a replacement for ACAPS judgments. It does not alter risk, impact, probability or source data.

## Deterministic rules

- All records: missing **Risk ID**, **Risk Title**, **Country**, or **Status**.
- **Active** records only: missing qualitative **Risk Level**, **Probability**, **Impact**, or **Triggers**.
- Source field missing **only if the export actually contains a `Source` column**, to avoid treating a different schema as missing evidence. This flags an empty *field*, not a lack of actual evidence.
- Resolved/inactive historical records are not falsely treated as outstanding future assessments.
- Priority is a display-order triage heuristic, never humanitarian severity or a learned probability.
- Fallback data produces `available=false` and no official queue.
- Data may contain other columns with source information. A flag means "check this field," not "this risk is wrong."

## Moderator triage

`GET /api/moderator/evidence-queue` returns records with explicit field flags, review guidance and open/triaged state. `POST /api/moderator/evidence-queue/triage` accepts `{risk_id,rule_code,fingerprint,disposition: "triaged"|"open"}`. Both require the **moderator** role.

Triage is saved in two local SQLite tables (`evidence_triage`, `evidence_triage_events`); source data remains read-only. Each flag's fingerprint depends on its source ID, rule and source-field contents. A changed field automatically presents the flag as open again. Only one action per currently valid source flag is accepted. Resetting the *expert Delphi demo* does not erase these separate source-data triage notes.

There is **no proof-of-verification or correction state**, no invitation, no AI-generated evidence and no automatic escalation beyond displaying a prioritised queue. No individual expert responses appear in either endpoint.

## Installation and test

The patch is based on the Phase 9A + Phase 8 frontend/backend snapshot. Apply to the latest merged `main` on a new feature branch with `git apply --check` first. It does not touch the generated TanStack route tree.

1. `python -m unittest tests.test_evidence_quality -v`
2. `python -m unittest discover -s tests -q`
3. `cd frontend && bun run test && bun run build`
4. Login as synthetic moderator and visit `/moderator`. Examine the **Evidence review queue**.
5. Mark a flag triaged, refresh, reopen it; verify the source record remains unchanged. Check expert and public pages still load. Keep original datasets unstaged until rights review.

## Boundaries

The app uses fixed synthetic credentials and local SQLite; not suitable for real private contributor data or deployed role security. Human triage labels do not establish data quality, forecast accuracy, or external ACAPS authorization.
