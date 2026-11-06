# Phase 7D — Risk Index & Statistical Analysis Studio

## Intent

Add two coherent human-readable data views to the SIGNAL demo, using only the existing Risk Radar inventory and protected historical evaluation endpoint. Preserve the real Delphi consultation, risk map, severity card, and all access checks.

## New pages

- `/risk-index`: source catalogue. Search by risk ID/title/country, filter by ACAPS qualitative risk level and status, inspect selected risk and optionally show crisis-matched INFORM Severity. The only configured Delphi workflow is R1043.
- `/analysis`: descriptive counts by source risk level, status, country and a cross-tabulation. Moderator-only historical risk outcomes are fetched using the pre-existing protected endpoint. Without moderator credentials, a locked state is displayed. Without full authorized Risk Radar CSV, the built-in R1043 fallback is clearly indicated.

## Trust boundaries

1. Risk Radar **qualitative** risk level is not numerical INFORM Risk, INFORM Severity or event probability. This page labels itself a **source risk record index**, not an invented quantitative index.
2. The new views never publish expert submissions or individual expert forecasts.
3. Country/area record counts reflect **dataset reporting coverage**, not relative danger or hazard occurrence rates.
4. Missing statuses/ratings are kept as `Other / missing` and `Unrated`, not silently imputed or dropped.
5. Historical outcomes are descriptive; materialisation by qualitative risk level does **not** establish numeric forecast calibration.
6. Historical results require the existing moderator session. The `rate_displayable` backend property controls whether a share is shown; missing/small-sample rates are suppressed.
7. The severity card displays an official score only when a crisis-specific record has been manually matched to the selected risk, with provenance.
8. No automatic decisions, resource allocation, agent inference, news scraping or new public backend endpoints.

## Data sources

- `GET /api/risks` (public inventory): risk ID, title, country, qualitative risk level, record status, probability category, impact.
- `GET /api/risks/{risk_id}` (public record details): risk trigger excerpts and existing assessment context.
- `GET /api/risks/{risk_id}/severity` (official index match or unavailable state, Phase 7C).
- `GET /api/moderator/historical-evaluation` (moderator-only descriptive historical outcomes; may return unavailable state).

## Validation

- TypeScript syntax checks and pure-model fixture assertions checked in preparation environment.
- Full `bun run test`, `bun run build`, and Python test suite must be run in the user's local project with installed dependencies. This packaging environment did not have those full dependencies available.
- Manual browser validation: both routes, filters, selected risk detail, source empty states, risk chart counts, moderator login, and protected historical status.

## Design

Uses Rita's shared teal/navy palette, Source Serif 4 headings, IBM Plex Sans data labels, progress bars, compact summary cards, and responsive grids. No chart animates in a way that could imply accuracy or movement unsupported by the underlying data.

## Future extensions (not claimed implemented)

- Official INFORM Risk historical data series, only after adding an authorized, versioned source and unambiguous join semantics.
- Multi-consultation forecasting, forecast outcome adjudication, calibration and Brier evaluation after real event outcomes are available.
