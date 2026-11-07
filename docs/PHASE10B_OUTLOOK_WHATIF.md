# Phase 10B — Rita-inspired Outlook, What-if Lab & Partner Brief

## What this implementation actually does

- Adds `/outlook` and a navigation entry (TanStack Router generates `routeTree.gen.ts` on the user's machine).
- Presents three **explicitly fictional** event-scenario examples. The first references R1043 only thematically. All input probabilities are invented for demonstration.
- Draws a weekly cumulative occurrence curve from a hypothetical 26-week probability under a *constant weekly hazard assumption*: `P(by week t) = 1 - (1 - p26) ** (t/26)`.
- Offers sliders for the six-month endpoint, a scenario sensitivity shift in percentage points and a separate ± sensitivity envelope. These are not actual predictive uncertainty intervals and are **not** derived from 4,000 stochastic paths.
- Partner Brief displays an actual `GET /api/public-summary` aggregate **only if previously approved**, alongside the source ACAPS R1043 qualitative risk category if loaded and official INFORM country crisis context if installed. Never aggregates or infers an exact risk-level numerical forecast.
- No money movement, automatic approvals, external LLM, news scraping, new backend endpoints, private data or additional data redistribution.

## Important methodological boundary

The screenshots Rita sent depicted illustrative “now” probabilities, 26-week probabilities and 4,000 simulated paths. We have deliberately **not** reproduced those claims. A true cumulative occurrence curve must be nondecreasing; a falling weekly event probability would describe a different quantity. The display includes a highly visible synthetic banner, readable formula, explicit sensitivity description, and no claimed forecast validation.

## Running tests

1. Existing Python suite: `python -m unittest discover -s tests -q`.
2. Frontend: `cd frontend && bun run test && bun run build`.
3. Verify `/outlook` first, adjust sliders, check chart endpoints and reset. Switch between Outlook, What-if and Partner Brief.
4. When a public summary hasn't been approved, Partner Brief must say **Not approved** and show no numerical panel estimate. Once the moderator approves a synthetic summary, only the public-approved band may show.
5. Confirm Risk Explorer, Moderator and Expert screens still operate. Do **not** add local Risk Radar CSV or INFORM JSON to Git.

## Follow-up

If ACAPS wants real weekly forecasts, the next product phase needs dated empirical event/trigger histories, a defensible occurrence/hazard model, a back-testing plan, reliable outcome labels, and expert validation. A single six-month elicited probability cannot justify claims of weekly calibration or Monte Carlo forecast confidence bands.
