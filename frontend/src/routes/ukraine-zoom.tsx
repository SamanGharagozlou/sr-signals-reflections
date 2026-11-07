import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Info, MapPinned } from "lucide-react";
import { AppHeader } from "@/components/signal/ui";
import { UkraineRiskKnowledgeGraph } from "@/components/signal/ukraine-risk-knowledge-graph";
import { buildRegion, colorFor, pearson, weeklyChanges, type Scenario, type ScenarioRegion, type UkraineRegion } from "@/lib/ukraine-zoom-model";

export const Route = createFileRoute("/ukraine-zoom")({
  head: () => ({ meta: [
    { title: "Ukraine Country Zoom | S&R synthetic regional illustration" },
    { name: "description", content: "Interactive historical administrative boundaries and fictional 26-week regional signals; not an operational assessment." },
  ] }),
  component: UkraineZoom,
});

type Geometry = {
  source: string;
  boundaryYear: string;
  license: string;
  regions: UkraineRegion[];
};

const MODES: { id: Scenario; label: string }[] = [
  { id: "risk", label: "Illustrative index" },
  { id: "front", label: "Hypothetical front-line pattern" },
  { id: "energy", label: "Hypothetical energy pattern" },
  { id: "displacement", label: "Hypothetical displacement pattern" },
  { id: "together", label: "Moves with selection" },
];

