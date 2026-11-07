import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity, ArrowRight, CalendarClock, CheckCircle2, CircleHelp,
  Eye, EyeOff, FileSearch, Globe2, Lock, MapPinned, ShieldCheck,
} from "lucide-react";
import { AppHeader, ErrorState, Loading } from "@/components/signal/ui";
import { InformCrisisContext } from "@/components/signal/inform-crisis-context";
import { api, useApi } from "@/lib/api/client";
import { COUNTRY_OUTLINES } from "@/lib/geo/country-paths";
import { mapProvinceGeojson, type ProvinceMap } from "@/lib/geo/chad-provinces";
import type { PublicSummary, RiskDetail, SituationRoomAnalyst } from "@/lib/api/types";

export const Route = createFileRoute("/situation-room")({
  head: () => ({ meta: [{ title: "Situation Room — SIGNAL Ground Truth" }, {
    name: "description", content: "Source-grounded humanitarian context and moderator-approved synthetic expert forecasting, with distinct analyst and public permissions.",
  }] }),
  component: SituationRoomPage,
});

type View = "analyst" | "public";
const CHAD = COUNTRY_OUTLINES.find((c) => c.iso === "TCD");

function SituationRoomPage() {
  const [view, setView] = useState<View>("public");
  return <div className="min-h-screen bg-[#f0f4f5]">
    <AppHeader section="Situation room" />
    <main className="mx-auto max-w-[1540px] px-4 pb-16 pt-7 sm:px-7">
      <div className="gt-room-head">
        <div>
          <div className="gt-room-eyebrow">SIGNAL / GROUND TRUTH · EASTERN CHAD / R1043</div>
          <h1>One risk. Two levels of access.</h1>
          <p>Humanitarian context, independent expert forecasting and human approval—without confusing official data with synthetic opinions.</p>
        </div>
        <div className="gt-room-switch" role="group" aria-label="Situation room view">
          <button type="button" onClick={() => setView("analyst")} aria-pressed={view === "analyst"} className={view === "analyst" ? "active" : ""}><Lock size={15}/> Analyst</button>
          <button type="button" onClick={() => setView("public")} aria-pressed={view === "public"} className={view === "public" ? "active" : ""}><Eye size={15}/> Public</button>
        </div>
      </div>
      <div role="note" className="gt-room-notice"><ShieldCheck size={17}/> Synthetic expert consultation. ACAPS Risk Radar and INFORM Severity are independent sources. No automated severity model, real expert notes, geolocated expert identities or verified weekly forecast are claimed.</div>
      {view === "analyst" ? <AnalystRoom /> : <PublicRoom />}
    </main>
  </div>;
}

