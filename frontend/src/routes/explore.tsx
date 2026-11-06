import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert, ClipboardCheck,
  Compass, Database, FileSearch, Filter, Globe2, Info, Layers3, MapPinned, Search, ShieldCheck,
} from "lucide-react";
import { AppHeader, ErrorState, Loading, RiskEvidence } from "@/components/signal/ui";
import { SeverityIndexCard } from "@/components/signal/severity-index-card";
import { InformCrisisContext } from "@/components/signal/inform-crisis-context";
import { api, useApi } from "@/lib/api/client";
import type { RiskDetail, RiskInventoryEntry } from "@/lib/api/types";
import { COUNTRY_OUTLINES, WORLD_MAP_VIEWBOX } from "@/lib/geo/country-paths";
import {
  filteredRisks, groupByCountry, normalizedCountry, riskInventorySummary,
  type ExplorerMode, type CountryAggregate,
} from "@/lib/risk-explorer-model";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Risk Explorer — SIGNAL Ground Truth" },
      { name: "description", content: "Explore ACAPS Risk Radar records by country and qualitative risk level, then open the synthetic R1043 expert consultation." },
    ],
  }),
  component: RiskExplorerPage,
});

type MapMode = "level" | "count" | "consultation";
const MAP_MODES: { id: MapMode; text: string }[] = [
  { id: "level", text: "Risk level" },
  { id: "count", text: "Risk count" },
  { id: "consultation", text: "Expert round" },
];
const VIEWS: { id: ExplorerMode; text: string }[] = [
  { id: "all", text: "All records" },
  { id: "active", text: "Active" },
  { id: "high", text: "High risk" },
];

function RiskExplorerPage() {
  const inventory = useApi(() => api.getRiskInventory());
  return (
    <div className="min-h-screen bg-[#f3f6f7]">
      <AppHeader section="Risk explorer" />
      <main className="mx-auto max-w-[1460px] px-4 pb-16 pt-7 sm:px-7 lg:px-10">
        <div className="gt-explore-intro">
          <p className="gt-explore-kicker"><span className="gt-explore-pulse"/> INTELLIGENCE / RISK RADAR / SYNTHETIC CONSULTATION</p>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="gt-explore-title">Where does the evidence need <span>another perspective?</span></h1>
              <p className="mt-2 max-w-[780px] text-sm leading-relaxed text-[#4d6170] sm:text-base">
                Explore source risk assessments, identify the countries and questions that need attention, and open a human-reviewed expert consultation.
              </p>
            </div>
            <div className="gt-explore-edition"><Globe2 size={17} aria-hidden/> EXPLORE · REVIEW · FORECAST</div>
          </div>
        </div>
        {inventory.status === "loading" && <Loading label="Loading the Risk Radar inventory from FastAPI…" />}
        {inventory.status === "error" && <ErrorState error={inventory.error} onRetry={inventory.refresh} />}
        {inventory.status === "ok" && <ExplorerBody data={inventory.data} />}
      </main>
    </div>
  );
}

