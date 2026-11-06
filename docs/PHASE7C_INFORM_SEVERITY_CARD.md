# SIGNAL 7C — Official INFORM Severity card (crisis-matched only)

## Scope

Adds a current-conditions severity card to each Risk Explorer record at `/explore`, including an explicit **not connected** state. It also adds `GET /api/risks/{risk_id}/severity`, a read-only endpoint containing **only official public index data** after an analyst has performed an exact crisis-to-risk mapping.

The prototype does **not** generate INFORM severity scores, scrape external websites, infer country-wide severity values, or use ACAPS Risk Radar probability/impact as a substitute. The default state is "Not connected to a verified crisis record". The source dataset is not bundled in this patch.

INFORM Severity, ACAPS Risk Radar and SIGNAL's six-month expert event probability are three separate concepts. The 2026 update changed INFORM Severity scores to **0–10** starting in February 2026, and the published records are *per crisis*. Do not use 2025/January 2026 scores directly on the new scale.

Official releases: https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Severity/Results-and-data

## How to enable a score, if a real crisis crosswalk is established

1. Download the official INFORM Severity **September 2026** Excel release from the official site. Do not guess which crisis corresponds to Risk Radar R1043. Determine whether the risk has a truly matching crisis ID and supporting geographic/temporal context. If this cannot be established, keep the card unavailable.
2. Manually review source data, crisis ID, score, classification, dimensions and release date. Preserve the original sheet/row references in your internal notes. Never mix releases or score versions.
3. Copy `data/inform-severity-matches.example.json` to `data/inform-severity-matches.json` **only** after matching. Keep that new file local unless publication and data-use requirements have been reviewed. It is read by the backend on each request (no restart required).
4. Add records with the following exact fields. Illustrative schema only; **not real numbers and not a real crisis**:

```json
{
  "release": "2026-09",
  "source_url": "https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Severity/Results-and-data",
  "records": [
    {
      "acaps_risk_id": "R1043",
      "country": "Chad",
      "crisis_id": "REPLACE_WITH_OFFICIAL_CRISIS_ID",
      "crisis_name": "REPLACE_WITH_OFFICIAL_CRISIS_NAME",
      "match_note": "Human reviewer verified that the scope of this crisis matches this Risk Radar record, using source sheet/row ...",
      "score": 5.4,
      "level": "Medium",
      "dimensions": { "impact": null, "conditions": null, "complexity": null }
    }
  ]
}
```

**The score `5.4` above is a placeholder to show schema, NOT an observed INFORM value.** You must replace it (and the rest of the record) with verified numbers before using it in a live demo or distribution. Do not include this example as a runtime data file.

The resolver validates risk ID, country, nonempty crisis identity/match rationale, 2026-02+ release, official HTTPS source domain, finite score range, level classification, dimensions and duplicate matches. No values display if any validation fails. Optional dimensions stay `—` rather than being calculated from the overall index.

Set `SIGNAL_SEVERITY_MANIFEST=/absolute/path/to/verified-manifest.json` to use a different local path. Do not expose the full manifest or private review notes through public API. The read-only endpoint intentionally only emits the fields needed for the card.

## Acceptance checklist

- [ ] Without a verified manifest, the card shows an unavailable state (never fabricated numbers).
- [ ] The `Get official data` link opens the proper source and is separate from Delphi forecasting.
- [ ] An actual human-verified matched crisis record displays the published score and release correctly.
- [ ] Switching risks updates the card, and mismatched or invalid records remain unavailable.
- [ ] Existing Risk Explorer, moderator, expert and public flows still work.
- [ ] `python -m unittest discover -s tests -q` and `cd frontend && bun run build` pass on the Mac.

## Why no AUTOMATIC data ingestion?

A country can contain multiple overlapping emergencies. Attaching the first available Chad severity score to R1043 would be a methodological error, and the metadata in the official Excel release does not automatically validate the relationship. A human crosswalk is required before showing a score. Future work can add a preview and manual approval workflow for that mapping.
