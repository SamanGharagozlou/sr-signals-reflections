# Phase 15C — Jury demo journey

## Scope

Adds an **optional presenter navigation guide** at `/demo`, styled with Rita's contour artwork and S&R palette. It makes **no requests** to forecasting, evidence, permission, approval or publishing endpoints. It does not create sample forecasts, synthetic approvals or published snapshots.

## Walkthrough (suggested order)

1. **Home** (`/`) — problem and six-month anticipatory-action framing.
2. **Analyse** (`/analysis`) — context, sources and careful interpretation. Clearly differentiate observed severity from forecasts.
3. **Contribute** (`/expert`) — expert check-in and evidence; switch panels, preserve form drafts, use fictional examples.
4. **Moderator** (`/moderator`) — moderator-only review; deny unauthorized requests, never work around access checks.
5. **Share** (`/public`) — approved public snapshot or honest unavailable state.

The `/demo` page is a presentation aid, not an access-controlled page. Anyone who can reach the frontend may be able to open the guide, which contains only generic talking points. It is not a product endpoint, and access to a linked route is governed by that route's existing permission controls.

## Verification

- Start from merged `main` in a dedicated feature branch.
- Run backend tests: `python -m unittest discover -s tests -q`.
- Run frontend tests and build: `(cd frontend && bun run test && bun run build)`.
- Run `git diff --check` and the existing release preflight with the backend running.
- Open `http://localhost:8080/demo`. Click all 5 stages. Inspect 1440px, 768px, 375px widths; tab through controls and links.
- Confirm navigation reaches each existing route, and that the Moderator and Share permission/publication boundaries are unchanged.
- If the TanStack route generator changes `frontend/src/routeTree.gen.ts`, review and stage that generated change alongside the intended new files.
- Check that the direct `/demo` route survives a refresh in local dev and the production preview.

## Safe demo boundaries

- Follow each page's actual source labels; do not imply risk predictions have external validation if they have not.
- Avoid showing raw expert records or personally identifying data.
- Never create an approved public snapshot merely to fill the demo without real moderator review.
- If no approved public snapshot exists, demonstrate the unavailable state as intended.
- Keep local official CSV/JSON datasets untracked; do not use `git add .`.

## Rollback

The installer backs up the original stylesheet under `~/Downloads/SR_before_phase15c_*`. If verification fails, restore that file after inspecting the diff, and remove only the new `/demo` route and runbook created by the package. Do not reset unrelated files.
