# SIGNAL Phase 5A — Expert Delphi Experience

This milestone adapts selected UX patterns from the team-provided Ground Truth expert-screen concept. It uses the **existing** React/Vite frontend and FastAPI/SQLite backend; it does not import the HTML mock, mock forecasts or its hardcoded publication figures.

## Scope

- Clarify the existing steps as Privacy → Brief → Blind call → Evidence gaps → Review.
- Make the receipt identify an original, stored independent forecast. The UI never claims cryptographic sealing.
- Present rounded, backend-controlled group feedback as a *Reveal*; disagreement is allowed and encouraged.
- Add **one optional, fixed editorial reflection prompt** selected and approved by the moderator. It is not generated from private expert notes, and is not an ACAPS conclusion or a verified field report.
- Permit one optional forecast revision without overwriting the original.

## New API contract

- `GET /api/moderator/counterpoint` — moderator-only list of two fixed editorial prompts; approval eligibility/status.
- `POST /api/moderator/counterpoint/approve` — moderator-only `{ "prompt_id": "attribution" | "documentation" }`; requires a full panel and released feedback; one approval per demo reset.
- `GET /api/expert/feedback` — existing expert-only endpoint; now includes optional `counterpoint` **only** after first-round contribution, feedback release and moderator approval. Never returns individual forecasts or raw notes.
- `/api/public-summary` remains unchanged and never exposes a reflection prompt.
- Demo reset clears `delphi_counterpoint` along with other demo state.

## Test with the existing demo

1. `python -m unittest discover -s tests -q` — expected **36 tests** (32 baseline + 4 new).
2. `cd frontend && bun run build && cd ..` — validate the React production build locally.
3. Open `http://localhost:8080/`. Moderator resets the synthetic demo, then sign in through Expert and submit a fifth forecast.
4. Return through Moderator, release group feedback, then find **Choose an expert counterpoint**. Select a fixed option and approve it.
5. Re-enter Expert; see the coarse group band and **Reflection · approved by moderator**. Revise a forecast once or keep it unchanged.
6. Confirm the public page shows only the previously approved aggregate, not the private reflection prompt. Repeat reset and confirm no reflection is shown until newly approved.

## Interpretation and boundary

This is a synthetic hackathon demo. Five-person group feedback cannot ensure actual anonymity. Moderator-selected prompts are **hypothetical challenges**, not verified facts or individual testimony. No outreach, risk-rating changes or real-world decisions happen automatically.