function ExplorerBody({ data }: { data: Awaited<ReturnType<typeof api.getRiskInventory>> }) {
  const [mode, setMode] = useState<ExplorerMode>("all");
  const [mapMode, setMapMode] = useState<MapMode>("level");
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Chad");
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const summary = useMemo(() => riskInventorySummary(data), [data]);
  const filtered = useMemo(() => filteredRisks(data.risks, mode, search), [data.risks, mode, search]);
  const countries = useMemo(() => groupByCountry(filtered), [filtered]);
  const allCountries = useMemo(() => groupByCountry(data.risks), [data.risks]);
  const selected = countries.find(c => c.country === selectedCountry) ?? countries[0];
  const highlightedRisk = selected?.risks.find(r => r.id === selectedRiskId) ?? selected?.risks[0];
  const selectedId = highlightedRisk?.id ?? null;
  const outlines = useMemo(() => new Set(COUNTRY_OUTLINES.map(c => normalizedCountry(c.name))), []);
  const missing = allCountries.filter(c => !outlines.has(c.country));

  const chooseCountry = (country: string) => { setSelectedCountry(country); setSelectedRiskId(null); };
  return <>
    <section className="gt-explore-kpis" aria-label="Risk inventory summary">
      <Metric icon={<Layers3 size={18}/>} value={summary.records} label="Risk records" supporting="Loaded from source inventory" />
      <Metric icon={<Globe2 size={18}/>} value={summary.countries} label="Country / area labels" supporting="As reported by the source" />
      <Metric icon={<Compass size={18}/>} value={summary.active} label="Marked active" supporting={summary.statusAvailable ? "Source status field" : "Status unavailable"} />
      <Metric icon={<CircleAlert size={18}/>} value={summary.high} label="High risk level" supporting="Qualitative source category" emphasis />
    </section>
    <div className="gt-explore-layout">
      <section className="gt-map-panel" aria-label="Interactive risk map and country index">
        <div className="gt-map-toolbar">
          <div>
            <p className="gt-explore-small-label">01 / GLOBAL OVERVIEW</p>
            <h2 className="gt-panel-title">Risk Explorer</h2>
          </div>
          <div className="gt-map-modes" aria-label="Map visualization mode">
            {MAP_MODES.map(m => <button key={m.id} type="button" aria-pressed={mapMode === m.id} className={mapMode === m.id ? "is-active" : ""} onClick={()=>setMapMode(m.id)}>{m.text}</button>)}
          </div>
        </div>
        <div className="gt-explore-controls">
          <div className="gt-explore-segments" aria-label="Filter source records">
            <Filter size={14} aria-hidden/>
            {VIEWS.map(v=><button key={v.id} type="button" aria-pressed={mode===v.id} className={mode===v.id?"is-active":""} onClick={()=>setMode(v.id)}>{v.text}</button>)}
          </div>
          <label className="gt-explore-search"><Search size={16} aria-hidden/><span className="sr-only">Search countries, risk IDs or titles</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a country or risk…" /></label>
        </div>
        <WorldMap countries={countries} selected={selected?.country} onSelect={chooseCountry} mode={mapMode}/>
        <div className="gt-map-footer">
          <div className="gt-map-legend">
            {mapMode === "level" && <><Legend color="#bd3654" text="High"/><Legend color="#f0b6c2" text="Medium"/><Legend color="#85bece" text="Low"/><Legend color="#afb8bf" text="Unrated"/></>}
            {mapMode === "count" && <><Legend color="#d8eaf0" text="1 record"/><Legend color="#5eabbf" text="2–3"/><Legend color="#075473" text="4+"/></>}
            {mapMode === "consultation" && <><Legend color="#0b7890" text="Synthetic round available (R1043)"/><Legend color="#d5dde1" text="No configured round"/></>}
          </div>
          <p className="gt-map-disclaimer"><Info size={13} aria-hidden/> Map shows source records matching your filters, not a global severity index. Geographic outlines are simplified.</p>
        </div>
        <div className="gt-country-index">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="gt-explore-small-label">02 / EXPLORE COUNTRY RECORDS</p>
            <span className="text-xs text-[#6f7d86]">{countries.length} matching country / area labels · {filtered.length} risks</span>
          </div>
          <div className="gt-country-chips">
            {countries.map(c=><button key={c.country} type="button" className={selected?.country===c.country?"selected":""} aria-pressed={selected?.country===c.country} onClick={()=>chooseCountry(c.country)}>{c.country}<span>{c.risks.length}</span></button>)}
            {countries.length === 0 && <p className="py-4 text-sm text-muted-foreground">No risk records match these filters. Try All records or clear the search.</p>}
          </div>
        </div>
        <div className="gt-map-source"><Database size={13} aria-hidden/><span>Inventory: {data.source}. Countries without a matching map outline are still accessible in the country list{missing.length ? ` (${missing.map(c=>c.country).slice(0,3).join(", ")}${missing.length>3?", …":""})` : ""}.</span></div>
      </section>
      <aside className="gt-explore-aside" aria-label="Selected country intelligence">
        {selected ? <>
          <section className="gt-country-hero">
            <p className="gt-explore-small-label">SELECTED AREA / SOURCE OVERVIEW</p>
            <div className="flex items-start justify-between gap-2">
              <h2 className="gt-country-title">{selected.country}</h2>
              <span className="gt-selection-flag">{selected.risks.length} risk{selected.risks.length!==1?"s":""}</span>
            </div>
            <p className="text-sm text-[#b8d4de]">{selected.active} marked active · {selected.high} high risk level</p>
            <div className="gt-country-bars" aria-label="Source risk level mix">
              {selected.risks.map(r=><div key={r.id} style={{background:levelColor(r.level)}} title={`${r.id}: ${r.level}`}/>)}
            </div>
            <p className="mt-3 text-xs text-[#a2c7d4]">Country-level aggregation of source risk categories; not an event probability.</p>
          </section>
          <div className="gt-risk-list-heading"><p className="gt-explore-small-label">03 / SELECT A RISK</p><span>{selected.risks.length} record{selected.risks.length!==1?"s":""}</span></div>
          <div className="gt-risk-list">
            {selected.risks.map(r=><button key={r.id} className={selectedId===r.id?"gt-risk-item selected":"gt-risk-item"} type="button" aria-pressed={selectedId===r.id} onClick={()=>setSelectedRiskId(r.id)}>
              <div className="flex flex-wrap items-center gap-2"><span className="gt-risk-code">{r.id}</span><span className="gt-risk-level" style={{color:levelTextColor(r.level),background:levelSoftColor(r.level)}}>{r.level||"Unrated"}</span>{r.status && <span className="text-[10px] text-[#73808b]">{r.status}</span>}</div>
              <p>{r.title || "Untitled source risk"}</p>
              <div className="flex items-center justify-between"><span>Open evidence summary</span><ArrowUpRight size={15} aria-hidden/></div>
            </button>)}
          </div>
          {highlightedRisk && <RiskDetailPanel key={highlightedRisk.id} risk={highlightedRisk} />}
        </>:<div className="gt-aside-empty"><MapPinned size={26}/><p>Select a risk-bearing area on the map or change your filters.</p></div>}
      </aside>
    </div>
    <section className="gt-explore-next">
      <div><p className="gt-explore-small-label text-[#8dd9e8]">SIGNAL / HUMAN IN THE LOOP</p><h2>From mapped risk to an accountable forecast.</h2><p>Source context is only the starting point. Experts provide independent estimates; moderators control feedback and publication.</p></div>
      <div className="gt-explore-next-steps"><span>01 Explore</span><ArrowRight size={14}/><span>02 Forecast</span><ArrowRight size={14}/><span>03 Review</span><ArrowRight size={14}/><span>04 Approve</span></div>
    </section>
  </>;
}

