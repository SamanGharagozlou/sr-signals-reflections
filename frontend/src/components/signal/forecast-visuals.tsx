import { ArrowDownRight, ArrowRight, ArrowUpRight, ChartNoAxesCombined, EyeOff, ShieldCheck, Users } from "lucide-react";
import type { PanelStats, RiskAssessment } from "@/lib/api/types";
import { assessmentRows, boundedProbability, medianMovement, rangeLabel, roundDescription } from "@/lib/moderator-visual-model";

const left = 123;
const width = 512;
const px = (probability: number) => left + width * boundedProbability(probability) / 100;

function PanelRange({ stats, y, color, label }: { stats: PanelStats; y: number; color: string; label: string }) {
  const low = px(stats.min);
  const high = px(stats.max);
  const center = px(stats.median);
  return (
    <g>
      <text x="6" y={y + 5} fill="currentColor" fontSize="12" fontWeight="600">{label}</text>
      <line x1={low} x2={high} y1={y} y2={y} stroke={color} strokeWidth="7" strokeLinecap="round" opacity=".55" />
      <line x1={low} x2={low} y1={y - 10} y2={y + 10} stroke={color} strokeWidth="2" />
      <line x1={high} x2={high} y1={y - 10} y2={y + 10} stroke={color} strokeWidth="2" />
      <circle cx={center} cy={y} r="9" fill="#FFFFFF" stroke={color} strokeWidth="4" />
      <text x={Math.min(625, Math.max(133, center))} y={y - 17} textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>{stats.median}%</text>
    </g>
  );
}

/** Backend-safe, aggregate-only forecast visualization. Never draws individual estimates. */
export function ForecastVisuals({ first, second, revisers }: {
  first: PanelStats | null;
  second: PanelStats | null;
  revisers: number;
}) {
  const latest = second ?? first;
  const move = medianMovement(first, second);
  return (
    <section className="gt-intelligence-panel" aria-label="Aggregate forecast visualizations">
      <div className="gt-intelligence-lead">
        <div>
          <div className="gt-intelligence-eyebrow"><ChartNoAxesCombined className="h-4 w-4" aria-hidden /> PANEL OUTLOOK / MODERATOR ONLY</div>
          <h3>What the experts are signaling</h3>
          <p>Independent six-month event judgments, summarized without individual responses.</p>
        </div>
        <span className="gt-intelligence-private"><EyeOff className="h-3.5 w-3.5" aria-hidden /> Restricted view</span>
      </div>
      {!first ? (
        <div className="gt-intelligence-empty">No forecasts have been submitted. The visualization will populate from actual panel statistics.</div>
      ) : (
        <>
          <div className="gt-intelligence-kpis">
            <div><span>Round 1 median</span><strong>{first.median}%</strong><small>{first.n} contributions</small></div>
            <div><span>{second ? "Current round median" : "Current panel range"}</span><strong>{second ? `${second.median}%` : rangeLabel(first)}</strong><small>{second ? `Round 2 · ${revisers} revised` : "Minimum–maximum"}</small></div>
            <div><span>Current IQR</span><strong>{latest?.iqr == null ? "—" : `${latest.iqr} pp`}</strong><small>Width of the middle half; not a confidence interval</small></div>
            <div><span>Round-to-round movement</span><strong className="flex items-center gap-1">
              {move == null ? <><ArrowRight className="h-5 w-5" aria-hidden /> Pending</> : move > 0 ? <><ArrowUpRight className="h-5 w-5" aria-hidden /> +{move} pp</> : move < 0 ? <><ArrowDownRight className="h-5 w-5" aria-hidden /> {move} pp</> : <><ArrowRight className="h-5 w-5" aria-hidden /> 0 pp</>}
            </strong><small>Median change; not evidence of improved accuracy</small></div>
          </div>
          <div className="gt-intelligence-chart">
            <div className="gt-intelligence-chart-label"><strong>Where the panel sits</strong><span>0–100% probability scale</span></div>
            <svg viewBox="0 0 664 218" width="100%" role="img" aria-label={`Aggregate median and min–max range by round. ${roundDescription(first)} ${second ? roundDescription(second) : "Second round not yet available."}`}>
              <title>Panel medians and minimum–maximum ranges</title>
              {[0,20,40,60,80,100].map((tick) => (
                <g key={tick}>
                  <line x1={px(tick)} y1="29" x2={px(tick)} y2="180" stroke="#DDE1E4" strokeWidth="1" />
                  <text x={px(tick)} y="203" textAnchor="middle" fill="#5A6470" fontSize="11">{tick}%</text>
                </g>
              ))}
              <PanelRange stats={first} y={78} color="#00809C" label="Round 1" />
              {second ? <PanelRange stats={second} y={146} color="#B4570B" label="Round 2" /> : (
                <text x="9" y="150" fontSize="12" fill="#5A6470">Round 2</text>
              )}
              {!second && <text x="123" y="150" fill="#5A6470" fontSize="12" fontStyle="italic">Available after feedback and revision</text>}
            </svg>
            <div className="gt-intelligence-legend">
              <span><i className="gt-legend-range" /> Minimum–maximum panel range</span>
              <span><i className="gt-legend-median" /> Median</span>
            </div>
          </div>
          <div className="gt-intelligence-disclaimer"><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden /> This is an aggregate of a small synthetic expert panel, not a calibrated model forecast. The chart does not identify individual experts, and does not claim a published round.</div>
        </>
      )}
    </section>
  );
}

export function AgreementVisual({ agreement }: { agreement: Record<RiskAssessment, number> }) {
  const rows = assessmentRows(agreement);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <section className="gt-agreement-panel" aria-label="Expert assessment of the qualitative ACAPS rating">
      <div className="gt-intelligence-eyebrow"><Users className="h-4 w-4" aria-hidden /> ASSESSMENT / MODERATOR ONLY</div>
      <h3>How experts view the ACAPS rating</h3>
      <p>Expert perceptions of the existing qualitative assessment, separate from their numerical six-month event forecasts.</p>
      {total === 0 ? <p className="mt-5 text-sm text-muted-foreground">No agreement responses available yet.</p> : (
        <>
          <div className="gt-agreement-stack" role="img" aria-label={rows.map((r) => `${r.title}: ${r.count} of ${total}`).join("; ")}>
            {rows.filter((r) => r.count > 0).map((r) => <span key={r.key} style={{ width: `${r.share}%`, backgroundColor: r.color }} />)}
          </div>
          <div className="gt-agreement-rows">
            {rows.map((r) => (
              <div key={r.key}>
                <span className="gt-agreement-dot" style={{ backgroundColor: r.color }} />
                <span>{r.title}</span>
                <strong>{r.count} / {total}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="gt-agreement-footnote">Counts represent panel opinions, not verified evidence that the ACAPS rating is right or wrong.</p>
    </section>
  );
}
