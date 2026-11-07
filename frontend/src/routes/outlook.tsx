import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, ArrowRight, BadgeCheck, BookOpenText, ChartNoAxesCombined, ChevronRight, FlaskConical, Info, RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { AppHeader } from "@/components/signal/ui";
import { InformCrisisContext } from "@/components/signal/inform-crisis-context";
import { api, useApi } from "@/lib/api/client";
import { DEMO_EVENTS, OUTLOOK_WEEKS, outlookSeries, scenarioFinal, scenarioNarrative } from "@/lib/outlook-model";
import type { OutlookPoint } from "@/lib/outlook-model";

export const Route = createFileRoute("/outlook")({
  head: () => ({ meta: [{ title: "Illustrative Outlook & What-if — S&R" }, { name: "description", content: "Educational six-month scenario curves with transparent assumptions, distinct from approved Delphi forecasts." }] }),
  component: OutlookPage,
});

type View = "outlook" | "what-if" | "partner";
const VIEWS: { id: View; label: string }[] = [
  { id: "outlook", label: "Outlook" }, { id: "what-if", label: "What-if" }, { id: "partner", label: "Partner brief" },
];
const format = (x: number) => `${Math.round(x)}%`;

function OutlookPage() {
  const [view, setView] = useState<View>("outlook");
  const [selected, setSelected] = useState(0);
  const [base, setBase] = useState<number>(DEMO_EVENTS[0].base);
  const [shift, setShift] = useState(0);
  const [sensitivity, setSensitivity] = useState(15);
  const points = useMemo(() => outlookSeries(base, shift, sensitivity), [base, shift, sensitivity]);
  const final = scenarioFinal(base, shift);
  const event = DEMO_EVENTS[selected];
  const reset = () => { setBase(event.base); setShift(0); setSensitivity(15); };
  const choose = (index: number) => { setSelected(index); setBase(DEMO_EVENTS[index].base); setShift(0); setSensitivity(15); };
  return <div className="min-h-screen bg-[#f2f5f6]">
    <AppHeader section="Scenario Lab" />
    <div className="gt-outlook-warning" role="note"><FlaskConical size={17} aria-hidden/> Educational scenario model with invented numerical inputs. No calibrated ACAPS predictions, simulations or real confidence intervals.</div>
    <main className="gt-outlook-shell">
      <header className="gt-outlook-top">
        <div><p className="gt-outlook-eyebrow">S&R / FORWARD LOOKING INTELLIGENCE / CHAD DEMONSTRATION</p><h1>Explore how assumptions <em>shape an outlook.</em></h1><p>Six-month illustrative scenarios beside source risk intelligence. Analyst judgment and moderator approval remain separate from this educational model.</p></div>
        <div className="gt-outlook-toplinks"><Link to="/explore">Risk Explorer <ArrowRight size={15}/></Link><Link to="/moderator">Moderator <ArrowRight size={15}/></Link></div>
      </header>
      <nav className="gt-outlook-tabs" aria-label="Outlook views">
        {VIEWS.map(v => <button key={v.id} type="button" onClick={() => setView(v.id)} aria-current={view === v.id ? "page" : undefined} className={view === v.id ? "active" : ""}>{v.label}</button>)}
      </nav>
      {view === "partner" ? <PartnerBrief /> : <div className="gt-outlook-grid">
        <aside className="gt-outlook-sidebar" aria-label="Illustrative scenario selection">
          <p className="gt-outlook-mini">01 / EXPLORE SYNTHETIC EVENTS</p><h2>CHAD</h2><span className="gt-outlook-sub">Choose an illustrative example, not a live country forecast.</span>
          <div className="gt-outlook-event-list">
            {DEMO_EVENTS.map((v, i) => <button key={v.id} type="button" className={selected === i ? "active" : ""} aria-pressed={selected === i} onClick={() => choose(i)}><strong>{v.title}</strong><small>{v.subtitle}</small><span>Hypothetical 26-week input <b>{v.base}%</b></span><ChevronRight size={17} aria-hidden/></button>)}
          </div>
          <div className="gt-outlook-side-foot"><ShieldCheck size={18} aria-hidden/><p>These examples are not extracted forecasts. Only the first is thematically linked to ACAPS R1043; no individual expert submissions are used.</p></div>
          <Link className="gt-outlook-side-link" to="/risk-index">See official source risk records <ArrowRight size={15}/></Link>
        </aside>
        <section className="gt-outlook-mainpanel">
          <div className="gt-outlook-panelhead"><div><p className="gt-outlook-mini">02 / {view === "what-if" ? "ASSUMPTION SENSITIVITY" : "EDUCATIONAL OUTLOOK"}</p><h2>{event.title}</h2><p>Chance the hypothetical event has occurred by each week, assuming a constant weekly hazard.</p></div><span className="gt-outlook-pill">Synthetic · 26 weeks</span></div>
          <div className="gt-outlook-metrics">
            <Metric name="Assumed 26-week probability" value={format(base)} description="User-controlled, invented input"/>
            <Metric name="What-if endpoint" value={format(final)} description="After your hypothetical change"/>
            <Metric name="Sensitivity endpoints" value={`${format(Math.max(0, final - sensitivity))}–${format(Math.min(100, final + sensitivity))}`} description="Not a confidence interval"/>
          </div>
          <OutlookChart points={points}/>
          <div className="gt-outlook-legend"><span><i className="gt-outlook-l-base"/> Unchanged input</span><span><i className="gt-outlook-l-shift"/> Adjusted scenario</span><span><i className="gt-outlook-l-band"/> Assumption sensitivity, not confidence</span></div>
          {view === "what-if" ? <section className="gt-outlook-controls" aria-label="Adjust hypothetical scenario inputs">
            <div className="gt-outlook-controls-title"><SlidersHorizontal size={19}/><h3>What if our assumptions changed?</h3><button type="button" onClick={reset}><RotateCcw size={14}/> Reset</button></div>
            <RangeInput label="Assumed chance by week 26" detail="An input for this demonstration, not a model estimate" value={base} min={0} max={100} step={5} onChange={setBase} suffix="%" />
            <RangeInput label="Hypothetical increase / decrease" detail="Sensitivity in percentage points, not an evidence-based trigger effect" value={shift} min={-30} max={30} step={5} onChange={setShift} suffix=" pp" />
            <RangeInput label="Scenario uncertainty width" detail="Illustrative alternative endpoints, not statistical confidence" value={sensitivity} min={0} max={30} step={5} onChange={setSensitivity} suffix=" pp" />
            <p className="gt-outlook-explainer"><Info size={17}/>{scenarioNarrative(base, shift)}</p>
          </section> : <div className="gt-outlook-whatif-link"><div><h3>Want to challenge the assumptions?</h3><p>Move hypothetical probabilities and inspect how the displayed path changes.</p></div><button type="button" onClick={() => setView("what-if")}>Open What-if <ArrowRight size={17}/></button></div>}
          <div className="gt-outlook-method"><BookOpenText size={18}/><p><strong>Methodology:</strong> We transform a user-selected 26-week probability into a weekly cumulative occurrence curve using a constant hazard assumption: P(event by week t) = 1 − (1 − p26)^(t/26). The shaded envelope is a ±{sensitivity} percentage-point sensitivity range at week 26—not a statistically estimated credible or confidence interval. No 4,000-path Monte Carlo model is running.</p></div>
        </section>
      </div>}
      {view !== "partner" && <section className="gt-outlook-sources"><div><Activity size={18}/><h2>Current conditions and source context</h2></div><p>Official INFORM severity describes existing crises; ACAPS Risk Radar describes qualitative future risks. Neither is substituted into the illustrative curve above.</p><InformCrisisContext country="Chad"/></section>}
      <footer className="gt-outlook-footer"><span><ShieldCheck size={16}/> Human approvals, not automated operational decisions.</span><Link to="/public">See approved Delphi summary <ArrowRight size={15}/></Link></footer>
    </main>
  </div>;
}