function AnalystRoom() {
  const [signedIn, setSignedIn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  if (!signedIn) return <div className="gt-room-login">
    <Lock size={30}/><h2>Restricted analyst workspace</h2>
    <p>The analyst read model is protected by a server-side moderator role check. It contains synthetic panel aggregates and full Risk Radar source context, but no individual expert notes or identities.</p>
    {loginError && <p role="alert" className="text-red-700">{loginError}</p>}
    <button type="button" disabled={signingIn} onClick={async () => {
      setSigningIn(true); setLoginError("");
      try { await api.login("moderator"); setSignedIn(true); }
      catch (e) { setLoginError(e instanceof Error ? e.message : "Could not sign in."); }
      finally { setSigningIn(false); }
    }}>{signingIn ? "Signing in…" : "Enter local synthetic moderator demo"}<ArrowRight size={16}/></button>
    <p className="gt-room-fineprint">For local hackathon demonstrations only. The demo invitation code is not production authentication.</p>
  </div>;
  return <AuthorizedAnalystRoom />;
}

function AuthorizedAnalystRoom() {
  const q = useApi(() => api.getSituationRoomAnalyst());
  if (q.status === "loading") return <Loading label="Loading moderator-only situation room…"/>;
  if (q.status === "error") return <ErrorState error={q.error} onRetry={q.refresh}/>;
  const r = q.data;
  const s = r.panel;
  const final = s.revised_panel_median ?? s.round_one_median;
  return <>
    <div className="gt-room-grid">
      <aside className="gt-room-pane gt-room-side">
        <div className="gt-room-pane-head"><span>PRIMARY / SYNTHETIC PANEL</span><Lock size={14}/></div>
        <p className="gt-room-small">Moderator-only aggregate. The backend deliberately excludes raw responses, private locations and individual identifiers.</p>
        <div className="gt-room-stat"><span>Panel participation</span><strong>{s.count} <em>/ {s.expected}</em></strong><small>{s.ready ? "Full synthetic panel" : "Awaiting remaining synthetic response"}</small></div>
        <div className="gt-room-progress" aria-label={`${s.count} of ${s.expected} experts submitted`}><span style={{ width: `${Math.min(100,s.count / Math.max(1,s.expected) * 100)}%`}}/></div>
        <div className="gt-room-tile"><span>Round 1 median</span><strong>{s.round_one_median == null ? "—" : `${s.round_one_median}%`}</strong><small>Descriptive judgment, not calibrated</small></div>
        <div className="gt-room-tile"><span>Current panel median</span><strong>{final == null ? "—" : `${final}%`}</strong><small>{s.revised_count ? `Full panel · ${s.revised_count} revised` : "Initial panel; no revisions"}</small></div>
        <h3>Human review checkpoints</h3>
        <Checkpoint label="Panel completed" done={s.ready}/>
        <Checkpoint label="Group feedback released" done={s.feedback_released}/>
        <Checkpoint label="Final forecast approved" done={s.approved}/>
        <Link className="gt-room-link" to="/moderator">Open moderator controls <ArrowRight size={15}/></Link>
      </aside>
      <div className="gt-room-central">
        <RiskMapPanel risk={r.risk}/>
        <WorkflowTimeline panel={s}/>
      </div>
      <aside className="gt-room-pane gt-room-side">
        <div className="gt-room-pane-head"><span>SECONDARY / SOURCE TRACE</span><FileSearch size={15}/></div>
        <p className="gt-room-small">Official Risk Radar fields, not independently verified live reports.</p>
        <h3>Original assessment</h3>
        <dl className="gt-room-details"><div><dt>Risk</dt><dd>{r.risk.risk_level || "Not recorded"}</dd></div><div><dt>Probability class</dt><dd>{r.risk.probability_category || "Not recorded"}</dd></div><div><dt>Impact</dt><dd>{r.risk.impact || "Not recorded"}</dd></div><div><dt>Status</dt><dd>{r.risk.status || "Not recorded"}</dd></div></dl>
        <h3>Source text</h3>
        <p className="gt-room-source-text">{r.source_context.evidence.rationale?.text || r.risk.triggers || "No narrative rationale supplied in the loaded record."}</p>
        <p className="gt-room-small">{r.source_context.missing_fields.length ? `Missing source fields: ${r.source_context.missing_fields.join(", ")}` : "No missing fields detected by the current source-context reader."}</p>
        <Link className="gt-room-link" to="/risk-index">Full Risk Index <ArrowRight size={15}/></Link>
      </aside>
    </div>
    <CountryContext />
  </>;
}

function PublicRoom() {
  // This component requests ONLY public API endpoints. It never mounts analyst queries.
  const summary = useApi(() => api.getPublicSummary());
  const detail = useApi(() => api.getRiskDetail("R1043"));
  if (detail.status === "loading" || summary.status === "loading") return <Loading label="Loading public information…" />;
  if (detail.status === "error") return <ErrorState error={detail.error} onRetry={detail.refresh}/>;
  if (summary.status === "error") return <ErrorState error={summary.error} onRetry={summary.refresh}/>;
  const r = detail.data, d = summary.data;
  return <>
    <div className="gt-room-grid">
      <aside className="gt-room-pane gt-room-side">
        <div className="gt-room-pane-head"><span>PRIMARY / RELEASED RESULT</span><EyeOff size={15}/></div>
        <p className="gt-room-small">Individual contributions, comments, identities and revision activity are excluded from the public read model.</p>
        <div className="gt-room-public-result"><span>Six-month synthetic Delphi</span><strong>{d.approved ? d.medianBand : "Not published"}</strong><small>{d.approved ? `Approved ${d.forecastRound === "revised_panel" ? "revised" : "initial"} panel · ${d.panelN} members` : "Requires moderator approval before release"}</small></div>
        <p className="gt-room-fineprint">The band summarizes synthetic judgments. It is neither a calibrated forecast nor an ACAPS-endorsed probability.</p>
        <Link className="gt-room-link" to="/public">Approved public report <ArrowRight size={15}/></Link>
      </aside>
      <div className="gt-room-central">
        <RiskMapPanel risk={r}/>
        <PublicTimeline approved={d.approved} summary={d}/>
      </div>
      <aside className="gt-room-pane gt-room-side">
        <div className="gt-room-pane-head"><span>SECONDARY / PUBLIC RISK RECORD</span><Globe2 size={15}/></div>
        <p className="gt-room-small">Risk Radar source content. There is no live news feed or fabricated evidence stream.</p>
        <h3>{r.title}</h3>
        <dl className="gt-room-details"><div><dt>Qualitative risk</dt><dd>{r.risk_level || "Not recorded"}</dd></div><div><dt>Status</dt><dd>{r.status || "Not recorded"}</dd></div><div><dt>Country</dt><dd>{r.country || "Not recorded"}</dd></div></dl>
        <p className="gt-room-source-text">{r.triggers || "No trigger narrative supplied."}</p>
        <p className="gt-room-fineprint">Source references are provided as context and have not been independently validated by SIGNAL.</p>
        <Link className="gt-room-link" to="/explore">Risk Explorer <ArrowRight size={15}/></Link>
      </aside>
    </div>
    <CountryContext />
  </>;
}

function RiskMapPanel({ risk }: { risk: RiskDetail }) {
  const [provinceMap, setProvinceMap] = useState<ProvinceMap | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    // Optional local ADM1 GeoJSON. No network tile API, approximate points or invented province scores.
    fetch("/geo/tcd-adm1.geojson").then(r => r.ok ? r.json() : null)
      .then(data => { if (active) setProvinceMap(mapProvinceGeojson(data)); })
      .catch(() => { if (active) setProvinceMap(null); });
    return () => { active = false; };
  }, []);
  return <section className="gt-room-map" aria-label="Geographical risk context">
    <div className="gt-room-map-title"><div><span>CHAD / GEOGRAPHICAL CONTEXT</span><h2>Risk situation map</h2></div><span className="gt-room-map-tag">{provinceMap ? "Local ADM1 boundaries" : "Natural Earth · country boundary"}</span></div>
    <div className="gt-room-map-stage">
      {provinceMap ? <svg viewBox="0 0 1000 740" role="group" aria-label="Chad province boundaries from an optional locally supplied administrative dataset. Province shapes are not shaded by risk values." preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width="1000" height="740" fill="#eaf0f1"/>
        {provinceMap.shapes.map((p,i)=><path key={`${p.name}-${i}`} d={p.path} role="button" tabIndex={0} aria-label={`Select province ${p.name}`} aria-pressed={selectedProvince === p.name} onClick={()=>setSelectedProvince(p.name)} onKeyDown={e=>{if(e.key === "Enter" || e.key === " "){e.preventDefault();setSelectedProvince(p.name);}}} fill={selectedProvince === p.name ? "#00809C" : "#A8D4DF"} stroke="#fff" strokeWidth="2.6" className="cursor-pointer focus:outline-none focus:stroke-[#B4570B]" />)}
      </svg> : <svg viewBox="525 182 54 90" role="img" aria-label="Chad's national outline and adjacent countries from simplified Natural Earth data; no province-level scores or geolocated expert points" preserveAspectRatio="xMidYMid meet">
        <rect x="525" y="182" width="54" height="90" fill="#eaf0f1"/>
        {COUNTRY_OUTLINES.map((c) => <path key={c.iso} d={c.d} fill={c.iso === "TCD" ? "#70becf" : "#d6e1e5"} stroke="#fff" strokeWidth="0.65" strokeLinejoin="round" />)}
        {CHAD && <path d={CHAD.d} fill="#70becf" fillOpacity="0.2" stroke="#006b84" strokeWidth="1.4"/>}
        <text x="552" y="218" fontSize="3.4" fontWeight="700" textAnchor="middle" fill="#063f58">CHAD</text>
        <text x="552" y="224" fontSize="1.6" textAnchor="middle" fill="#0e5e72">Country-level overview</text>
      </svg>}
      <div className="gt-room-map-inset"><MapPinned size={18}/><span>{selectedProvince ? selectedProvince : "Eastern Chad / R1043"}</span><small>{selectedProvince ? "Boundary selected · no province risk score" : `${risk.risk_level || "Unclassified"} qualitative source risk`}</small></div>
    </div>
    <div className="gt-room-map-footer"><span>{provinceMap ? "ADM1 boundaries only; no verified province-level risk index or expert coordinates." : "Province map appears only if a verified local ADM1 GeoJSON is supplied. Current view uses national outlines."}</span><Link to="/explore">Explore full map <ArrowRight size={14}/></Link></div>
  </section>;
}

