# SIGNAL ACAPS — Technical verification for reviewers

> Snapshot: **7 November 2026, 20:59 CET**. This document describes a tested hackathon prototype, not a production deployment. Test results must be rerun and updated on the final submitted commit, particularly after Phase 16A.

## 1. Purpose and design

SIGNAL ACAPS (Signals & Reflections) prototypes a human-in-the-loop workflow for anticipatory humanitarian analysis:

1. **Explore context** through a Ukraine regional map, illustrative 26-week risk series, and knowledge graph.
2. **Contribute judgment** through a separate synthetic Chad six-month expert forecasting question.
3. **Synthesize responsibly** with deterministic panel statistics, disagreement, coarsened feedback and source references.
4. **Review with a human** through restricted moderator routes and explicit release controls.
5. **Publish deliberately** via a separate approval-gated public-intelligence step. A final successful approval-to-anonymous-browser check remains on the manual acceptance checklist; expert-only values and raw submissions are not intended for anonymous publication.

The Ukraine analysis and Chad consultation are **separate illustrative demonstrations**, not an integrated operational prediction about Ukraine.

## 2. Architecture and technology

| Layer | Implemented role | What it does **not** establish |
|---|---|---|
| React / TypeScript | Country analysis, graph, expert contribution, moderator and Share interfaces | Frontend-only access restrictions are not a security boundary |
| Python / FastAPI | API contracts, deterministic workflows, authentication/authorization checks, review and publication endpoints | No independent security certification |
| Statistical synthesis | Aggregates probabilistic contributions and presents median/range/IQR and reduced-disclosure feedback | No proven predictive accuracy or statistically justified probabilities about real crises |
| Ukraine scenario model | Illustrative 26-week series, regional co-movement and linked concepts | No observed causal relationships or operational regional severity score |
| Source references | Official ACAPS archive links, publication dates, curated metadata and read-only review tools | Not an automatically updated ACAPS or ReliefWeb live feed |
| Moderator workflow | Human release of expert feedback and separate public-approval gate | Not a production identity and consent system |

### Role controls

Moderator-only review and publication endpoints are checked on the backend. An anonymous visitor does not gain moderator access by navigating directly to a UI route. The public summary remains unavailable until an authorized moderator approves an eligible snapshot. The demo's simulated expert-message and mutual-consent steps are **not real messaging or enforceable production consent**.

### AI transparency

The reproducible functionality demonstrated is **structured expert judgment plus deterministic analysis and human-reviewed synthesis**. A named deployed LLM or predictive AI model has **not been verified for this release**, so we do not claim that an AI model autonomously forecasts humanitarian crises. Any generated descriptive content must not be presented as an independently verified fact or source.

## 3. Reproducible testing evidence

**Recorded release output** (7 Nov 2026, 20:59 CET):

```text
Backend: Ran 120 tests
Frontend: Test Files 12 passed (12)
Frontend: Tests 54 passed (54)
Release checks: PASS 10 | FAIL 0 | WARN 0
STATUS: AUTOMATED CHECKS PASSED
```

The ten named release checks were:

1. `required-files`
2. `git-diff-check`
3. `git-staged-check`
4. `backend-unit-tests`
5. `frontend-unit-tests`
6. `frontend-production-build`
7. `report-metadata-audit`
8. `backend-api-health`
9. `frontend-http-health`
10. `access-and-publication-preflight`

**Important:** passing 174 tests is **not** a line/branch test-coverage measurement. The release-check snapshot preceded later optional publications work; repeat testing on the exact commit submitted to Junction.

### How to reproduce locally

Requires Python (project used Python 3.12), a supported Node/Bun runtime for the frontend, project dependencies, and any local demonstration data explicitly documented by the repository.

```bash
# In repository root
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m unittest discover -s tests -q

# In another shell
cd frontend
bun install
bun run test
bun run build
```

For API and browser checks, start the backend:

