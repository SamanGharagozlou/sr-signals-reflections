import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, ConfirmAction, DeniedState, ErrorState, Loading, RiskSummary, StatePanel } from "@/components/signal/ui";
import { Button } from "@/components/ui/button";
import { api, useApi } from "@/lib/api/client";
import type { ModeratorDashboard, PanelStats, RiskAssessment } from "@/lib/api/types";

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
        <RiskSummary risk={c.risk} />
        <HistoricalOutcomes />
        <ModeratorEvidenceSynthesis />
        <ModeratorReflectionPrompt />

        <section className="rounded-lg border bg-card p-5">
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

          {!d.firstRound ? (
            <p className="mt-6 text-muted-foreground">No forecasts yet.</p>
          ) : (
            <>
              <div className="mt-6 overflow-x-auto">
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
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Individual forecast points are intentionally withheld by the real backend. The statistics above describe the panel only.</p>
                {d.secondRound && <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Second-round values are summarized without exposing individual estimates.</p>}
              </div>
              <p className="mt-5 rounded-md bg-amber-soft p-3 text-sm text-amber-foreground">
                With {d.firstRound.n} experts these figures describe a small panel's views. They are not a calibrated crisis prediction and do not replace the ACAPS qualitative rating.
              </p>
            </>
          )}
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="text-lg font-semibold">Is the ACAPS rating…</h2>
          <Agreement a={d.agreement} />
        </section>

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
        <section className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Workflow</h2>
          <Status label="Group feedback" done={c.feedbackReleased} />
          <Status label="Public snapshot" done={c.publicSnapshotApproved} />
          {!full && <p className="text-sm text-muted-foreground">To finish the panel, submit the fifth synthetic contribution from the Expert view (FIELD-05), then refresh this dashboard.</p>}
          <ConfirmAction label={c.feedbackReleased ? "Feedback released" : "Release group feedback"} disabled={c.feedbackReleased || c.submittedCount < c.panelSize}
            title="Release group feedback?" description="Experts will see a coarse, rounded summary of the panel and may revise once."
            confirmLabel="Release" onConfirm={() => run(api.releaseFeedback, "Group feedback released", refresh)} />
          <ConfirmAction label={c.publicSnapshotApproved ? "Snapshot approved" : "Approve public snapshot"} disabled={c.publicSnapshotApproved || !full || !c.feedbackReleased}
            title="Approve privacy-safe public snapshot?" description="A frozen, coarse median band becomes visible on the public summary. No individual forecasts or notes are included."
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

function Agreement({ a }: { a: Record<RiskAssessment, number> }) {
  const total = Object.values(a).reduce((x, y) => x + y, 0) || 1;
  const rows: [RiskAssessment, string][] = [["underestimated", "Underestimated"], ["about_right", "About right"], ["overestimated", "Overestimated"]];
  return (
    <ul className="mt-3 space-y-2">
      {rows.map(([k, l]) => (
        <li key={k} className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-sm">
          <span>{l}</span>
          <span className="h-2.5 rounded-full bg-muted"><span className="block h-full rounded-full bg-teal" style={{ width: `${(a[k] / total) * 100}%` }} /></span>
          <span className="text-right font-medium text-heading">{a[k]}</span>
        </li>
      ))}
    </ul>
  );
}

function Status({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${done ? "bg-teal-soft text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{done ? "Done" : "Pending"}</span>
    </div>
  );
}