function Metric({icon,value,label,supporting,emphasis=false}:{icon:ReactNode;value:number;label:string;supporting:string;emphasis?:boolean}){
  return <div className={emphasis?"gt-explore-metric emphasis":"gt-explore-metric"}>
    <div className="flex items-center justify-between"><span className="gt-metric-label">{label}</span><span className="gt-metric-icon">{icon}</span></div>
    <div className="gt-metric-value">{value.toLocaleString()}</div>
    <div className="gt-metric-support">{supporting}</div>
  </div>;
}

function WorldMap({countries,selected,onSelect,mode}:{countries:CountryAggregate[];selected?:string;onSelect:(name:string)=>void;mode:MapMode}){
  const byName = useMemo(()=>new Map(countries.map(c=>[c.country,c])),[countries]);
  const [hovered,setHovered] = useState<string|null>(null);
  const hoveredCountry = hovered ? byName.get(hovered) : null;
  const focusCountry = hoveredCountry || (selected ? byName.get(selected) : undefined);
  const selectedOutline = COUNTRY_OUTLINES.find(c=>normalizedCountry(c.name)===selected);
  const onKey = (e:KeyboardEvent<SVGPathElement>,country:string)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(country);}};
  return <div className="gt-world-map">
    <div className="gt-map-topline"><span><span className="gt-map-live-dot"/> INTERACTIVE ATLAS</span><span>COUNTRY-LEVEL VIEW · SOURCE RISK CATEGORIES</span></div>
    <svg className="gt-map-svg" viewBox={WORLD_MAP_VIEWBOX} xmlns="http://www.w3.org/2000/svg" aria-label="Select highlighted countries to inspect their source risk records">
      <title>Risk Radar world map</title>
      <defs><pattern id="signal-map-grid" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#9fb5bf" opacity=".28"/></pattern></defs>
      <rect width="1000" height="510" fill="url(#signal-map-grid)"/>
      {COUNTRY_OUTLINES.map(c=>{
        const country = normalizedCountry(c.name), info=byName.get(country), isSelected=country===selected;
        const fill = !info ? "#d8dfe2" : mode==="consultation" ? (info.risks.some(r=>r.id==="R1043")?"#0b7890":"#bdcbd1") : mode==="count" ? (info.risks.length>=4?"#075473":info.risks.length>=2?"#5eabbf":"#d8eaf0") : levelColor(info.highest);
        return <path key={c.iso+country} d={c.d} fill={fill} stroke={isSelected?"#073e5c":"#fff"} strokeWidth={isSelected?2.4:.75} vectorEffect="non-scaling-stroke"
          className={info?`gt-map-country ${isSelected?"selected":""}`:"gt-map-background-country"}
          tabIndex={info?0:undefined} role={info?"button":undefined} aria-label={info?`${country}: ${info.risks.length} source risks. Select to view records.`:undefined}
          onMouseEnter={info?()=>setHovered(country):undefined} onMouseLeave={info?()=>setHovered(null):undefined}
          onFocus={info?()=>setHovered(country):undefined} onBlur={info?()=>setHovered(null):undefined}
          onClick={info?()=>onSelect(country):undefined} onKeyDown={info?e=>onKey(e,country):undefined} />;
      })}
      {selectedOutline && <path d={selectedOutline.d} fill="none" stroke="#073e5c" strokeWidth="2.6" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
    </svg>
    <div className="gt-map-readout" aria-live="polite">
      <div className="flex items-center gap-2"><MapPinned size={16} aria-hidden/><strong>{focusCountry?.country ?? "Explore a highlighted area"}</strong></div>
      <span>{focusCountry ? `${focusCountry.risks.length} source risk${focusCountry.risks.length===1?"":"s"} · ${focusCountry.highest} level maximum` : "Use the country chips or keyboard to navigate"}</span>
    </div>
  </div>;
}
function levelColor(level:string){if(/\bhigh\b/i.test(level))return "#bd3654";if(/medium/i.test(level))return "#f0b6c2";if(/low/i.test(level))return "#85bece";return "#afb8bf";}
function levelTextColor(level:string){if(/high/i.test(level))return "#9e2442";if(/medium/i.test(level))return "#8f415b";return "#365c69";}
function levelSoftColor(level:string){if(/high/i.test(level))return "#f9e6eb";if(/medium/i.test(level))return "#fbeaec";return "#e2f2f5";}
function Legend({color,text}:{color:string;text:string}){return <span className="gt-legend-item"><i style={{background:color}} aria-hidden/>{text}</span>}

