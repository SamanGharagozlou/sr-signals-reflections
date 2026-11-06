import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, BarChart3, Database, FileCheck2, LockKeyhole, ShieldCheck, Table2 } from "lucide-react";
import { AppHeader, ErrorState, Loading } from "@/components/signal/ui";
import { CompositionBars, IntelligenceCard, LEVEL_COLORS, STATUS_COLORS } from "@/components/signal/intelligence-charts";
import { api, useApi } from "@/lib/api/client";
import type { HistoricalEvaluation, RiskInventory } from "@/lib/api/types";
import { riskPortfolio } from "@/lib/risk-intelligence-model";

export const Route = createFileRoute("/analysis")({
  head: () => ({ meta: [
    { title: "Statistical Studio — SIGNAL Ground Truth" },
    { name: "description", content: "Source-backed descriptive humanitarian risk statistics and moderator-restricted historical outcomes, with limitations clearly stated." },
  ] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const inventory=useApi(()=>api.getRiskInventory());
  return <div className="min-h-screen bg-[#f3f6f7]"><AppHeader section="Statistical studio"/>
    <main className="gt-intel-shell">
      <header className="gt-intel-hero gt-intel-hero-analysis">
        <p className="gt-intel-kicker">SIGNAL / HUMANITARIAN INTELLIGENCE / 03</p>
        <h1>See the pattern. <em>Keep the uncertainty.</em></h1>
        <p>Descriptive analytics built from loaded ACAPS Risk Radar records. All denominators, missing fields and permission boundaries remain visible.</p>
        <div className="gt-intel-hero-links"><Link to="/risk-index">Browse the Risk Index →</Link><Link to="/explore">Open Risk Explorer →</Link></div>
      </header>
      {inventory.status==="loading"&&<Loading label="Calculating descriptive inventory statistics…"/>}
      {inventory.status==="error"&&<ErrorState error={inventory.error} onRetry={inventory.refresh}/>}
      {inventory.status==="ok"&&<AnalysisBody data={inventory.data}/>}
    </main>
  </div>;
}

function AnalysisBody({data}:{data:RiskInventory}){
  const summary=useMemo(()=>riskPortfolio(data.risks),[data.risks]);
  const [countrySort,setCountrySort]=useState<"total"|"high"|"active">("total");
  const sorted=useMemo(()=>[...summary.countryRows].sort((a,b)=>b[countrySort]-a[countrySort]||a.country.localeCompare(b.country)),[summary.countryRows,countrySort]);
  const visible=sorted.slice(0,10);
  const maximum=Math.max(1,...visible.map(r=>r[countrySort]));
  return <>
    <section className="gt-intel-stat-grid" aria-label="Portfolio coverage">
      <Metric value={summary.total} label="Records analyzed" description="Source inventory rows"/>
      <Metric value={summary.countryCount} label="Area labels" description="Not country risk rates"/>
      <Metric value={summary.unknownStatus} label="Missing/other status" description="Not assumed resolved"/>
      <Metric value={summary.unrated} label="Unrated levels" description="No imputed risk category"/>
    </section>
    <div className="gt-intel-alert"><Database size={18}/><span><strong>Live input:</strong> {data.source}. {summary.total===1?"Only the single built-in synthetic record is loaded; add the authorized Risk Radar CSV locally to see portfolio comparisons.":"Every figure below is recomputed from this loaded inventory."} Source counts are not humanitarian incidence rates.</span></div>
    <div className="gt-intel-analytics-grid">
      <IntelligenceCard title="Risk-level composition" eyebrow="01 / QUALITATIVE RATINGS" icon={<BarChart3 size={20}/>} footnote="ACAPS risk levels are qualitative assessments; the chart does not estimate event probabilities.">
        <CompositionBars rows={summary.levelRows} colors={LEVEL_COLORS} caption="Distribution of risk records by source risk level"/>
      </IntelligenceCard>
      <IntelligenceCard title="Record lifecycle" eyebrow="02 / SOURCE STATUSES" icon={<Activity size={20}/>} footnote="Materialised and not-materialised are reported record statuses, not proof of calibrated numerical forecasts.">
        <CompositionBars rows={summary.statusRows} colors={STATUS_COLORS} caption="Distribution of risk records by source status"/>
      </IntelligenceCard>
      <IntelligenceCard title="Where records are concentrated" eyebrow="03 / COUNTRY / AREA COMPARISON" icon={<BarChart3 size={20}/>} footnote="Risk record counts depend on source coverage, selection and reporting. A higher count does not mean a country is more dangerous.">
        <div className="gt-intel-toggle" aria-label="Country comparison metric">
          {([{id:"total",label:"All records"},{id:"high",label:"High risk"},{id:"active",label:"Active"}] as const).map(v=><button key={v.id} type="button" aria-pressed={countrySort===v.id} className={countrySort===v.id?"is-active":""} onClick={()=>setCountrySort(v.id)}>{v.label}</button>)}
        </div>
        <ol className="gt-intel-country-chart">
          {visible.map((r,i)=><li key={r.country}><span className="gt-intel-country-rank">{String(i+1).padStart(2,"0")}</span><span className="gt-intel-country-name" title={r.country}>{r.country}</span><div className="gt-intel-track" role="img" aria-label={`${r.country}: ${r[countrySort]} ${countrySort} records`}><div style={{width:`${100*r[countrySort]/maximum}%`,background:countrySort==="high"?"#ad3450":"#00809c"}}/></div><strong>{r[countrySort]}</strong></li>)}
          {!visible.length&&<li>No records available.</li>}
        </ol>
        {sorted.length>10&&<p className="gt-intel-micro">Top 10 of {sorted.length} country / area labels by selected record count.</p>}
      </IntelligenceCard>
      <IntelligenceCard title="Risk level × record status" eyebrow="04 / TWO-WAY ANALYSIS" icon={<Table2 size={20}/>} footnote="Cells are integer counts, not conditional likelihoods. Unknown states remain in the matrix.">
        <div className="gt-intel-matrix-wrap"><table className="gt-intel-matrix"><caption className="sr-only">Count of source records at each risk level and status</caption><thead><tr><th scope="col">Risk level</th>{summary.statusRows.map(r=><th key={r.label} scope="col">{r.label}</th>)}</tr></thead><tbody>{summary.matrix.map(row=><tr key={row.level}><th scope="row"><i style={{background:LEVEL_COLORS[row.level]}}/>{row.level}</th>{row.cells.map(cell=><td key={cell.status}><span className={cell.count?"has-data":""} style={{background:cell.count?`rgba(0, 128, 156, ${0.07+Math.min(0.38,cell.count/Math.max(1,summary.total)*3)})`:undefined}}>{cell.count}</span></td>)}</tr>)}</tbody></table></div>
      </IntelligenceCard>
    </div>
    <div className="mt-7"><HistoricalPanel/></div>
    <div className="gt-intel-bottom-note"><ShieldCheck size={20}/><p><strong>Methodology boundary.</strong> Descriptive Risk Radar counts and status histories must not be presented as a validated forecasting model. A Brier score requires an explicit numerical event forecast and a verified, time-bounded outcome. INFORM Severity is a separate crisis-level index.</p></div>
  </>;
}

function Metric({value,label,description}:{value:number;label:string;description:string}){
  return <div className="gt-intel-stat"><strong>{value.toLocaleString()}</strong><span>{label}</span><small>{description}</small></div>;
}

function HistoricalPanel() {
  // Server enforces moderator-only access. This view never fetches private individual expert predictions.
  const q=useApi(()=>api.getHistoricalEvaluation());
  return <IntelligenceCard title="Historical risk outcomes" eyebrow="05 / MODERATOR-ONLY DESCRIPTIVE STUDY" icon={<LockKeyhole size={19}/> }>
    {q.status==="loading"&&<p className="gt-intel-micro">Checking moderator permissions and historical data availability…</p>}
    {q.status==="error"&&<div className="gt-intel-historical-locked"><LockKeyhole size={22}/><p><strong>Moderator access required.</strong> Historical outcome analysis is not public. Enter the moderator demo from the homepage, then reload this page.</p><Link to="/">Choose a demo role →</Link></div>}
    {q.status==="ok"&&<HistoricalContent result={q.data}/>}
  </IntelligenceCard>;
}

function HistoricalContent({result}:{result:HistoricalEvaluation}) {
  if (!result.available || !result.totals || !result.by_risk_level) return <div className="gt-intel-historical-locked"><FileCheck2 size={22}/><p><strong>Historical analysis unavailable.</strong> {result.reason||"No suitable official source loaded."}</p><span className="gt-intel-micro">Source: {result.source}</span></div>;
  return <div className="gt-intel-historical">
    <div className="gt-intel-historical-numbers"><div><strong>{result.totals.total}</strong><span>Records</span></div><div><strong>{result.totals.resolved}</strong><span>Reported resolved</span></div><div><strong>{result.totals.active}</strong><span>Active</span></div><div><strong>{result.totals.unknown_status}</strong><span>Missing/other status</span></div></div>
    <div className="gt-intel-matrix-wrap"><table className="gt-intel-hist-table"><caption className="sr-only">Reported outcomes by qualitative risk level</caption><thead><tr><th scope="col">Risk level</th><th scope="col">Resolved</th><th scope="col">Materialised</th><th scope="col">Not materialised</th><th scope="col">Observed share</th></tr></thead><tbody>{result.by_risk_level.map(r=><tr key={r.level}><th scope="row">{r.level}</th><td>{r.resolved}</td><td>{r.materialised}</td><td>{r.not_materialised}</td><td>{r.rate_displayable && r.observed_materialisation_pct!==null ? `${r.observed_materialisation_pct.toFixed(1)}%` : "Suppressed / N.A."}</td></tr>)}</tbody></table></div>
    <p className="gt-intel-micro">Observed shares are descriptive fractions of source records marked resolved. Rates suppressed for small samples according to the backend policy. These are not Brier scores or validated event-level forecast accuracy.</p>
    {result.limitations && result.limitations.length>0&&<details className="gt-intel-limitations"><summary>Methodology and limitations</summary><ul>{result.limitations.map((v,i)=><li key={i}>{v}</li>)}</ul></details>}
    <p className="gt-intel-micro">Source: {result.source}</p>
  </div>;
}
