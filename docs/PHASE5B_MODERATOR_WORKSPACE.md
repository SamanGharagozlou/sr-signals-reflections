# SIGNAL Phase 5B — Moderator-first workspace

This is a **frontend-only** improvement atop Phase 5A. No API paths or persistence contracts are changed.

## Problem addressed

- Distinguish current/contextual conditions from a specific *future six-month event*, without labeling ACAPS risk level as observed humanitarian severity.
- Show the moderator what requires attention next, including source review, forecast definition, Delphi release, public publication, and eventual outcome resolution.
- Enable evidence drill-down using the pre-existing moderator-authenticated endpoint `GET /api/risks/R1043/context`. Preserve original source labels, URLs, missing-field warnings, and the absence of evidence.

## Important boundaries

- Five checkpoints are displayed, but **only feedback release and public snapshot approval are currently enforced and recorded**. Evidence validation and consultation sign-off are not implemented. Outcome resolution is a future human task. The interface explicitly says so.
- Source URLs are references copied from the supplied Risk Radar file; SIGNAL does not automatically fetch or verify them.
- The proposal to connect Airtable, external news scraping, or budget/resource allocation is **not implemented** here and is not implied.
- No changes to expert anonymity, Delphi statistics, public summary, backend roles, or published snapshot contents.

## QA checklist

1. Run `python -m unittest discover -s tests -q`: expect all 36 tests from Phase 5A.
2. Run `cd frontend && bun run build` and, if configured, `bun run test`.
3. Login as the moderator at `http://localhost:8080/`. Check the decision brief and risk context source trail.
4. Ensure risk source labels and missing-field warnings match the CSV, and that absent evidence is displayed as missing.
5. Confirm panel stats, synthesis, counterpoint approvals, and public snapshot still work, including after refresh.
6. Visit the public summary as public; source drill-down and moderator action queue must not appear there.
7. Check mobile layout and keyboard access to details, source links, and approval confirmations.

The visual checkpoint statuses are descriptive, not a new approval ledger.
