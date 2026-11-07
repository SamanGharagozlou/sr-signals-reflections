# S&R Phase 15F — Curated verified report references

## Scope
Adds a **dated, source-backed reference panel** to Phase 15E Crisis Agenda cards for Ukraine, Sudan, Chad and Burkina Faso. The references are curated from public ACAPS report pages and checked on **7 November 2026**. Each card links to its ACAPS source; Ukraine links to its country analysis page where the named report and date appear. This is not an automated news feed, a latest-report guarantee, or an ACAPS affiliation.

## Explicit limitations
- **No scraping / auto-sync** in this milestone. The existing ACAPS API exists, but API documentation/registration and terms need review before real recurring ingestion. The next milestone can add an authorized adapter and a verified refresh process.
- The fictional people-in-need values, media coverage, scenario dates, expert pools, conversation and invitation states in Phase 15E remain synthetic. Public report metadata is visually separated from them.
- The report reference is informational. It does not validate any fictional scenario number or recommend humanitarian operations.
- Missing references are omitted, not fabricated; country-page links from 15E remain as fallback.
- Existing FastAPI, approval gates, access checks, and publication endpoints remain unchanged.

## Pinned report sources (verified 2026-11-07)
- Ukraine | 2026-10-15 | Ukraine: May–August 2026 humanitarian access update | https://www.acaps.org/en/countries/ukraine
- Sudan | 2026-05-13 | Sudan: risk analysis (2026) | https://www.acaps.org/en/countries/archives/detail/sudan-risk-analysis-2026
- Chad | 2024-10-31 | Chad: Impact of floods | https://www.acaps.org/en/countries/archives/detail/chad-impact-of-floods
- Burkina Faso | 2025-05-28 | Burkina Faso: Humanitarian needs in blockaded areas | https://www.acaps.org/en/countries/archives/detail/burkina-faso-humanitarian-needs-in-blockaded-areas

## Acceptance criteria
1. `bun run test` passes existing suite plus three metadata tests; `bun run build` succeeds.
2. On `/public` > Crisis Agenda, matching crisis cards show **ACAPS report reference** with explicit publication and verification dates, and link to HTTPS ACAPS official pages.
3. Cameroon and other entries without a curated source display no invented report; pre-existing country browsing links remain.
4. Sorting, filtering, Ask Experts, updates, synthetic workflows and Approved intelligence work as before.
5. Public summary remains approval-gated (check release preflight and browser).
6. No local CSV/JSON files are staged. Changes are confined to the five specified paths.

## Release
Commit in an isolated feature branch after automated tests, browser checks, and release preflight. Avoid `git add .`.
