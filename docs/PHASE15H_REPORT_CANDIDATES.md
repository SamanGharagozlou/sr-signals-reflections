# Phase 15H — Controlled ACAPS-attributed report candidate discovery

## Scope

Add a **local, quarantined report candidate discovery command** sourced from the UN OCHA ReliefWeb API v2. Phase 15F remains the sole manually curated `frontend/src/lib/verified-report-index.ts` display source. Phase 15G continues its separate link/metadata audit. This phase adds no frontend, API, auth, forecasting, role, publication or workflow changes.

This is a *candidate discovery tool*, **not an automatic ACAPS website scraper or automatic publication synchronizer**. The ACAPS API at `api.acaps.org` documents datasets; its publication-library endpoint has not been established. ReliefWeb is a secondary source and may not include all or the latest ACAPS publications.

## Protections

- Fetches only `https://api.reliefweb.int/v2/reports`, with an explicitly supplied ReliefWeb `appname` query parameter and TLS-verifying `curl`.
- Country allowlist: `ukraine`, `sudan`, `chad`, `burkina`, `cameroon`.
- Request filters: country ISO3, `source.name = ACAPS`, `status = published`; retrieves latest *indexed* records by ReliefWeb creation time.
- On ingestion, independently validates every candidate's source, country, status, original date, index date and ReliefWeb link host. Rejects invalid entries.
- Stores the source's original publication date **only if provided**; ReliefWeb creation date is labeled separately. Does not claim candidates are newest on ACAPS.
- Fail-closed on network, malformed JSON, missing country or unexpected schema; an incomplete batch cannot masquerade as a complete one.
- Never writes to repository by default; optional `--output` creates a new JSON file and refuses overwrite. Does not merge, approve or publish any report.
- No automated expert messaging, no individual data, no private credentials in output. Avoid committing downloaded candidate files unless manually reviewed and appropriately sanitized.

## Run after install

From the project root (backend may be stopped):

```bash
python -m unittest tests.test_discover_acaps_report_candidates -v
python -m unittest discover -s tests -q
cd frontend && bun run test && bun run build && cd ..
git diff --check
```

Use a descriptive app name, per [ReliefWeb's API rules](https://apidoc.reliefweb.int/read/get-vs-post/):

```bash
python scripts/discover_acaps_report_candidates.py \
  --live \
  --appname signal-sr-source-review \
  --countries ukraine sudan chad burkina cameroon \
  --output /tmp/sr-phase15h-review-2026-11-07.json
```

The `--appname` is an application identifier, **not** an ACAPS token. Adjust the date in the output filename on later runs. You may omit `--output` to print only country summaries; it makes no files.

Network failure: the command returns `SAFE STOP` and writes no candidate file. macOS's trusted `/usr/bin/curl` can work when the Python venv reports certificate-chain errors. Never use `curl -k` or disable HTTPS verification. If ReliefWeb rate-limits or changes its response schema, investigate rather than bypass checks.

## Human review checklist (before ever updating Phase 15F)

1. Inspect each ReliefWeb candidate and visit its original **ACAPS** publication or country page.
2. Confirm the report's title, country, original publication date, publisher, report-specific permanent URL, and reuse terms.
3. Determine whether it is actually more relevant/recent than the currently curated report; no programmatic declaration of latest.
4. Review and edit `verified-report-index.ts` in a **separate PR**; update `verifiedOn` only when newly verified, and run Phase 15G audit.
5. Check the Crisis Agenda still labels fictional rankings, expert pools and estimates as synthetic. Maintain the existing approved intelligence publication gate.

## Sources

- [ReliefWeb v2 Reports API](https://apidoc.reliefweb.int/read/resources/reports/)
- [ReliefWeb filtering](https://apidoc.reliefweb.int/read/filtering/)
- [ReliefWeb GET vs POST / appname](https://apidoc.reliefweb.int/read/get-vs-post/)
- [ACAPS datasets](https://www.acaps.org/en/data)

No live ReliefWeb results or specific publications are bundled into Phase 15H. The new test records are fictional fixtures.
