# SIGNAL — Final release checklist (November 7–8, 2026)

## Release gate: required before submission

- [ ] Pull latest `main`; record the commit SHA and confirm Rita's latest work is merged.
- [ ] `python -m unittest discover -s tests -q` passes.
- [ ] `cd frontend && bun run test && bun run build` passes.
- [ ] `python scripts/release_preflight.py --api-base http://127.0.0.1:8765` passes with backend running.
- [ ] Visual QA: Risk Explorer, Risk Index, analysis, Agent Crew, Outlook, Moderator, Situation Room and Public all load.
- [ ] Source QA: Risk Radar shows 139 records **only when** local official CSV exists; otherwise clearly indicates fallback. INFORM severity context shows unavailable unless optional verified local dataset exists.
- [ ] Forecast QA: Five synthetic contributions; feedback moderator-gated; revision optional; approved full-panel round correct; snapshot frozen after approval.
- [ ] Public privacy QA: no individual expert IDs, raw notes, anonymity choices, exact expert locations, or private revision counts exposed through public endpoints or screens.
- [ ] Direct unauthenticated request to `/api/moderator/situation-room` returns 401/403.
- [ ] Labels distinguish ACAPS qualitative risk, INFORM observed crisis severity, fictional expert forecasts, and illustrative what-if assumptions.
- [ ] README source, setup and limitations are correct; no broken links or outdated instructions.
- [ ] Final team names, contributions, and repository link entered in the Junction submission.
- [ ] 3-minute rehearsal, backup video, screenshots and presentation laptop are ready.
- [ ] Submission complete **before event deadline**; verify status on the official platform. Save confirmation.

## Data/code hygiene

- [ ] No `.env`, authentication secrets, `.venv`, raw datasets without rights review, SQLite database, private expert information, or generated caches tracked in Git.
- [ ] `git status -sb` clean except intentionally untracked local datasets.
- [ ] Optional administrative map geometry has appropriate source attribution/permissions if distributed.
- [ ] The original ACAPS Risk Radar export has not been overwritten by severity data.
- [ ] No claim of live public deployment or real ACAPS endorsement in screenshots/docs.

## Known limitations (state in pitch and README)

- Demo-only shared invitation codes and local SQLite; not production security.
- Fixed five-person *synthetic* R1043 consultation; other risk records are browseable, not automatically consultable.
- No real expert participation, no independent forecast model training or prospective accuracy verification.
- No operational continuous monitoring, autonomous five-agent system, real news ingestion, or verified province-level risk index.
- Outlook/What-if are educational scenarios, not calibrated uncertainty forecasts.
- Dataset redistribution/attribution needs review before shipping source exports publicly.

## Submission materials

1. Exact GitHub URL and a short description (in `PHASE11B_SUBMISSION_TEXT.md`).
2. Working prototype: local two-server instructions plus screenshots or backup recording.
3. Three-minute jury pitch (`PHASE11B_JURY_PITCH.md`).
4. Source provenance and limitations in README.
5. Names and verified contributions from all participating teammates.

Official ACAPS challenge brief says the submission comprises a working demo, three-minute pitch, and a repository link with a short description. Confirm any platform-specific fields and upload limits with the organizer before final submission.
