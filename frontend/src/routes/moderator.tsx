import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, ExternalLink, Link2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, ConfirmAction, DeniedState, ErrorState, Loading, RiskSummary, StatePanel } from "@/components/signal/ui";
import { AgreementVisual, ForecastVisuals } from "@/components/signal/forecast-visuals";
import { Button } from "@/components/ui/button";
import { EvidenceReviewQueue } from "@/components/signal/evidence-review-queue";
import { api, useApi } from "@/lib/api/client";
import type { ModeratorDashboard, ModeratorRiskContext, PanelStats, RiskSourceReference } from "@/lib/api/types";

export const Route = createFileRoute("/moderator")({
  head: () => ({
    meta: [
      { title: "Moderator dashboard — SIGNAL demo" },
      { name: "description", content: "Small-panel aggregates, evidence gaps and release workflow for an ACAPS risk consultation (synthetic)." },
      { property: "og:title", content: "SIGNAL moderator dashboard" },
      { property: "og:description", content: "Review panel aggregates and approve privacy-safe summaries." },
    ],
  }),
  component: ModeratorPage,
});

const run = async (fn: () => Promise<void>, ok: string, after?: () => void) => {
  try { await fn(); toast.success(ok); after?.(); } catch (e) { toast.error((e as Error).message); }
};

function ModeratorPage() {
  const q = useApi(() => api.getModeratorDashboard());
  return (
    <div className="min-h-screen">
      <AppHeader section="ACAPS moderator" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {q.status === "loading" && <Loading />}
        {q.status === "error" && q.error.status === 403 && (
          <DeniedState message="Moderator aggregates are only visible in the demo moderator role."
            action={<Button className="min-h-11" onClick={async () => { await api.login("moderator"); window.location.reload(); }}>Enter as demo moderator</Button>} />
        )}
        {q.status === "error" && q.error.status !== 403 && <ErrorState error={q.error} onRetry={q.refresh} />}
        {q.status === "ok" && <Dashboard d={q.data} refresh={q.refresh} />}
      </main>
    </div>
  );
}