function Checkpoint({label,done}:{label:string;done:boolean}) {
  return <div className="gt-room-checkpoint">{done ? <CheckCircle2 size={16} color="#2E7D4F"/> : <CircleHelp size={16} color="#B4570B"/>}<span>{label}</span><small>{done ? "Complete" : "Pending"}</small></div>;
}

function WorkflowTimeline({panel}:{panel:SituationRoomAnalyst["panel"]}) {
  return <section className="gt-room-timeline" aria-label="Human forecast process">
    <div className="gt-room-timeline-head"><CalendarClock size={20}/><div><h2>Consultation checkpoints</h2><p>Live workflow stages, not a reconstructed history or a weekly risk time series.</p></div></div>
    <div className="gt-room-step-track">
      <Checkpoint label="Independent expert calls" done={panel.ready}/>
      <Checkpoint label="Group feedback" done={panel.feedback_released}/>
      <Checkpoint label="Moderator publication" done={panel.approved}/>
    </div>
    <div className="gt-room-chartstats"><div><span>Round 1 range</span><strong>{formatRange(panel.round_one_range)}</strong></div><div><span>Final panel range</span><strong>{formatRange(panel.revised_panel_range.length ? panel.revised_panel_range : panel.round_one_range)}</strong></div><div><span>Median change</span><strong>{panel.median_change_pp == null ? "Not revised" : `${panel.median_change_pp > 0 ? "+" : ""}${panel.median_change_pp} pp`}</strong></div></div>
  </section>;
}

