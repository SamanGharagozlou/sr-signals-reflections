import { Activity, ArrowUpRight, CircleHelp, Database, ShieldCheck } from "lucide-react";
import { api, useApi } from "@/lib/api/client";
import type { SeverityIndex } from "@/lib/api/types";

const DIMENSIONS: { key: "impact" | "conditions" | "complexity"; label: string; help: string }[] = [
  { key: "impact", label: "Crisis impact", help: "How broadly and intensely a crisis affects an area and its people" },
  { key: "conditions", label: "Conditions of people affected", help: "How severely people are affected" },
  { key: "complexity", label: "Crisis complexity", help: "Contextual barriers to relief and recovery" },
];

function MeasuredIndex({ index }: { index: Extract<SeverityIndex, { available: true }> }) {
  const pct = Math.max(0, Math.min(100, index.score * 10));
  return <>
    <div className="gt-severity-value-row">
      <div>
        <div className="gt-severity-score">{index.score.toFixed(1)}<span> / 10</span></div>
        <div className="gt-severity-class">Official classification: <strong>{index.level}</strong></div>
      </div>
      <span className="gt-severity-source-chip">OFFICIAL · {index.release}</span>
    </div>
    <div className="gt-severity-scale" role="img" aria-label={`Official INFORM Severity score ${index.score.toFixed(1)} out of 10`}>
      <div className="gt-severity-track"><div className="gt-severity-fill" style={{ width: `${pct}%` }}/><span className="gt-severity-marker" style={{ left: `${pct}%` }}/></div>
      <div className="gt-severity-ticks"><span>0</span><span>5</span><span>10</span></div>
    </div>
    <div className="gt-severity-components" aria-label="Official severity dimensions">
      {DIMENSIONS.map(d => <div key={d.key} title={d.help}><span>{d.label}</span><strong>{index.dimensions[d.key] === null ? "—" : index.dimensions[d.key]!.toFixed(1)}</strong></div>)}
    </div>
    <div className="gt-severity-provenance">
      <strong>{index.crisis_name}</strong><span>Crisis ID: {index.crisis_id}</span>
      <span>Match basis: {index.match_note}</span>
    </div>
    <a className="gt-severity-source-link" href={index.source_url} target="_blank" rel="noopener noreferrer">Source: INFORM Severity, {index.release} <ArrowUpRight size={14} aria-hidden /></a>
  </>;
}

export function SeverityIndexCard({ riskId }: { riskId: string }) {
  const result = useApi(() => api.getSeverityIndex(riskId));
  return <section className="gt-severity-card" aria-label="Current humanitarian severity index">
    <header className="gt-severity-heading">
      <span className="gt-severity-eyebrow"><Activity size={15} aria-hidden /> CURRENT CONDITIONS / INFORM SEVERITY</span>
      <span className="gt-severity-method-tag">CRISIS-LEVEL INDEX</span>
    </header>
    <h3>How severe is the current crisis?</h3>
    {result.status === "loading" && <p className="gt-severity-empty">Checking official crisis match…</p>}
    {result.status === "error" && <p className="gt-severity-empty"><Database size={17} aria-hidden /> Severity source could not be reached. No score inferred.</p>}
    {result.status === "ok" && (
      result.data.available ? <MeasuredIndex index={result.data} /> :
      <div className="gt-severity-missing">
        <div className="gt-severity-missing-score">—<span> / 10</span></div>
        <p><CircleHelp size={17} aria-hidden /> Not connected to a verified crisis record</p>
        <span>{result.data.reason}</span>
        <a className="gt-severity-source-link" href={result.data.methodology_url} target="_blank" rel="noopener noreferrer">Explore official INFORM data <ArrowUpRight size={14} aria-hidden /></a>
      </div>
    )}
    <footer className="gt-severity-note"><ShieldCheck size={15} aria-hidden /><span>Observed humanitarian severity is not an ACAPS qualitative risk rating or a SIGNAL six-month event probability. These measures must not be combined into one score.</span></footer>
  </section>;
}