function Metric({ name, value, description }: { name: string; value: string; description: string }) {
  return <div className="gt-outlook-metric"><span>{name}</span><strong>{value}</strong><small>{description}</small></div>;
}
function RangeInput({ label, detail, value, min, max, step, onChange, suffix }: { label: string; detail: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; suffix: string }) {
  return <label className="gt-outlook-range"><span><strong>{label}</strong><b>{value > 0 && suffix.trim() === "pp" ? "+" : ""}{value}{suffix}</b></span><small>{detail}</small><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/><span className="gt-outlook-endpoints"><small>{min}{suffix}</small><small>{max}{suffix}</small></span></label>;
}

const xPos = (week: number) => 58 + (week / OUTLOOK_WEEKS) * 696;
const yPos = (percent: number) => 306 - percent * 2.52;
const linePath = (points: OutlookPoint[], key: "baseline" | "adjusted") => points.map((v, i) => `${i ? "L" : "M"}${xPos(v.week).toFixed(2)},${yPos(v[key]).toFixed(2)}`).join(" ");
const bandPath = (points: OutlookPoint[]) => [
  ...points.map((v, i) => `${i ? "L" : "M"}${xPos(v.week).toFixed(2)},${yPos(v.upper).toFixed(2)}`),
  ...[...points].reverse().map(v => `L${xPos(v.week).toFixed(2)},${yPos(v.lower).toFixed(2)}`),
  "Z",
].join(" ");
function OutlookChart({ points }: { points: OutlookPoint[] }) {
  const end = points[points.length - 1];
  return <figure className="gt-outlook-chart" aria-label={`Illustrative cumulative event probability. Week 26 adjusted ${format(end.adjusted)}; sensitivity endpoints ${format(end.lower)} to ${format(end.upper)}.`}>
    <svg viewBox="0 0 800 366" role="img" aria-labelledby="gt-outlook-graph-title gt-outlook-graph-desc" preserveAspectRatio="xMidYMid meet">
      <title id="gt-outlook-graph-title">Cumulative occurrence under hypothetical constant weekly hazard</title>
      <desc id="gt-outlook-graph-desc">No empirical prediction. A dashed unchanged-input line, a solid adjusted scenario line and a sensitivity area. Values are for an illustrative 26-week period.</desc>
      {[0,25,50,75,100].map(p=><g key={p}><line x1="58" x2="754" y1={yPos(p)} y2={yPos(p)} stroke="#dae5e9" strokeWidth="1"/><text x="43" y={yPos(p)+4} textAnchor="end" fill="#657d8b" fontSize="12">{p}%</text></g>)}
      {[0,6,13,19,26].map(w=><text key={w} x={xPos(w)} y="340" textAnchor="middle" fill="#657d8b" fontSize="12">{w === 0 ? "Today" : `Week ${w}`}</text>)}
      <path d={bandPath(points)} fill="#9fd3e2" fillOpacity=".55"/>
      <path d={linePath(points,"baseline")} fill="none" stroke="#7796a5" strokeWidth="2.5" strokeDasharray="7 6"/>
      <path d={linePath(points,"adjusted")} fill="none" stroke="#00738C" strokeWidth="3.5" strokeLinejoin="round"/>
      <circle cx={xPos(26)} cy={yPos(end.adjusted)} r="6" fill="#00738C" stroke="white" strokeWidth="2"/>
      <text x="754" y={Math.max(16,yPos(end.adjusted)-17)} textAnchor="end" fontSize="14" fontWeight="700" fill="#07516B">{format(end.adjusted)}</text>
    </svg>
    <figcaption>Illustrative cumulative likelihood by week · 26-week endpoint from a user-defined hypothetical input</figcaption>
  </figure>;
}

