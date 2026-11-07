# Phase 15I — Ukraine Risk-Index Knowledge Graph (ACAPS persona-informed)

## Why we built this

Rita requested a Ukraine Risk Index knowledge graph. The separately supplied ACAPS PDF, **Understanding Our Readers Through Personas**, provides four research-based reader types (based on 30 semi-structured interviews), across global/field and information producer/user roles. They are *design guidance*, **not** current user validation, operational permissions, or verified data.

- **Emily** (global methodology / information producer): evidence reliability, trends by geography, explicit limitations, access to source material. UI: **Evidence check**.
- **Jose** (regional information user): fast multi-country synthesis, concise talking points and briefings. UI: **Regional briefing**.
- **Pierre** (field information producer): deeper contextual evidence, needs assessment, scenario methodology. UI: **Scenario method**.
- **Aisha** (field information user): short, credible summaries to inform 6–10-month planning. UI: **Planning horizon**.

**Reader explanations are not independent calculations.** They reframe the same synthetic region graph and prominently disclose limits. They are not personalized profiles, expert assessments, real alerts, or approved operational decision support.

## Scope / behavior

- New, interactive knowledge graph **inside `/ukraine-zoom`**, placed after the administrative map and before the regional correlation matrix.
- The selected administrative region controls the graph. Each graph includes country, region, fictional latest index, assigned fictional scenario theme, up to four correlated fictional-region peers, historic map reference, and optional ACAPS Ukraine contextual reading from Phase 15F.
- Node selection updates a detailed relationship inspector. Selecting a peer region updates the existing map, time trend, and matrix through the existing `setSelectedId`.
- Four selectable reading modes correspond to the ACAPS document's four reader needs, and are deliberately labelled as **synthetic** and **not for operational use**. No new measured indicators are implied.
- Graph can be exported as versioned JSON with only public/demo metadata and synthetic values. No private consultation, raw expert messages, protected moderator reports, or cross-tenant data.
- Fully client-side; no ReliefWeb registration, scraper, network request, auth change, prediction model modification, or new dependency. Reuses Rita's navy/teal styling.

## Data and relationship provenance

1. `synthetic-scenario`: numeric index, fictional thematic tag, and correlations from existing deterministic 26-week Phase 15D model. Not observed Ukraine severity or risk.
2. `geographic-metadata`: country and administrative grouping and geoBoundaries/OSM historical Ukraine ADM1 geometry (2017 reference). Not current territorial control.
3. `context-only`: verified-report-index ACAPS Ukraine country/publication reference. It is independent reading, **not evidence validating the synthetic index**.

Every edge and node is typed and source-labelled, with schema `sr.ukraine.synthetic-knowledge-graph.v1`. Co-movement is a correlation of simulated weekly changes, not causality, expert consensus or forecast accuracy.

## File changes (exactly six)

- UPDATE `frontend/src/routes/ukraine-zoom.tsx` — insert graph after map
- UPDATE `frontend/src/styles.css` — append isolated responsive styles
- ADD `frontend/src/components/signal/ukraine-risk-knowledge-graph.tsx`
- ADD `frontend/src/lib/ukraine-risk-knowledge-graph-model.ts`
- ADD `frontend/src/test/ukraine-risk-knowledge-graph-model.test.ts`
- ADD `docs/PHASE15I_UKRAINE_RISK_KNOWLEDGE_GRAPH.md`

No changes to backend, role auth, `/public`, reviewer approval, or local datasets.

## Test and browser acceptance

```bash
python -m unittest discover -s tests -q
cd frontend
bun run test
bun run build
cd ..
git diff --check
python scripts/release_preflight.py --api-base http://127.0.0.1:8765
```

With backend and frontend running, visit `/ukraine-zoom` and:

1. Switch from Zakarpattia to Odesa and Kharkiv; graph, index, map and matrix all update.
2. Select a peer node in graph and check it changes the focused region on the map and in the correlation matrix.
3. Select the four persona-informed explanation modes: **Regional briefing**, **Evidence check**, **Scenario method**, **Planning horizon**. Verify they explain the same index, never imply real severity, and expose limitations.
4. Open provenance inspector nodes, confirm ACAPS contextual link/date and historic map boundary attribution.
5. Export JSON; check `indexBasis: fictional-26-week-scenario`, node/edge provenance, no expert or moderator fields.
6. Resize to mobile; diagram should scroll horizontally and retain keyboard-operable node buttons and plain HTML relationship lists.
7. Visit `/public`; previously protected reports must remain unavailable until approved.

If tests or workflows fail, **do not merge**. The installer was tested against the Phase 15D/15F source structure available to the assistant, **not** against the user's private latest Git checkout.
