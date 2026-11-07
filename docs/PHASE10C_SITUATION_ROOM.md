# Phase 10C — Ground Truth Situation Room (analyst/public)

## Scope

Rita's 7 Nov mockup is the layout inspiration. This implementation deliberately **does not** claim the mockup's invented expert notes, fake news feed, unverified risk index 5.6, seven expert rounds, historical time series, geocoded individuals, provincial risk shading, or proprietary ACAPS forecasting method are real.

Adds `/situation-room` with two user experiences:

1. **Analyst**: explicitly sign in to a demo moderator session. Backend endpoint `GET /api/moderator/situation-room` requires the moderator role and returns source Risk Radar context and synthetic aggregate Delphi statistics. It does **not** send raw notes, individual estimates, expert IDs or personal locations to the frontend. Existing approvals occur only via `/moderator`, not this read-only room.
2. **Public**: requests only public endpoints (Risk Radar detail, already-approved frozen Delphi summary, and existing public INFORM country crisis context). No analyst API requests are made while the public component is mounted. A forecast band is hidden until moderator approval. Switching the visual tab cannot grant access to the restricted endpoint.

**Geography:** Natural Earth country outlines are the offline fallback. If `frontend/public/geo/tcd-adm1.geojson` is populated from a verified Chad ADM1 GeoJSON source, the Situation Room will show selectable province boundaries. These shapes display **boundary geometry only**; the project does not assign province-level risk scores or private expert locations. A province selection identifies a boundary name, not an event location. The optional file is not included in this patch.

**Timeline:** Workflow checkpoints only (panel completion, feedback release, moderator publication) and the public approval timestamp when available. There is no fabricated history, estimated weekly forecast, source timeline, real-time update or Monte Carlo projection. The separate `/outlook` what-if display is explicitly illustrative.

## Optional boundary data

Use a reputable, attributed administrative-boundaries source, such as [geoBoundaries gbOpen TCD ADM1](https://www.geoboundaries.org/api/current/gbOpen/TCD/ADM1/). geoBoundaries documents gbOpen as an open/attribution-required dataset; check each release's license metadata before redistributing. A verified GeoJSON `FeatureCollection` with properties `shapeName`, `ADM1_EN`, `admin1Name`, `NAME_1`, or `name` can be saved to `frontend/public/geo/tcd-adm1.geojson` for local-only use. **Do not commit downloaded source geometry without reviewing license and attribution terms.** The geometry source and release metadata should be displayed on any public deployment.

## Installation

1. **Do not discard uncommitted work.** Check `git status -sb`. Ensure Phase 10B is applied or merged; the Phase 10C patch was built on its reconstructed baseline.
2. `git switch main && git pull --ff-only origin main && git switch -c feat/situation-room`
3. Extract `SIGNAL_Phase10C_Situation_Room.patch` from the ZIP. Run `git apply --check /path/to/patch && git apply /path/to/patch`.
4. `python -m unittest discover -s tests -q`.
5. `cd frontend && bun run test && bun run build && cd ..`. The router generator should add `/situation-room` to `frontend/src/routeTree.gen.ts` during the build. If no route appears, confirm frontend Vite dev server is restarted and inspect TanStack router generator logs.
6. Run FastAPI on port 8765 and Vite on the port it prints (usually 8080); open `http://localhost:8080/situation-room`.
7. Start in **Public**, verify no panel number before approval. Switch **Analyst**, sign in with the synthetic moderator button, confirm panels/risk source. Return **Public** and verify no notes, individual forecasts or private statuses. After publishing, confirm only the approved band appears. Check on a narrow/mobile browser width.
8. `git diff --check && git status -sb` then stage only the files listed below and commit and push. Avoid adding `data/risk-radar-export.csv`, local severity JSON, SQLite database or a downloaded ADM1 geometry file.

### Stage for Git

```bash
git add app.py tests/test_situation_room.py \
  frontend/src/routes/situation-room.tsx \
  frontend/src/lib/api/types.ts \
  frontend/src/lib/api/fastapi-adapter.ts \
  frontend/src/lib/api/mock-adapter.ts \
  frontend/src/lib/geo/chad-provinces.ts \
  frontend/src/test/chad-provinces.test.ts \
  frontend/src/components/signal/ui.tsx \
  frontend/src/styles.css frontend/src/routeTree.gen.ts \
  docs/PHASE10C_SITUATION_ROOM.md

git diff --cached --stat
git commit -m "Add role-gated Ground Truth situation room"
git push -u origin feat/situation-room
```

## Tests and limitations

- `tests/test_situation_room.py` verifies moderator-only endpoint access, withheld notes/IDs, initial approval gate, frozen public aggregate, and revision lock.
- `chad-provinces.test.ts` exercises optional GeoJSON validation and projection. These are not cartographic accuracy tests; the administrative dataset needs independent provenance/validation.
- Prototype demo authentication is fixed-code and **not secure for real humanitarian contributors or a public deployment**. Use synthetic data only. The role separation here is a demo access boundary, not a production security certification.
- Source Risk Radar/INFORM figures must be kept distinct from synthetic expert estimates and illustrative outlook curves.