```bash
source .venv/bin/activate
python -m uvicorn app:app --host 127.0.0.1 --port 8765 --reload
```

And the frontend:

```bash
cd frontend
bun run dev --host 127.0.0.1 --port 8080
```

Then verify:

- `http://127.0.0.1:8765/api/health` — backend health
- `http://127.0.0.1:8080/ukraine-zoom` — scenario map/knowledge graph
- `http://127.0.0.1:8080/expert` — synthetic six-month forecasting
- `http://127.0.0.1:8080/moderator` — restricted moderator view (requires local demo sign-in)
- `http://127.0.0.1:8080/public` — Crisis Agenda, curated ACAPS publications and approved intelligence
- `http://127.0.0.1:8080/demo` — guided jury path

**Note:** The frontend normally runs on port `8080`; if the generated route or a dependency has changed, follow the repository's current documentation. Do not commit `.env`, moderator secrets, private records or untracked local datasets.

### Access and publication preflight

With the backend running:

```bash
python scripts/release_preflight.py --api-base http://127.0.0.1:8765
```

A preflight result is evidence for specific API contracts and permission checks, not a penetration test or independent security audit.

## 4. Actual end-to-end demonstration

The demonstrated synthetic Chad consultation contains **five of five expert contributions**. Moderator analysis showed a **70% Round 1 median**, **45–95%** contributor range, and **25 percentage-point IQR**; those are statistics of synthetic contributions, **not real crisis probabilities validated against outcomes**.

A moderator released a coarse **60–79%** group-feedback median band. The expert screen received this feedback while preserving an original 95% individual submission and offering an optional one-time revision. Public snapshot approval is a **separate permissioned step** and must be checked independently before being claimed as verified end to end.

## 5. Source provenance

| Item | Basis | Qualification |
|---|---|---|
| Chad / ACAPS Risk Radar record `R1043` | Organizer-provided reference CSV used in the local demonstration | Real reference content; forecast question is proposed and synthetic |
| Ukraine map and correlations | Historical administrative geometry + deterministic generated series | Not current territorial control; risk scores and co-movement are synthetic |
| Crisis Agenda counts / expert profiles | Synthetic demo catalog | Not observed population, media, expert or risk statistics |
| ACAPS Publications | Curated dated links to the [official ACAPS archive](https://www.acaps.org/en/countries/archives) | Snapshot checked 7 Nov 2026; *not* continuously updated |
| ReliefWeb report candidate discovery | Review-only script, requiring ReliefWeb-approved application access | Live API returned HTTP 403; no automatic synchronization claim |

The project is an **independent hackathon prototype, not an official ACAPS product**.

## 6. Known limitations and evaluation roadmap

- No independent security audit or penetration test has been conducted.
- No operationally validated six-month forecast accuracy, calibration or humanitarian impact has been demonstrated.
- Real forecast scoring requires independently specified and eventually resolved outcomes; a Brier score is an *evaluation method*, not proof of current model quality.
- Small expert panels may not provide anonymity even with feedback coarsening.
- Live ReliefWeb synchronization is blocked pending authorized access. Archived publications are curated, not silently imported.
- Some demo workflows, including invitations and name-sharing consent in Crisis Agenda, remain frontend simulations.
- A credible real-world pilot would need sustained expert recruitment, source validation, governance, operational monitoring and additional security testing.

**Proposed pilot metrics:** analyst time saved, forecast calibration after outcomes resolve, expert participation/retention, source traceability, review latency, and usefulness of human-reviewed briefings.

## 7. Reviewer-friendly evidence

Use the actual repository's README, screenshots and `docs/` files for architecture and walkthroughs. To verify the implementation, prefer the committed source, CI logs and repeatable commands over unaudited claims or screenshots alone.

**For the five-minute demonstration:** start with Ukraine country zoom, then show a synthetic Chad expert forecast, protected moderator release, and approval-controlled public output. Disclose the separation between these scenarios in narration.
