# S&R Phase 12 — Evidence intake and analyst review (synthetic-only)

This creates a **new** source-intake queue. It is separate from the existing Risk Radar source-field **Evidence Review Queue**, and does not automatically alter expert forecasts, ACAPS classifications, the spillover model, public reports, or any production system.

## Journey

1. Expert signs in with the established demo expert flow (FIELD-05), opens **Add a source** inside **Contribute**, and pastes a *fictional* pre-redacted email or note.
2. **Extract & review** runs a deterministic text heuristic; it suggests a count, reported place, relative date, event and the existing R1043 risk. Never fabricate a resolved date or a numeric matching confidence.
3. Expert corrects fields, chooses how they know the report, confirms both that the material is *synthetic* and that they personally checked it contains no identifying details, then presses **Save to Evidence Log**. The server stores **only its sanitized text** in SQLite.
4. The UI issues a generated ID (`EV-0001`, etc.). A three-step provisional intake is complete; analyst review and analytical acceptance remain pending.
5. Moderator opens **Analyse → Moderator review** and sees the new **New source evidence** inbox. Moderator reads the sanitized text and selects **Accept for analysis**, **Request corroboration** or **Reject**, optionally recording a short rationale.
6. In **Spillovers**, the analyst chooses an assumed shock and parameters independently. There is no automated causal learning, evidence-to-forecast execution, publication, or implicit endorsement of the submitted claims.
7. **Share** continues to publish only the existing explicit moderator-approved five-expert aggregate.

## API endpoints (protected)

- `POST /api/evidence/preview` — expert only; no persistence.
- `POST /api/evidence/submit` — expert only; persist sanitized synthetic material.
- `GET /api/evidence/mine` — expert only, scoped to submitting expert.
- `GET /api/moderator/source-intake` — moderator only.
- `POST /api/moderator/source-intake/{id}/review` — moderator only, optimistic version check and audit log.

## Security and scientific claims

- **Synthetic/local only.** This is not approved for real field reports, identifying details, real NGO correspondence, personal phone numbers, photographs or production deployment.
- Redaction is basic pattern-matching, not validated PII extraction. Explicit human confirmation is required. Do not claim it detects every name, identifier, or secret.
- Use of original unredacted emails is **not supported**. No email forwarding, external URL downloading, arbitrary uploads, OCR, live ingestion, or information-source trust scoring.
- Extracted fields are heuristic suggestions, not evidence of truth or a validated risk-link probability.
- Analyst acceptance means material may be **considered**; it is not proof the claim is true.
- The audit history records submission/review state changes. This is a demo log, not tamper-proof immutable provenance or a production-grade personal-data processing design.
- The isolated source records are **not included** in the public-summary endpoint, so they cannot be exposed by a normal publication action.
- The existing synthetic demo reset does **not** delete saved intake records. Test on a disposable demo database and never delete the local database without an explicit backup and consent.

## Acceptance

Run `python -m unittest tests.test_source_intake -v`, then the full Python suite. Run `bun run test && bun run build` inside `frontend`, and review the UI logged in as expert and moderator. Never stage private dataset files or `.db` files.
