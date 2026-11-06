# Phase 7E — Rita's Agent Crew / Human Forecasting Loop

## Purpose

A frontend-only, visually polished explanation of the functioning SIGNAL workflow and the conceptual characters Rita designed in her supplied Ground Truth HTML prototype. No new backend endpoints, LLM calls, autonomous agents, or privileges are added.

## What ships

- `/method`: interactive, five-card role selection, matching robot drawings from Rita's supplied HTML, contextual explanations, human safeguards and four oversight gates.
- Header nav entry `How it works` and homepage link.
- Responsive layout and `prefers-reduced-motion` support.
- Static crew model with tests for five names, missing-proof prevention, and honest missing-capability statuses.
- The route is public information only; no user data or sensitive moderator state is fetched.

## Implementation truth

1. **Smith**: a configured R1043 event question exists; question-generation agent does not.
2. **Watchtower**: source/missing field context exists; autonomous monitoring, ingestions and rerating do not.
3. **Synthesizer**: deterministic aggregate stats, moderated release and keyword note themes exist; LLM note rewriting and guaranteed anonymization do not.
4. **Contrarian**: moderator-approved reflection/counterpoint exists; no private individualized critique.
5. **Referee**: an illustrative scoring endpoint and resolution criteria exist; outcome adjudication and real forecast-validation lifecycle do not.

Only group-feedback release and public-snapshot approval are currently backed by explicit moderator-only approval controls. The other displayed controls are manual/future.

## Attribution

The five named visual characters are extracted from the HTML design prototype supplied by teammate Rita, not scraped from the internet. Only the SVG drawings were extracted; bundled font files are not included.

## Validation checklist

- `git apply --check --exclude=frontend/src/routeTree.gen.ts ...`
- `cd frontend && bun run test && bun run build` (Vite generates `src/routeTree.gen.ts`)
- `python -m unittest discover -s tests -q`
- `git diff --check`
- Manually inspect `/method` at desktop and mobile widths. Click all five roles.
- Confirm `/`, `/explore`, `/risk-index`, `/analysis`, `/expert`, `/moderator`, `/public` still load.
- Verify no claims of deployed AI agent crew, actual Brier performance or real expert data.
