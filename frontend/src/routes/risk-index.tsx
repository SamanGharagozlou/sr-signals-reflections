import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, ChevronRight, Compass, Database, Filter, Search, ShieldCheck } from "lucide-react";
import { AppHeader, ErrorState, Loading } from "@/components/signal/ui";
import { IntelligenceCard, LEVEL_COLORS } from "@/components/signal/intelligence-charts";
import { SeverityIndexCard } from "@/components/signal/severity-index-card";
import { api, useApi } from "@/lib/api/client";
import type { RiskInventory, RiskInventoryEntry } from "@/lib/api/types";
import { filterRiskIndex, riskLevel, riskPortfolio, riskStatus, type RiskLevel, type RiskStatus } from "@/lib/risk-intelligence-model";

export const Route = createFileRoute("/risk-index")({
  head: () => ({ meta: [{ title: "Risk Index — SIGNAL Ground Truth" }, { name: "description", content: "Searchable ACAPS Risk Radar record index. Qualitative source assessments are distinct from severity and Delphi forecasts." }] }),
  component: RiskIndexPage,
});

function RiskIndexPage() {
  const inventory = useApi(() => api.getRiskInventory());
  return <div className="min-h-screen bg-[#f3f6f7]"><AppHeader section="Risk index"/>
    <main className="gt-intel-shell">
      <header className="gt-intel-hero">
        <p className="gt-intel-kicker">SIGNAL / HUMANITARIAN INTELLIGENCE / 02</p>
        <h1>Every risk has a <em>source.</em> Every decision needs context.</h1>
        <p>Browse ACAPS qualitative risk records, distinguish current conditions from future hazards, and inspect available evidence without inventing numerical scores.</p>
        <div className="gt-intel-hero-links"><Link to="/explore">Explore the map <ArrowRight size={16}/></Link><Link to="/analysis">View statistical analysis <ArrowRight size={16}/></Link></div>
      </header>
      {inventory.status === "loading" && <Loading label="Loading Risk Radar source inventory…"/>}
      {inventory.status === "error" && <ErrorState error={inventory.error} onRetry={inventory.refresh}/>}
      {inventory.status === "ok" && <RiskIndexBody data={inventory.data}/>}
    </main>
  </div>;
}

