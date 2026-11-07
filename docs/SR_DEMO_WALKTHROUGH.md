# S&R — live jury workflow (five-expert synthetic demonstration)

**Name:** S&R means **Signals & Reflection**, and also **Sam & Rita**. S&R is an independent hackathon prototype, not an official ACAPS deployment.

## 0. Setup and safety

- Run FastAPI on `127.0.0.1:8765`, Vite at its printed local URL (usually port 8080).
- Check `python -m unittest discover -s tests -q`, `cd frontend && bun run test && bun run build`.
- Visit `/` > `/expert` > `/situation-room` > `/spillovers` > `/moderator` > `/public` once before the jury.
- The synthetic database usually seeds **four of five** forecasts. If already at **five of five**, you cannot submit another one without a moderator reset. **Reset deletes the previous local consultation and publication. Make a full SQLite backup first, and reset only if you intend to.** The script never resets data.
- Do not commit `.env`, SQLite, `data/risk-radar-export.csv` or `data/inform-severity-2026-09-crises.json`.

## 1. Contribute (40–55 seconds)

Home → **CONTRIBUTE**. The facilitator acts as the fifth synthetic expert (demo invitation `FIELD-05`).

1. Set privacy preference and assess the qualitative rating.
2. Input a fictional six-month event probability.
3. Add a non-identifying missing-factor note, choose confidence and submit.
4. Show the submission confirmation. We have a **five-person synthetic panel**, not nine.

Only the authorized expert sees their own receipt. A contribution is an unverified claim until independently checked.

## 2. Analyst Situation Room (35–45 seconds)

**ANALYSE → Situation Room → Analyst**. Sign in with the demo moderator invitation (`ACAPS-DEMO`).

- Refresh / revisit to load the latest aggregate; panel now reports **5/5**. The exact median depends on the fifth submitted estimate.
- Show the official Risk Radar source context, and the compact geographic map.
- Expand **Show panel workflow & statistics** or **additional INFORM Severity context** only if asked.
- Individual forecast estimates, raw notes, identities or precise expert locations are **not exposed** in the Situation Room API. To demonstrate an evidence-gap review, open **Moderator review** and its Evidence Review Queue. A synthetic note is not automatically verifiable evidence.

## 3. Invite audience to play with assumptions (60–75 seconds)

**ANALYSE → Spillovers**; select the analyst session.

1. Explain that panel results are read from a protected API; they are context, **not** input to a trained model.
2. Ask the judge: *Conflict escalation, flooding, or movement?* Select one.
3. Ask them to move **Shock magnitude** or **Transmission assumption**.
4. Press **Play shock**: relative pressure spreads through assumed relationships over 12 illustrative weeks.
5. Switch off **Humanitarian access** or **Regional effects** and observe the difference, holding all other assumptions fixed.
6. Expand **How are values calculated?** if asked; copy the analyst note for an audit of assumptions.

**Never call these pressure values probabilities, calibrated forecasts, measured impacts, or model-derived ACAPS ratings.** This is a transparent, deterministic **hypothesis sandbox** with deliberately assumed transfer coefficients. The country outline is a map reference, not a validated causal geography.

## 4. Review and Share (30–45 seconds)

**ANALYSE → Moderator review**. Release feedback and approve a frozen snapshot through the existing authorization flow, only when the five-person panel and workflow satisfy backend gates. Then open **SHARE**.

- The partner brief only reads the **approved public snapshot**.
- If no approved snapshot, the page shows *Report awaiting approval* rather than fictional results.
- The public brief is limited to rounded median band, panel size, qualitative source classification, question and approval details. No analyst scenario notes, raw expert information or unreviewed map claims leak into the report.

## Responsible-use summary

Real operational use requires consented expert recruitment, strong authentication, independently sourced evidence, validated causal assumptions, data rights, and uncertainty calibration. No operational or funding decisions are automated in this prototype.