function Dashboard({ d, refresh }: { d: ModeratorDashboard; refresh: () => void }) {
  const c = d.consultation;
  const full = c.submittedCount >= c.panelSize;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6 min-w-0">
        <section className="gt-moderator-heading" aria-label="Moderator workspace overview">
          <div className="gt-section-label text-white/70">GROUND TRUTH / MODERATOR DESK / SYNTHETIC</div>
          <h1 className="gt-editorial-heading mt-2 text-white">Risk intelligence, with humans in control.</h1>
          <div className="gt-moderator-metrics">
            <div><span>Panel</span><strong>{c.submittedCount} / {c.panelSize}</strong></div>
            <div><span>Group feedback</span><strong>{c.feedbackReleased ? "Released" : "Pending"}</strong></div>
            <div><span>Public snapshot</span><strong>{c.publicSnapshotApproved ? "Approved" : "Pending"}</strong></div>
          </div>
        </section>
        <ModeratorDecisionBrief consultation={c} />
        <div id="risk-evidence"><RiskSummary risk={c.risk} /></div>
        <ModeratorSourceTrace riskId={c.risk.id} />

        <section id="forecast-panel" className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal">Expert numeric forecasts · moderator only</p>
              <h2 className="mt-1 text-lg font-semibold">{c.question.text}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{c.question.disclaimer}</p>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <Users className="h-4 w-4 text-teal" aria-hidden />
              <span className="font-medium text-heading">{c.submittedCount}/{c.panelSize} contributions</span>
            </div>
          </div>

          <ForecastVisuals first={d.firstRound} second={d.secondRound} revisers={d.revisersCount} />
          {d.firstRound && (
            <>
              <details className="mt-6 rounded-lg border bg-background px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-heading">Detailed statistical table (methodology)</summary>
                <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Panel statistics by round</caption>
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Round</th>{["n", "Median", "IQR", "MAD", "Range"].map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    <StatRow label="First round" s={d.firstRound} />
                    {d.secondRound ? <StatRow label="Second round" s={d.secondRound} /> :
                      <tr><td className="py-2 pr-4 text-heading">Second round</td><td colSpan={5} className="py-2 text-muted-foreground">Opens after group feedback is released.</td></tr>}
                  </tbody>
                </table>
              </div>
                {d.secondRound && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Same panel in both rounds: {d.revisersCount} of {d.secondRound.n} revised; non-revisers' first-round forecasts are carried forward.
                  </p>
                )}
              </details>
              <p className="mt-5 rounded-md bg-amber-soft p-3 text-sm text-amber-foreground">
                With {d.firstRound.n} experts these figures describe a small panel's views. They are not a calibrated crisis prediction and do not replace the ACAPS qualitative rating.
              </p>
            </>
          )}
        </section>

        <AgreementVisual agreement={d.agreement} />

        <ModeratorEvidenceSynthesis />
        <ModeratorReflectionPrompt />
        <EvidenceReviewQueue />
        <HistoricalOutcomes />

        <section>
          <h2 className="text-lg font-semibold">Aggregated note themes</h2>
          <p className="text-sm text-muted-foreground">Keyword-based theme counts from synthetic notes, not verified evidence or individual claims. Not shown publicly.</p>
          <ul className="mt-3 grid gap-3 md:grid-cols-3">
            {d.evidenceGaps.length === 0 && <li className="text-muted-foreground">No notes submitted.</li>}
            {d.evidenceGaps.map((g) => (
              <li key={g.id} className="rounded-lg border bg-card p-4">
                <span className="rounded bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber-foreground">Unverified keyword theme</span>
                <p className="mt-2 text-sm">{g.claim}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section id="human-checkpoints" className="rounded-lg border bg-card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-deep">Human oversight</p>
          <h2 className="text-lg font-semibold">Moderator action queue</h2>
          <p className="text-sm font-medium text-heading" role="status">
            {!full ? "Next: collect remaining independent forecasts" : !c.feedbackReleased ? "Next: review evidence and release group feedback" : !c.publicSnapshotApproved ? "Next: approve the public snapshot when ready" : "Snapshot published; future outcome review remains external"}
          </p>
          <div className="space-y-3 border-t pt-3">
            <HumanCheckpoint number={1} title="Review source evidence" state="review" detail="Source inspection available; approval is not recorded by the demo." />
            <HumanCheckpoint number={2} title="Validate consultation definition" state="configured" detail="Proposed six-month event preloaded; formal launch approval not implemented." />
            <HumanCheckpoint number={3} title="Release Delphi group feedback" state={c.feedbackReleased ? "complete" : "pending"} detail="Protected by moderator-only release action." />
            <HumanCheckpoint number={4} title="Approve public summary" state={c.publicSnapshotApproved ? "complete" : "pending"} detail="Frozen aggregate requires explicit moderator approval." />
            <HumanCheckpoint number={5} title="Verify eventual outcome" state="later" detail={`After ${c.question.resolutionDate}; adjudication/scoring is not automated here.`} />
          </div>
          {!full && <p className="text-sm text-muted-foreground">To finish the panel, submit the fifth synthetic contribution from the Expert view (FIELD-05), then refresh this dashboard.</p>}
          <ConfirmAction label={c.feedbackReleased ? "Feedback released" : "Release group feedback"} disabled={c.feedbackReleased || c.submittedCount < c.panelSize}
            title="Release group feedback?" description="Experts will see a coarse, rounded summary of the panel and may revise once."
            confirmLabel="Release" onConfirm={() => run(api.releaseFeedback, "Group feedback released", refresh)} />
          <ConfirmAction label={c.publicSnapshotApproved ? "Snapshot approved" : "Approve public snapshot"} disabled={c.publicSnapshotApproved || !full || !c.feedbackReleased}
            title="Approve the final panel view?" description="Approval freezes the full-panel median band: revised forecasts are included when present, and unchanged forecasts carry forward. Further revisions close. No individual forecasts or notes are published."
            confirmLabel="Approve" onConfirm={() => run(api.publishSnapshot, "Public snapshot approved", refresh)} />
          {!full && <p className="text-xs text-muted-foreground">Approval requires the full panel.</p>}
          <ConfirmAction variant="outline" label="Reset synthetic demo" title="Reset the demo?" description="All contributions, revisions and approvals return to the seeded 4/5 state."
            confirmLabel="Reset" onConfirm={() => run(api.resetDemo, "Demo reset", () => window.location.assign("/"))} />
        </section>
        <StatePanel title="Synthetic local demo controls">
          <p className="text-sm">These actions update the local SQLite demo, not any ACAPS production system.</p>
        </StatePanel>
      </aside>
    </div>
  );
}


/** Decision-oriented overview, careful not to equate ACAPS risk with observed severity. */
function ModeratorDecisionBrief({ consultation: c }: { consultation: ModeratorDashboard["consultation"] }) {
  return (
    <section aria-label="Moderator decision brief" className="rounded-lg border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal-deep">Moderator workspace · synthetic consultation</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-heading">Decision brief · {c.risk.id}</h1>
      <p className="mt-2 text-sm text-muted-foreground">See the current risk context and the future forecast separately. Neither is a funding decision or an official updated ACAPS assessment.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-heading"><ClipboardList className="h-4 w-4 text-teal-deep" aria-hidden /> Current context / observed conditions</div>
          <p className="mt-3 text-sm">Risk Radar record status: <strong>{c.risk.status}</strong></p>
          <p className="mt-2 text-sm">ACAPS qualitative risk level: <strong>{c.risk.acapsRiskLevel}</strong></p>
          <p className="mt-3 text-xs text-muted-foreground">Observed humanitarian severity is <strong>not independently scored</strong> in this screen. Risk level is a forward-looking risk classification, not a measurement of harm already experienced.</p>
        </div>
        <div className="rounded-lg border border-teal/30 bg-teal-soft/30 p-4">
          <p className="text-sm font-semibold text-heading">Future event · six-month forecast</p>
          <p className="mt-2 text-sm">{c.question.text}</p>
          <p className="mt-3 text-xs font-medium text-heading">Resolution deadline: {c.question.resolutionDate}</p>
          <p className="mt-1 text-xs text-muted-foreground">{c.question.disclaimer}</p>
        </div>
      </div>
      <details className="mt-4 rounded-md border bg-background px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-heading">How would an analyst resolve this forecast?</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {c.question.resolutionCriteria.map((rule, index) => <li key={index}>{rule}</li>)}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">No outcome is automatically verified or scored by this consultation.</p>
      </details>
      <nav aria-label="Moderator workspace sections" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a className="font-medium text-teal-deep underline underline-offset-2" href="#source-trace">Source trace</a>
        <a className="font-medium text-teal-deep underline underline-offset-2" href="#forecast-panel">Panel statistics</a>
        <a className="font-medium text-teal-deep underline underline-offset-2" href="#human-checkpoints">Human checkpoints</a>
      </nav>
    </section>
  );
}

const EVIDENCE_LABELS = [
  ["rationale", "Rationale"],
  ["vulnerability_and_coping", "Current vulnerability and coping capacity"],
  ["expected_impact", "Expected impact"],
  ["materialisation", "Reported hazard materialisation"],
] as const;

function ExternalSources({ sources }: { sources: RiskSourceReference[] }) {
  if (!sources.length) return <p className="text-xs text-muted-foreground">No source link supplied in this field.</p>;
  return (
    <ul className="mt-2 space-y-1">
      {sources.map((source, i) => {
        // This is an outbound reference supplied by the dataset, never proof of source quality.
        if (!/^https?:\/\//i.test(source.url)) return null;
        return (
          <li key={`${source.url}-${i}`}>
            <a href={source.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all text-xs font-medium text-teal-deep underline underline-offset-2">
              {source.label || source.url}<ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Read-only source trail from the existing moderator-only API. */
function ModeratorSourceTrace({ riskId }: { riskId: string }) {
  const q = useApi(() => api.getModeratorRiskContext(riskId));
  return (
    <section id="source-trace" aria-label="Moderator source trace" className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-teal-deep" aria-hidden />
        <h2 className="text-lg font-semibold">Trace the evidence</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Read-only ACAPS Risk Radar context for the moderator. Source links are references; SIGNAL has not independently checked them.</p>
      {q.status === "loading" && <p className="mt-3 text-sm text-muted-foreground">Loading source fields…</p>}
      {q.status === "error" && <p role="alert" className="mt-3 text-sm text-destructive">Source detail unavailable: {q.error.message}</p>}
      {q.status === "ok" && <SourceTraceDetails context={q.data} />}
    </section>
  );
}

function SourceTraceDetails({ context }: { context: ModeratorRiskContext }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-muted-foreground">Dataset origin: <span className="break-words font-medium text-heading">{context.source}</span> · Country: {context.country || "Not provided"}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {EVIDENCE_LABELS.map(([key, label]) => {
          const item = context.evidence[key];
          return (
            <details key={key} className="rounded-md border bg-background px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-heading">{label} · {item.sources.length} source link(s)</summary>
              <p className="mt-3 max-h-44 overflow-y-auto whitespace-pre-line break-words text-sm text-muted-foreground">{item.text || "No explanatory text supplied."}</p>
              <ExternalSources sources={item.sources} />
            </details>
          );
        })}
      </div>
      <details className="rounded-md border bg-background px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-heading">Trigger references · {context.triggers.length} structured trigger(s)</summary>
        <div className="mt-3 space-y-3">
          {context.triggers.length ? context.triggers.map((trigger, index) => (
            <div key={`${trigger.id || index}`} className="border-t pt-3 first:border-0 first:pt-0">
              <p className="text-sm font-medium text-heading">{trigger.id || `Trigger ${index + 1}`}: {trigger.title || "Untitled"}</p>
              <p className="mt-1 max-h-36 overflow-y-auto whitespace-pre-line break-words text-sm text-muted-foreground">{trigger.description || "No description supplied."}</p>
              <ExternalSources sources={trigger.sources} />
            </div>
          )) : <p className="text-sm text-muted-foreground">No structured triggers supplied. Review the original text in the risk card above.</p>}
        </div>
      </details>
      {context.missing_fields.length > 0 && <p className="rounded-md border border-amber/40 bg-amber-soft p-3 text-xs text-amber-foreground">Missing in source record: {context.missing_fields.join(", ")}. Do not infer absent information.</p>}
      <p className="text-xs text-muted-foreground">Moderator source review is not an approval or verification of accuracy. No external data is fetched automatically.</p>
    </div>
  );
}

/** Deterministic moderator-only verification suggestion, never automatically sent. */
function ModeratorEvidenceSynthesis() {
  const q = useApi(() => api.getModeratorSynthesis());
  const proposalId = q.status === "ok" ? q.data.proposed?.id : undefined;
  return (
    <section className="rounded-lg border bg-card p-5" aria-label="Moderator evidence synthesis">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal">Expert-to-analyst feedback loop</p>
      <h2 className="mt-1 text-lg font-semibold">Review a targeted follow-up</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        SIGNAL checks recurring keyword themes and suggests one question for human verification.
        No expert quotations, source verification claims, or automatic outreach.
      </p>
      {q.status === "loading" && <p className="mt-4 text-sm text-muted-foreground">Preparing synthesis…</p>}
      {q.status === "error" && <p role="alert" className="mt-4 text-sm text-destructive">{q.error.message}</p>}
      {q.status === "ok" && !q.data.available && <p className="mt-4 rounded-md bg-muted p-3 text-sm">{q.data.reason}</p>}
      {q.status === "ok" && q.data.available && q.data.proposed && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-heading">{q.data.disagreement_summary}</p>
          <p className="text-sm text-muted-foreground">{q.data.evidence_status}</p>
          <div className="rounded-md border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-deep">Suggested · {q.data.proposed.topic}</p>
            <p className="mt-2 text-sm font-medium text-heading">{q.data.proposed.question}</p>
          </div>
          {q.data.approved ? (
            <div className="rounded-md border border-green/30 bg-green/5 p-3 text-sm" role="status">
              Approved draft at {new Date(q.data.approved.approved_at).toLocaleString()}; not dispatched to any expert.
            </div>
          ) : (
            <ConfirmAction
              label="Approve draft for manual follow-up"
              title="Approve this verification question?"
              description="The chosen question is stored for a moderator to use manually. SIGNAL will not contact experts or publish this draft."
              confirmLabel="Approve draft"
              onConfirm={() => run(
                () => api.approveModeratorFollowup(proposalId ?? ""),
                "Follow-up draft approved; no message sent",
                q.refresh,
              )}
            />
          )}
          <p className="text-xs text-muted-foreground">{q.data.review_notice}</p>
        </div>
      )}
    </section>
  );
}


/** One curated editorial counterargument, visible only after moderator approval. */
function ModeratorReflectionPrompt() {
  const q = useApi(() => api.getModeratorCounterpoint());
  const [chosen, setChosen] = useState("attribution");
  return (
    <section className="rounded-lg border bg-card p-5" aria-label="Delphi reflection review">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal-deep">Delphi reflection · human moderation</p>
      <h2 className="mt-1 text-lg font-semibold">Choose an expert counterpoint</h2>
      <p className="mt-2 text-sm text-muted-foreground">These are fixed editorial questions, not AI conclusions, other experts' remarks or verified evidence. One approved prompt is shown with released feedback; it is never public.</p>
      {q.status === "loading" && <p className="mt-3 text-sm text-muted-foreground">Loading review options…</p>}
      {q.status === "error" && <p role="alert" className="mt-3 text-sm text-destructive">{q.error.message}</p>}
      {q.status === "ok" && !q.data.available && <p className="mt-3 rounded-md bg-muted p-3 text-sm">{q.data.reason}</p>}
      {q.status === "ok" && q.data.available && (
        <div className="mt-4 space-y-3">
          <fieldset disabled={!!q.data.approved_id} className="space-y-2">
            <legend className="text-sm font-medium text-heading">Reflection prompt for round two</legend>
            {q.data.options.map((o) => (
              <label key={o.id} className={`mt-2 flex cursor-pointer gap-3 rounded-md border p-3 ${chosen === o.id ? "border-primary bg-teal-soft" : "bg-background"}`}>
                <input type="radio" name="counterpoint" value={o.id} checked={(q.data.approved_id || chosen) === o.id}
                  onChange={() => setChosen(o.id)} className="mt-1 h-4 w-4 accent-primary" />
                <span className="text-sm"><strong className="block text-heading">{o.title}</strong><span className="mt-1 block text-muted-foreground">{o.text}</span></span>
              </label>
            ))}
          </fieldset>
          {q.data.approved_id ? (
            <p className="rounded-md bg-teal-soft p-3 text-sm text-accent-foreground" role="status">Approved and available to submitted experts with released feedback. This prompt cannot be changed without resetting the demo.</p>
          ) : (
            <ConfirmAction label="Approve reflection for experts" title="Release this editorial counterpoint?"
              description="Only a fixed question will appear in the expert feedback view; no raw notes, individual forecasts or identities are released. This cannot be changed without resetting the demo."
              confirmLabel="Approve prompt" onConfirm={() => run(
                () => api.approveModeratorCounterpoint(chosen),
                "Reflection approved for experts", q.refresh,
              )} />
          )}
          <p className="text-xs text-muted-foreground">{q.data.notice}</p>
        </div>
      )}
    </section>
  );
}

/** Historical selected-risk frequencies, NOT forecast calibration. Moderator only. */
function HistoricalOutcomes() {
  const h = useApi(() => api.getHistoricalEvaluation());
  return (
    <section className="rounded-lg border bg-card p-5" aria-label="Historical ACAPS risk outcomes">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">Methodology transparency</p>
          <h2 className="mt-1 text-lg font-semibold">Historical ACAPS risk outcomes</h2>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Descriptive · not calibration</span>
      </div>
      {h.status === "loading" && <p className="mt-3 text-sm text-muted-foreground">Loading historical outcomes…</p>}
      {h.status === "error" && <p role="alert" className="mt-3 text-sm text-destructive">Historical analysis unavailable: {h.error.message}</p>}
      {h.status === "ok" && !h.data.available && (
        <p className="mt-3 text-sm text-muted-foreground">{h.data.reason || "The official CSV is not available."}</p>
      )}
      {h.status === "ok" && h.data.available && h.data.totals && (
        <>
          <p className="mt-3 text-sm text-muted-foreground">{h.data.totals.total} selected risk records · {h.data.totals.resolved} resolved · {h.data.totals.active} active · {h.data.totals.unknown_status} missing or unrecognized outcome.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Resolved historical ACAPS risk records by overall risk level. Small samples are suppressed.</caption>
              <thead><tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">Risk level</th>
                <th scope="col" className="py-2 pr-3 font-medium">Resolved</th>
                <th scope="col" className="py-2 pr-3 font-medium">Materialised</th>
                <th scope="col" className="py-2 font-medium">Observed rate</th>
              </tr></thead>
              <tbody>
                {(h.data.by_risk_level ?? []).map((r) => (
                  <tr key={r.level} className="border-b last:border-0">
                    <th scope="row" className="py-3 pr-3 text-left font-medium text-heading">{r.level}</th>
                    <td className="py-3 pr-3">{r.resolved}</td>
                    <td className="py-3 pr-3">{r.materialised}</td>
                    <td className="min-w-[155px] py-3">
                      {r.rate_displayable && r.observed_materialisation_pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 min-w-14 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                            <div className="h-full rounded-full bg-teal" style={{ width: `${r.observed_materialisation_pct}%` }} />
                          </div>
                          <span className="w-14 text-right tabular-nums">{r.observed_materialisation_pct}%</span>
                        </div>
                      ) : <span className="text-muted-foreground">{r.resolved === 0 ? "No resolved records" : "Small sample (n < 10)"}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Source: {h.data.source}. Resolved records are used as denominators; active and unknown outcomes are excluded. Risk levels incorporate impact, not just probability.</p>
          <details className="mt-3 rounded-md border px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium text-heading">Methodology and limitations</summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
              {(h.data.limitations ?? []).map((caveat) => <li key={caveat}>{caveat}</li>)}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{h.data.brier_evaluation}</p>
            <p className="mt-1 text-xs text-muted-foreground">Documented matrix: {h.data.risk_matrix_version}</p>
          </details>
        </>
      )}
    </section>
  );
}

const fmt = (n: number) => `${Math.round(n * 10) / 10}`;
function StatRow({ label, s }: { label: string; s: PanelStats }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 text-heading">{label}</td>
      <td className="py-2 pr-4">{s.n}</td>
      <td className="py-2 pr-4 font-medium text-heading">{fmt(s.median)}%</td>
      <td className="py-2 pr-4">{s.iqr == null ? "N/A" : `${fmt(s.iqr)} pp` }</td>
      <td className="py-2 pr-4">{s.mad == null ? "N/A" : fmt(s.mad)}</td>
      <td className="py-2 pr-4">{s.min}–{s.max}%</td>
    </tr>
  );
}

type CheckpointState = "complete" | "pending" | "configured" | "review" | "later";
function HumanCheckpoint({ number, title, state, detail }: {
  number: number; title: string; state: CheckpointState; detail: string;
}) {
  const label: Record<CheckpointState, string> = {
    complete: "Approved", pending: "Pending", configured: "Demo only", review: "Not tracked", later: "Future",
  };
  return (
    <div className="rounded-md border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-heading">{number}. {title}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${state === "complete" ? "bg-teal-soft text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{label[state]}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
