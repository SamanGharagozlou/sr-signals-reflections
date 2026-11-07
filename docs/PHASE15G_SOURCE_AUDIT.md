# Phase 15G — ACAPS source integrity and freshness audit

## Purpose

Add **read-only** validation for the four curated ACAPS report references merged in Phase 15F. It audits the exact TypeScript source index, checks metadata and review age, and *optionally* checks HTTPS URL reachability. It never changes report entries, claims which report is latest, scrapes page contents, publishes a forecast, or uses any expert data.

## What it checks

- Required fields for each report, country ID consistency, dates and date ordering
- HTTPS and official ACAPS domain allowlist (including redirect final host when live checks are enabled)
- Number of days since a human last checked the reference, with a default 30-day review threshold
- Whether the URL is a general country page, rather than a report-specific permalink
- Optional HTTP reachability using `curl` with certificate verification **enabled**
- Manifest SHA-256 to make the audit output reproducible

## Commands

Run offline (no Internet access):

```bash
python scripts/audit_acaps_reports.py
```

Optional live reachability test using system curl (macOS may prefer `/usr/bin/curl`):

```bash
python scripts/audit_acaps_reports.py --live --curl /usr/bin/curl --output /tmp/sr-acaps-audit.json
```

Run unit tests without Internet:

```bash
python -m unittest discover -s tests -p 'test_acaps_report_audit.py' -v
```

An HTTP 200 confirms only that the URL responds. It does **not** verify the report title, publication date, contents, current relevance, or newest-report status. HTTP 403, SSL failures, robots/rate limits and transient server failures should be marked for manual review, not overridden with insecure curl flags. Never use `curl -k`.

To include due reviews in a nonzero exit code:

```bash
python scripts/audit_acaps_reports.py --strict
```

## Scope and acceptance

- Only three files are added (`scripts/`, `tests/`, and `docs/`).
- The Phase 15F `verified-report-index.ts` is read but never modified.
- No runtime endpoints, background jobs, route generation, UI, datasets, authentication, or moderator approvals are changed.
- Existing Python tests, frontend tests and production build remain green.
- Keep local datasets untracked and do not commit `/tmp/sr-acaps-audit.json`.

## Next engineering step

If we can confirm a supported publication-specific ACAPS API and its license, we can implement an authenticated, server-side adapter with an explicit review queue and a persisted last-known-good cache. The publicly documented ACAPS API primarily advertises humanitarian **datasets**, so do not assume its endpoints provide the publication-library feed. Live expert exchanges and identity consent remain synthetic demos until separately implemented and reviewed.
