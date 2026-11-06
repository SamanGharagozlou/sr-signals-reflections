# Optional Lovable frontend prompt

> Only use this **after** the local VS Code prototype works. This prompt is for a new, separate UI project; it does not magically import the Python server.

Build a beautiful, responsive, accessible **humanitarian risk consultation** UI called **SIGNAL — Ground Truth & Forecasting**. It is a synthetic-only hackathon demo for the ACAPS challenge. Use a professional light interface with deep forest green accent, well-spaced cards and readable typography, optimized for mobile/low bandwidth. Do not build a chat interface.

Pages:
1. **Overview:** official R1043 risk card (Chad, High, active, impact 4, deteriorated), source attribution, separate disclaimer that example expert opinions are fictional.
2. **Expert session:** select anonymity (known to ACAPS / pseudonymous to peers / anonymous within consultation), choose whether assessment is under/about/overestimated, probability slider 0–100% for a precisely defined six-month binary event, confidence, optional one-sentence missing-factor note. Show confirmation and explain the purpose of next-round feedback. A short, human form, not AI chatbot.
3. **Moderator:** progress across 5 invited synthetic experts, group-level median/range and agreement/disagreement, theme counts, moderation buttons for releasing feedback and approving safe public aggregate.
4. **Delphi feedback:** after permitted release, show anonymous summary and one second-round probability revision, clearly distinguishing round 1 and 2.
5. **Public view:** minimal approved aggregate only, no individual identifiers, raw comments or individual probabilities.

Use demo data for development. If integrating with the real backend, use these existing endpoints rather than inventing new server contracts: GET /api/consultation, POST /api/login, GET /api/me, POST /api/expert/submit, GET /api/expert/feedback, POST /api/expert/revise, GET /api/moderator/dashboard, POST /api/moderator/release, POST /api/moderator/publish, GET /api/public-summary. Authorized requests use Bearer tokens. The backend must be separately deployed or served from the same origin; do not assume a Lovable-hosted preview can reach local 127.0.0.1.

No real expert personal data, no surveillance, no autonomous humanitarian risk ratings, no real disaster prediction claims. Mark synthetic data clearly.
