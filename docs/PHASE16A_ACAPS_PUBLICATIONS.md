# Phase 16A — ACAPS Publications Archive in Share

## Purpose
Deliver Rita's request: show genuine, dated ACAPS archive publications (Afghanistan, Colombia, Ukraine, DR Congo, Yemen) and let readers click a country/report title to open the source. Keep fictional crisis-need rankings and sample expert exchanges explicitly separate.

## Source validation — 7 Nov 2026
The first page of https://www.acaps.org/en/countries/archives lists:
- 2026-10-28 — Afghanistan: community perspectives on early flood warning and preparedness.
- 2026-10-15 — Colombia: humanitarian impacts in municipalities along the Nariño–Ecuador border.
- 2026-10-15 — Ukraine: May–August 2026 humanitarian access update.
- 2026-10-13 — DRC: Mpox outbreak affecting Kasaï province.
- 2026-10-12 — Yemen: child protection situational analysis covering IRG-controlled areas.
- 2026-09-25 — Colombia: earthquake’s expected humanitarian impacts.
- 2026-09-23 — Ukraine: scenarios for the 2026–2027 cold season.

Afghanistan and Colombia PDF link paths were provided by Rita and have **not been verified by a successful live PDF fetch in this environment**. Test their links manually in the browser. Publication title/date verified from ACAPS archive. Other links go to genuine ACAPS report detail pages or their relevant country pages, and their buttons label the distinction honestly.

## UI
`/public` → Crisis agenda / Share → **ACAPS publications · real sources** (default) / **Crisis agenda · synthetic demo**.
- The **real sources** tab searches the 7 dated, curated publication entries; country name and title link to PDF or report/country page.
- The **synthetic demo** tab retains rankings, fabricated need figures, sample expert chat and all existing controls.
- The **Approved intelligence** view is unchanged; public approval cannot be bypassed by this feature.

## Refresh approach
The React frontend reads reviewed `frontend/src/lib/acaps-archive-snapshot.json` at build time. It is *not* live, not dynamically updated each page load, and should never be described as such. This avoids browser CORS failures, unexpected website changes, and uncontrolled publication of unreviewed content.

`python scripts/review_acaps_archive.py` fetches the official archive page and compares `<h2>` / `<h3>` dated headings to the reviewed titles. It will return a preview of confirmed and new/unreviewed titles. If the page changes, fetch is blocked, or fewer than 3 known entries match, it fails closed without overwriting the snapshot. `--apply` updates only already-approved titles/check-date **on a clean feature branch**; it never publishes unknown reports or invents PDF URLs. Review the diff and run tests/build prior to merging.

For new publications, a maintainer must verify publication date, exact report URL, publisher and accessible PDF/report-page before adding a new record manually. Avoid downloading full PDFs just to populate the list.

## Manual acceptance checks
1. Open `/public` → Crisis Agenda. ACAPS publications should be the default subview.
2. Seven records are shown, including Afghanistan and Colombia; dates match the archive.
3. Click Afghanistan and Colombia country names; each should open the team-supplied PDF URL. Confirm the document genuinely loads.
4. Click Ukraine, DR Congo, Yemen: they must open labeled official ACAPS pages, not invented PDF locations.
5. Try country filters and search (e.g. `Colombia`, `flood`, `health`).
6. Switch to **Crisis agenda · synthetic demo** and verify all original controls and synthetic labels still work.
7. Switch to **Approved intelligence** and verify unapproved data still stays unavailable.
8. Run `python -m unittest discover -s tests -q`, `cd frontend && bun run test && bun run build`, `git diff --check` and the original release preflight.
9. If the official archive denies the refresh script due to 403 or HTML changes, mark the refresh as blocked and retain the curated snapshot. **Never bypass anti-bot controls**.

## Unchanged
No FastAPI endpoints, privacy policies, expert forecasting states, moderator actions, approval gates, source audits or local datasets are modified. The untracked `data/risk-radar-export.csv` and other local files must remain untracked.
