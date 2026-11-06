# Phase 9A — Official INFORM Severity (context only)

## Purpose

Adds a *country-level crisis context panel* to the existing Risk Explorer. Keeps the separate, verified-match `/api/risks/{risk_id}/severity` card **unchanged**. Country affiliation alone never authorizes a crisis-to-risk match.

## Data

Extracted from the user-provided official Excel workbook `202609 INFORM Severity - September 2026.xlsx`, release dated **2026-09-30**, sheet `INFORM Severity - all crises`. The 100 source rows cover 71 country labels. A separate `Crisis info` worksheet provides geographic scope, area labels, and source links. JSON includes source workbook SHA-256, worksheet row per observation and official portal link.

The normalized JSON is distributed separately from the Git patch and **should be kept local until downstream rights/publication are reviewed**. Install as `data/inform-severity-2026-09-crises.json`. Override with `SIGNAL_INFORM_CONTEXT=/absolute/path` if needed.

## API

`GET /api/inform-severity/context?country=Chad` gives a source-restricted list of all official crisis records for the selected country. No joins or predictions. The React card provides a clear observed-severity / six-month-event distinction and shows official crisis IDs.

For Chad, the release lists `TCD001` complex crisis (8.4/10, Very High) and `TCD005` displacement from Sudan to Chad (7.1/10, High). The latter is subnational in Ennedi Est, Wadi Fira, Ouaddaï, and Sila; this geographic overlap is contextual only and does **not** prove a one-to-one equivalence with R1043.

## Tests

`python -m unittest tests.test_inform_crisis_context -v` and the full repository tests. On Mac: `cd frontend && bun run test && bun run build`.

## Methodology limitations

- The source's severity measures **existing humanitarian crises**, not future event probabilities, causal claims, or resource allocation priorities.
- Index scores are **not** ACAPS Risk Radar's qualitative levels and must not be directly combined with Delphi probabilities.
- The normalized country view can show multiple crises and does not select which is equivalent to a Risk Radar record.
- This synthetic-only demo has not undergone production identity, authorization, or release-rights assessment.