function RiskIndexBody({ data }: { data: RiskInventory }) {
  const [search,setSearch]=useState("");
  const [level,setLevel]=useState<RiskLevel | "All">("All");
  const [status,setStatus]=useState<RiskStatus | "All">("All");
  const [selected,setSelected]=useState<string>("R1043");
  const portfolio=useMemo(()=>riskPortfolio(data.risks),[data.risks]);
  const rows=useMemo(()=>filterRiskIndex(data.risks,{search,level,status}),[data.risks,search,level,status]);
  const item=rows.find(r=>r.id===selected) ?? rows[0];
  return <>
    <div className="gt-intel-stat-grid" aria-label="Source risk inventory totals">
      <Summary value={portfolio.total} label="Risk records" detail="Loaded inventory"/>
      <Summary value={portfolio.countryCount} label="Country / area labels" detail="Source geographic labels"/>
      <Summary value={portfolio.high} label="High-risk records" detail="Qualitative classification"/>
      <Summary value={portfolio.active} label="Marked active" detail="Source-record status"/>
    </div>
    <div className="gt-intel-alert"><Database size={17}/><span><strong>Dataset:</strong> {data.source}. Counts reflect loaded records, not country danger, crisis severity, or calibrated future-event probabilities.</span></div>
    <div className="gt-intel-grid">
      <section className="gt-intel-card gt-intel-main" aria-labelledby="risk-index-list-title">
        <div className="gt-intel-card-head"><div><p className="gt-intel-eyebrow">01 / CATALOGUE</p><h2 id="risk-index-list-title">Source Risk Index</h2></div><Filter className="text-[#00738C]" size={19}/></div>
        <div className="gt-intel-controls">
          <label className="gt-intel-search"><Search size={17}/><span className="sr-only">Search risk records</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Country, risk or ID…"/></label>
          <label><span>Risk level</span><select value={level} onChange={e=>setLevel(e.target.value as RiskLevel | "All")}>{["All","High","Medium","Low","Unrated"].map(x=><option key={x} value={x}>{x === "All" ? "All levels" : x}</option>)}</select></label>
          <label><span>Source status</span><select value={status} onChange={e=>setStatus(e.target.value as RiskStatus | "All")}>{["All","Active","Materialised","Not materialised","Other / missing"].map(x=><option key={x} value={x}>{x === "All" ? "All statuses" : x}</option>)}</select></label>
        </div>
        <p className="gt-intel-table-count">{rows.length} matching risk record{rows.length!==1?"s":""} · Select a row for context</p>
        <div className="gt-intel-record-list" role="list">
          {rows.map(r=><button role="listitem" type="button" className={`gt-intel-record ${item?.id===r.id?"is-selected":""}`} key={r.id} onClick={()=>setSelected(r.id)} aria-pressed={item?.id===r.id}>
            <span className="gt-intel-record-title"><strong>{r.id}</strong><span>{r.title}</span><small>{r.country}</small></span>
            <span className="gt-intel-record-label" style={{borderColor:LEVEL_COLORS[riskLevel(r.level)]}}>{riskLevel(r.level)}</span>
            <span className="gt-intel-record-status">{riskStatus(r.status)}</span><ChevronRight size={16} aria-hidden/>
          </button>)}
          {!rows.length && <p className="gt-intel-empty">No matching source records. Clear the filters to continue.</p>}
        </div>
      </section>
      <aside className="gt-intel-aside">
        <IntelligenceCard title="Selected risk" eyebrow="02 / SOURCE CONTEXT" icon={<Compass size={20}/> }>
          {item ? <RiskContext key={item.id} item={item}/> : <p className="gt-intel-empty">Select a matching risk above.</p>}
        </IntelligenceCard>
        {item && <SeverityIndexCard key={item.id} riskId={item.id}/>}
        <IntelligenceCard title="Risk versus severity" eyebrow="03 / METHODOLOGY" icon={<BookOpen size={20}/> }>
          <div className="gt-intel-method-lines">
            <div><strong>Risk Radar</strong><span>Qualitative future risk assessment. No derived numerical index.</span></div>
            <div><strong>INFORM Severity</strong><span>Current crisis conditions, when a matching official crisis record exists.</span></div>
            <div><strong>Delphi forecast</strong><span>A numerical probability for a specifically defined future event.</span></div>
          </div>
          <p className="gt-intel-micro"><ShieldCheck size={14}/> The three measures are intentionally not combined.</p>
        </IntelligenceCard>
      </aside>
    </div>
  </>;
}

function Summary({value,label,detail}:{value:number;label:string;detail:string}){
  return <section className="gt-intel-stat"><strong>{value.toLocaleString()}</strong><span>{label}</span><small>{detail}</small></section>;
}

function RiskContext({item}:{item:RiskInventoryEntry}){
  const detail=useApi(()=>api.getRiskDetail(item.id));
  return <div className="gt-intel-detail">
    <div><span className="gt-intel-id">{item.id}</span><h3>{item.title}</h3><p>{item.country}</p></div>
    <dl><div><dt>Source risk level</dt><dd>{item.level||"Not stated"}</dd></div><div><dt>Record status</dt><dd>{item.status||"Not stated"}</dd></div>
      <div><dt>Probability category</dt><dd>{item.probability_category||"Not stated"}</dd></div><div><dt>Impact category</dt><dd>{item.impact||"Not stated"}</dd></div></dl>
    {detail.status==="loading" && <p className="gt-intel-micro">Loading detailed risk information…</p>}
    {detail.status==="error" && <p className="gt-intel-micro">Additional source fields unavailable.</p>}
    {detail.status==="ok" && <div className="gt-intel-risk-excerpt"><strong>Recorded trigger context</strong><p>{detail.data.triggers||"Not provided by source."}</p></div>}
    {item.id==="R1043" ? <Link className="gt-intel-action" to="/moderator">Open R1043 moderator demo <ArrowRight size={16}/></Link>:
      <p className="gt-intel-micro">No configured Delphi consultation for this risk in the synthetic demo.</p>}
  </div>;
}
