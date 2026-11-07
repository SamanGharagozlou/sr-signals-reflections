# Phase 15E — Crisis Agenda & synthetic expert exchange

## Purpose
Implements Rita's Crisis Agenda as the default **Share** sub-screen, while retaining the original approved-only Chad report on a separate **Approved intelligence** sub-screen.

## Capabilities
- Fourteen **fictional** crisis cards with sorting (recent, needs, coverage gaps), regional filtering, under-covered filter, and two layouts.
- Synthetic expert cards per crisis (pseudonym, specialty, broad area, demo availability), with no-expert invitation states for Burkina Faso and Cameroon.
- Four-step demonstration: You ask → They answer → Propose sharing names → Both agree. All steps are client-only simulations. There is NO real consent, authentication, messaging, email, privacy guarantee, storage, moderation, or recipient system here.
- Update-request form creates a local preview and **does not send** email or record PII.
- Suggested-actions panel is a **non-operational** discussion checklist, not humanitarian response recommendations.
- Links to **verified** public ACAPS country pages for Sudan, Ukraine, and Chad; other cases link to ACAPS country index. These are source destinations, **not live-verified latest report titles**.
- Existing `/public` approved report logic remains unchanged; that component mounts only when selected. Publication is still decided server-side.

## Data provenance
All dates, ranking, attention, counts, profiles, and storylines displayed in the Agenda are demonstrative inventions. ACAPS country pages are external links, not connected ingestion. Never call this a real ACAPS live situation monitoring tool.

## Acceptance
1. Open `/public`: Crisis Agenda loads without depending on `/api/public-summary`.
2. Switch `Approved intelligence`: pending/approved state behaves as before. Unapproved aggregate stays hidden.
3. List/grid + filters + sort update; zero-expert case offers fictional invite.
4. Select a fictional expert: ask → show reply → propose names → accept. No actual real identities are disclosed.
5. Request update and add to watchlist: explicit no-send/session-only feedback.
6. Test on mobile and keyboard, browser console clean, `bun run test`, `bun run build` and Python regression suite pass.
7. Run release_preflight with FastAPI running; manually check no unauthorized disclosure.

## Future real-data and messaging implementation
Use documented/authorized ACAPS APIs or permitted public-page retrieval, with request timeouts, caching, timestamps, provenance, schema checks, licensing and stale-state UI. For real experts: account authentication, granular data minimization and consent, backend-enforced private threads, independent name-sharing permission for each participant, audit logging, abuse/safety handling, retention/deletion policy and security review. Nothing in Phase 15E implements those capabilities.