function PublicTimeline({approved,summary}:{approved:boolean;summary:PublicSummary}) {
  return <section className="gt-room-timeline" aria-label="Public approval history">
    <div className="gt-room-timeline-head"><CalendarClock size={20}/><div><h2>Publication status</h2><p>Only public, moderator-approved facts are shown here.</p></div></div>
    <div className="gt-room-public-status">{approved ? <CheckCircle2 size={24} color="#2E7D4F"/> : <CircleHelp size={24} color="#B4570B"/>}<div><strong>{approved ? "Moderator-approved snapshot" : "Awaiting approval"}</strong><p>{approved && summary.approvedAt ? `Frozen on ${new Date(summary.approvedAt).toLocaleString()}.` : "No expert probability can be displayed until an authorized moderator publishes it."}</p></div></div>
    <p className="gt-room-fineprint">No observed time series or Monte Carlo result is presented. For hypothetical trajectories, use the separate <Link to="/outlook">What-if Lab</Link>.</p>
  </section>;
}

function CountryContext() {
  return <section className="gt-room-context"><div><Activity size={19}/><div><h2>Current humanitarian severity / country crisis context</h2><p>INFORM scores describe existing crises, not the probability of R1043. Crisis matching is not inferred from country alone.</p></div></div><InformCrisisContext country="Chad"/></section>;
}

function formatRange(a:number[]):string { return a.length === 2 ? `${a[0]}–${a[1]}%` : "Not available"; }