function UkraineZoom() {
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Scenario>("risk");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/geo/ukraine-adm1-render.json", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw Error(`Boundary file unavailable (HTTP ${response.status})`);
        const d = await response.json() as Geometry;
        if (!Array.isArray(d.regions) || d.regions.length < 20) throw Error("Invalid or incomplete administrative boundary dataset");
        return d;
      })
      .then(d => setGeometry(d))
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Map data unavailable"); });
    return () => controller.abort();
  }, []);

  const rows = useMemo(() => (geometry?.regions || []).map(buildRegion).sort((a, b) => a.name.localeCompare(b.name)), [geometry]);
  const selected = rows.find(r => r.id === selectedId) || rows.find(r => /zakarpat|закарпат/i.test(r.name)) || rows[0];
  const byMovement = useMemo(() => selected ? rows.filter(r => r.id !== selected.id)
    .map(r => ({ region: r, corr: pearson(weeklyChanges(r.trend), weeklyChanges(selected.trend)) || 0 }))
    .sort((a, b) => b.corr - a.corr) : [], [rows, selected]);
  const matrix = useMemo(() => selected ? [selected, ...byMovement.slice(0, 8).map(x => x.region)] : [], [selected, byMovement]);

  const onRegionKey = (e: KeyboardEvent<SVGPathElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(id); }
  };

  return <div className="min-h-screen sr-bg">
    <AppHeader section="Analyse / Ukraine country zoom" />
    <main className="sr-ukz-shell">
      <div className="sr-ukz-back"><Link to="/analysis"><ArrowLeft size={15} aria-hidden="true"/> Back to Analyse</Link></div>
      <header className="sr-ukz-header">
        <p className="sr-ukz-kicker">S&R / ANALYSE / COUNTRY ZOOM</p>
        <h1>Ukraine · <em>Which regions move together?</em></h1>
        <p>Explore a fully interactive, 26-week <strong>fictional analytical scenario</strong> with geographic boundaries for reference.</p>
      </header>
      <div className="sr-ukz-warning" role="note"><Info size={18} aria-hidden="true"/><span><strong>SYNTHETIC DEMONSTRATION:</strong> All regional scores, time series, thematic assignments and correlations are generated, not observed. The boundary dataset represents historical administrative divisions, not current control lines. Not an ACAPS assessment or humanitarian forecast.</span></div>
      {error && <div className="sr-ukz-error" role="alert"><strong>Map unavailable:</strong> {error}. Run the Phase 15D installer with verified ADM1 GeoJSON, then reload.</div>}
      {!error && !geometry && <p role="status" className="sr-ukz-loading">Loading geographic boundaries…</p>}
      {selected && <>
        <div className="sr-ukz-controls">
          <div className="sr-ukz-modes" role="group" aria-label="Choose fictional thematic overlay">
            {MODES.map(m => <button key={m.id} type="button" className={mode === m.id ? "selected" : ""} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>)}
          </div>
          <label className="sr-ukz-select">Region <select value={selected.id} onChange={e => setSelectedId(e.target.value)}>{rows.map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
        </div>
        <div className="sr-ukz-layout">
          <section className="sr-ukz-map-card" aria-labelledby="sr-ukz-map-heading">
            <div className="sr-ukz-card-head"><h2 id="sr-ukz-map-heading">Administrative region explorer</h2><span>{rows.length} regions</span></div>
            <svg viewBox="0 0 960 650" role="group" aria-label="Selectable regions of Ukraine, with fictional scores" className="sr-ukz-map">
              {rows.map(r => <path key={r.id} d={r.path} role="button" tabIndex={0} aria-pressed={selected.id === r.id} aria-label={`${r.name}, simulated index ${r.current.toFixed(1)}. Select region.`} onClick={() => setSelectedId(r.id)} onKeyDown={e => onRegionKey(e, r.id)} fill={colorFor(r, selected, mode)} stroke={selected.id === r.id ? "#b45e19" : "#ffffff"} strokeWidth={selected.id === r.id ? 3.5 : 1.4} className="sr-ukz-region" />)}
              <circle cx={selected.cx} cy={selected.cy} r="5" fill="#b45e19" stroke="#fff" strokeWidth="1.4" pointerEvents="none"/>
            </svg>
            <div className="sr-ukz-map-legend"><span>Illustrative signals · not measured</span><span className="sr-ukz-swatch" aria-hidden="true"><i/><i/><i/><i/><i/></span><span>Lower → higher</span></div>
            <p className="sr-ukz-fine">Geographic source: geoBoundaries / OpenStreetMap, historical ADM1 data ({geometry?.boundaryYear}). Not a map of changing territorial control.</p>
          </section>
          <aside className="sr-ukz-stat-card" aria-label="Selected region fictional statistics">
            <p className="sr-ukz-kicker">SELECTED REGION</p>
            <h2>{selected.name}</h2>
            <div className="sr-ukz-stats"><div><span>Simulated index now</span><strong>{selected.current.toFixed(1)}</strong></div><div><span>Change over 12 weeks</span><strong>{selected.delta12 > 0 ? "+" : ""}{selected.delta12.toFixed(1)}</strong></div></div>
            <p className="sr-ukz-tag">Fictional factor group: {selected.pattern === "front" ? "front-line" : selected.pattern === "energy" ? "energy" : "displacement"} pattern</p>
            <h3>Simulated 26-week regional index</h3>
            <Trend data={selected.trend}/>
            <h3>Strongest synthetic co-movement</h3>
            <ol className="sr-ukz-ranking">{byMovement.slice(0, 3).map(({region, corr}) => <li key={region.id}><button type="button" onClick={()=>setSelectedId(region.id)}>{region.name}</button><strong>{corr.toFixed(2)}</strong></li>)}</ol>
            <p className="sr-ukz-fine">Correlation does not imply causation; these values are calculated from fictional series, not current Ukraine observations.</p>
          </aside>
        </div>
        <UkraineRiskKnowledgeGraph regions={rows} selected={selected} onSelectRegion={setSelectedId}/>
        <section className="sr-ukz-matrix-card" aria-labelledby="sr-ukz-matrix-title">
          <h2 id="sr-ukz-matrix-title">How closely do regions move together?</h2>
          <p>Pearson correlation of changes in fictional weekly index series (26 weeks). Selected region plus eight most correlated regions. Select a row label to focus that region.</p>
          <div className="sr-ukz-table-wrap"><table className="sr-ukz-matrix"><caption className="sr-only">Synthetic regional correlation matrix</caption><thead><tr><th scope="col">Region</th>{matrix.map(r=><th key={r.id} scope="col" title={r.name}>{r.name.length > 12 ? `${r.name.slice(0, 11)}…` : r.name}</th>)}</tr></thead><tbody>{matrix.map(r=><tr key={r.id}><th scope="row"><button type="button" onClick={()=>setSelectedId(r.id)}>{r.name}</button></th>{matrix.map(c=>{const v=pearson(weeklyChanges(r.trend),weeklyChanges(c.trend)) ?? 0;return <td key={c.id} title={`${r.name} / ${c.name}: ${v.toFixed(2)} (synthetic)`} style={{backgroundColor:`rgba(10, 113, 147, ${0.1+Math.max(0,v)*0.7})`, color:v>0.60?"#fff":"#123d50"}}>{v.toFixed(2)}</td>})}</tr>)}</tbody></table></div>
          <p className="sr-ukz-fine">Illustrative outputs only. No model calibration, measured displacement, strike data, or operational recommendations.</p>
        </section>
        <section className="sr-ukz-next"><div><h2>From regional patterns to expert judgment</h2><p>Use the separate Chad synthetic consultation to see how a forecast moves through expert input, moderator review, and controlled publication.</p></div><Link to="/public">View Chad Share experience <ArrowRight size={17} aria-hidden="true"/></Link></section>
      </>}
    </main>
  </div>;
}

function Trend({data}:{data:number[]}) {
  const points = data.map((v, i) => `${(i/(data.length - 1)*420).toFixed(1)},${(118-(v/5*102)).toFixed(1)}`).join(" ");
  return <svg className="sr-ukz-trend" viewBox="0 0 420 130" role="img" aria-label="Simulated weekly index over 26 weeks, earliest left and latest right">
    <line x1="0" y1="115" x2="420" y2="115" stroke="#c9d9de"/>
    <line x1="0" y1="58" x2="420" y2="58" stroke="#e3ecef" strokeDasharray="4 4"/>
    <polyline points={points} fill="none" stroke="#08607b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="0" y="129" fontSize="11" fill="#687983">26 weeks ago</text><text x="420" y="129" textAnchor="end" fontSize="11" fill="#687983">Now (fictional)</text>
  </svg>;
}