function PartnerBrief() {
  const publicSummary = useApi(() => api.getPublicSummary());
  const inventory = useApi(() => api.getRiskInventory());
  const r1043 = inventory.status === "ok" ? inventory.data.risks.find(v => v.id === "R1043") : null;
  return <section className="gt-outlook-brief">
    <div className="gt-outlook-brief-head"><div><p className="gt-outlook-mini">03 / PRIVACY-SAFE DECISION BRIEF</p><h2>What the evidence supports.</h2><p>For partners, not an automated operational or funding recommendation.</p></div><BadgeCheck size={28}/></div>
    <div className="gt-outlook-brief-grid">
      <div className="gt-outlook-brief-card"><span>Source Risk Radar · R1043</span><strong>{r1043?.level || "Unconfirmed"}</strong><small>{r1043?.title || "Load the local Risk Radar inventory to view the source assessment."}</small><Link to="/explore">Inspect source risk <ArrowRight size={14}/></Link></div>
      <div className="gt-outlook-brief-card"><span>Official INFORM Severity · Chad</span><strong>Separate crisis context</strong><small>Real current-crisis severity is not the probability of the forecast event. See matched crisis entries below.</small></div>
      <div className="gt-outlook-brief-card gt-outlook-approved"><span>Six-month expert Delphi summary</span>
        {publicSummary.status === "loading" && <strong>Checking approval…</strong>}
        {publicSummary.status === "error" && <><strong>Unavailable</strong><small>Could not read the public summary.</small></>}
        {publicSummary.status === "ok" && (publicSummary.data.approved ? <><strong>{publicSummary.data.medianBand || "Approved"}</strong><small>Moderator-approved synthetic panel aggregate · {publicSummary.data.forecastRound === "revised_panel" ? "Revised panel" : "Initial panel"}. Individual contributions are not shown.</small></> : <><strong>Not approved</strong><small>The moderator has not released a public forecast. No probability is shown.</small></>)}
        <Link to="/public">Open approved report <ArrowRight size={14}/></Link>
      </div>
    </div>
    <div className="gt-outlook-brief-note"><ShieldCheck size={20}/><div><h3>Recommended use: review, not automatic action</h3><p>Compare current conditions, the qualitative risk assessment and any approved Delphi event forecast. Monitor evidence gaps and consult local experts before preparedness or budget decisions. This panel does not endorse a particular response.</p></div></div>
    <InformCrisisContext country="Chad"/>
    <div className="gt-outlook-brief-bottom"><Link to="/moderator">Moderator workspace <ArrowRight size={15}/></Link><Link to="/analysis">Source portfolio analysis <ChartNoAxesCombined size={15}/></Link></div>
  </section>;
}