function RiskDetailPanel({risk}:{risk:RiskInventoryEntry}){
  const detail = useApi(()=>api.getRiskDetail(risk.id));
  const navigate = useNavigate();
  const [opening,setOpening]=useState<"expert"|"moderator"|null>(null);
  async function openDemo(role:"expert"|"moderator"){
    setOpening(role);
    try{await api.login(role);navigate({to:role==="expert"?"/expert":"/moderator"});}
    catch {setOpening(null);}
  }
  return <section className="gt-risk-detail" aria-label={`Source context for ${risk.id}`}>
    <div className="flex items-center justify-between"><p className="gt-explore-small-label">04 / SOURCE CONTEXT</p><FileSearch size={17} color="#00738C" aria-hidden/></div>
    {detail.status==="loading" && <div className="py-5 text-sm text-muted-foreground">Loading context…</div>}
    {detail.status==="error" && <p className="py-3 text-sm text-[#b53d52]">Source context unavailable: {detail.error.message}</p>}
    {detail.status==="ok" && <SourceDetail details={detail.data}/>}
    <SeverityIndexCard riskId={risk.id} />
    <InformCrisisContext country={risk.country} />
    {risk.id === "R1043" ? <div className="gt-risk-open"><div className="mb-3 flex items-center gap-2"><Check size={16}/><span>Working synthetic consultation available</span></div><button type="button" disabled={opening!==null} onClick={()=>openDemo("expert")}>{opening==="expert"?"Opening…":"Open R1043 expert round"}<ArrowRight size={17} aria-hidden/></button><button type="button" className="secondary" disabled={opening!==null} onClick={()=>openDemo("moderator")}>{opening==="moderator"?"Opening…":"Review as moderator"}<ArrowUpRight size={16} aria-hidden/></button></div> : <p className="gt-no-round"><ClipboardCheck size={16} aria-hidden/> No expert consultation configured for {risk.id}. Source record only; SIGNAL does not fabricate forecasts.</p>}
  </section>;
}
function SourceDetail({details}:{details:RiskDetail}){
  return <>
    <h3 className="gt-risk-detail-title">{details.title || details.id}</h3>
    <div className="gt-source-facts">
      <div><span>Source risk level</span><strong>{details.risk_level||"Not stated"}</strong></div>
      <div><span>Qualitative likelihood</span><strong>{details.probability_category||"Not stated"}</strong></div>
      <div><span>Expected impact</span><strong>{details.impact||"Not stated"}</strong></div>
      <div><span>Risk trend</span><strong>{details.trend||"Not stated"}</strong></div>
    </div>
    {details.triggers && <details className="gt-source-expand"><summary>View source trigger excerpt <ChevronDown size={15}/></summary><div className="mt-3 border-t pt-3"><RiskEvidence text={details.triggers}/></div></details>}
    <p className="gt-detail-notice"><ShieldCheck size={14} aria-hidden/> Source text is not independently verified. ACAPS qualitative likelihood is not a SIGNAL six-month event probability.</p>
  </>;
}
