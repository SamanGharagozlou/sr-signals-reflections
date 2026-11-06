# SIGNAL Phase 7A — Risk Explorer & Visual Foundation

## Scope

This milestone integrates Rita's Risk Explorer design ideas into the existing SIGNAL React + FastAPI application. The implementation does **not** create new forecasts, map inferred conflict-event coordinates, connect to Airtable, or change Delphi permissions.

## Working features

- Country-level interactive **Equal Earth** projected SVG, stored locally (`frontend/src/lib/geo/country-paths.ts`). Uses simplified Natural Earth public-domain boundaries, with an accessible country index and keyboard-operated highlighted countries. Country outlines are illustrative, **not authoritative on boundaries or disputed territories**.
- Three source-record filters: all, active, high risk. Case-insensitive country/risk ID/title search.
- Three map lenses: source qualitative risk level; matching risk **record counts**; availability of the one real synthetic R1043 consultation. These are categorically different measures and are labeled accordingly.
- Dashboard metrics calculated from `GET /api/risks`, including the inventory `source`. With the official Risk Radar CSV loaded, they reflect the source dataset. With fallback data, they show only R1043 and do **not** claim 28 active risks or 76 triggers.
- Country panel groups risk records, shows qualitative source categories and loads risk details with `GET /api/risks/{id}`.
- R1043 provides legitimate expert and moderator entrance actions using existing demo authentication; other risks explicitly state that no consultation is configured.
- Landing page and shared header link to `/explore`.

## Backend changes

`GET /api/risks` remains read-only and unauthenticated as before. Entries now additionally include `status`, `trend`, `probability_category`, `impact` from the already loaded risk records. No private moderator context is exposed. `/api/risks/{id}/context` remains moderator-only.

## Important distinctions

- **Source Risk Level** (High, Medium, Low) is qualitative, not a numeric six-month event forecast.
- **Source Probability category** is not an event probability percentage.
- A country with many Risk Radar records is not necessarily a more dangerous country.
- The map does not show actual attack coordinates or an assessment of geopolitical boundaries.
- Original trigger text is only a source excerpt (`risk_card` truncates it); source links are not verified by SIGNAL.
- All expert data and workflow actions remain synthetic.

## Install

Start from the merged Phase 6 visual baseline, in a **clean** feature branch. Apply `SIGNAL_Phase7A_Risk_Explorer.patch` with `git apply --check` followed by `git apply`. Do not copy unrelated files or stage organizer-provided CSV data.

## Validation

```bash
python -m unittest discover -s tests -q
cd frontend
bun run build
bun run test
cd ..
git diff --check
```

Check `http://localhost:8080/explore` with and without `data/risk-radar-export.csv` present, try Chad and a non-Chad risk, use keyboard activation on map regions, and confirm a non-Chad record cannot launch an invented Delphi round. Confirm the existing R1043 workflow still works.

## Next steps

Rita-inspired moderator disagreement visualization (based on **actual aggregated** backend data only), an honest Method Lab with illustrative scenario labeling, and a non-deceptive Agent Crew explainer, all in separate branches after this screen is verified.
