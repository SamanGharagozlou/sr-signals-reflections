# SIGNAL Phase 7B — Moderator Intelligence Visualizations

## Scope

Frontend-only, design-driven update following Rita's moderator reference. Adds **aggregate-only** visual panels to the existing `/moderator` view. No changes to authentication, DB, financial/arithmetic approval logic, API contract, or forecast publication semantics.

## What is drawn

- Round-one and round-two **median points**, minimum–maximum whisker lines. Uses `firstRound` and `secondRound` from the existing role-restricted moderator endpoint; backend does not expose individual points.
- IQR is displayed as a numeric *width in percentage points*, not a positioned box. The FastAPI adapter exposes IQR but deliberately does not expose Q1/Q3; inferring their positions would be misleading.
- Median movement (in percentage points) is a description of changed panel judgments, **not** a forecast-accuracy improvement.
- Qualitative ACAPS-rating opinion shares are shown as an aggregate stacked bar with exact count labels.
- Existing detailed stats table remains accessible inside `<details>`. Source traces, moderator approvals, and all backend routes remain unchanged.

## Demo caveats

- The synthetic panel is not a calibrated prediction.
- Both rounds are shown as observations, **not** claims about the approved public snapshot. The round used for the published band must be separately verified/fixed in the backend before any final-round publication claims.
- The mock adapter has per-expert values, but this component uses only aggregates. The live backend deliberately withholds raw observations.
- No fabricated trigger probabilities, agent conclusions, expert comment clusters, or confidence intervals.

## Testing

Run in Mac repository root:

```bash
python -m unittest discover -s tests -q
cd frontend
bun run test
bun run build
cd ..
git diff --check
```

Manually verify `/moderator` both before and after feedback release, narrow-screen rendering, source trace and action queue, and unchanged `/expert` and `/public` routes.
