import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Info, Network } from "lucide-react";
import { getVerifiedReport } from "@/lib/verified-report-index";
import { buildUkraineRiskKnowledgeGraph, describeUkraineReaderLens, serializeUkraineRiskKnowledgeGraph, type KnowledgeNode, type UkraineReaderLens, type UkraineRiskKnowledgeGraph } from "@/lib/ukraine-risk-knowledge-graph-model";
import type { ScenarioRegion } from "@/lib/ukraine-zoom-model";

interface Props {
  regions: ScenarioRegion[];
  selected: ScenarioRegion;
  onSelectRegion: (id: string) => void;
}

const NODE_LABEL: Record<KnowledgeNode["provenance"], string> = {
  "synthetic-scenario": "Synthetic scenario",
  "geographic-metadata": "Historical geography",
  "context-only": "Reference only",
};

/** S&R graph lives inside /ukraine-zoom; it neither calls private APIs nor publishes reports. */
export function UkraineRiskKnowledgeGraph({ regions, selected, onSelectRegion }: Props) {
  const report = getVerifiedReport("ukraine");
  const graph = useMemo(() => buildUkraineRiskKnowledgeGraph(regions, selected, report ? {
    title: report.title, publishedOn: report.publishedOn, sourceUrl: report.sourceUrl,
  } : null), [regions, selected, report]);
  const [activeId, setActiveId] = useState("index:focus");
  const [readerLens, setReaderLens] = useState<UkraineReaderLens>("briefing");
  const readerView = useMemo(() => describeUkraineReaderLens(selected, graph, readerLens), [selected, graph, readerLens]);
  useEffect(() => { setActiveId("index:focus"); }, [selected.id]);
  const active = graph.nodes.find(node => node.id === activeId) || graph.nodes.find(node => node.id === "index:focus")!;
  const connections = graph.edges.filter(edge => edge.from === active.id || edge.to === active.id);

  const selectNode = (node: KnowledgeNode) => {
    setActiveId(node.id);
    if (node.id.startsWith("peer:") && node.regionId) onSelectRegion(node.regionId);
  };

  const exportGraph = () => {
    const output = serializeUkraineRiskKnowledgeGraph(graph);
    const blob = new Blob([output], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sr-ukraine-synthetic-graph-${selected.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className="sr-ukg" id="ukraine-risk-knowledge-graph" aria-labelledby="sr-ukg-title">
    <div className="sr-ukg-head">
      <div>
        <p className="sr-ukz-kicker">ANALYSE / UKRAINE / RISK INDEX</p>
        <h2 id="sr-ukg-title"><Network size={22} aria-hidden="true"/> Risk-index knowledge graph</h2>
        <p>Trace the selected region's <strong>fictional</strong> index through its scenario theme and other regions with similar simulated changes. Select any node to inspect its meaning; select a peer region to update the map above.</p>
      </div>
      <button type="button" className="sr-ukg-export" onClick={exportGraph}><Download size={16} aria-hidden="true"/> Export JSON</button>
    </div>
    <div className="sr-ukg-notice" role="note"><Info size={17} aria-hidden="true"/><span><strong>Demonstration graph.</strong> Index values, thematic tags and co-movement edges are fictional. ACAPS is linked for background reading only; no edge establishes cause, probability, observed severity or expert validation.</span></div>
    <div className="sr-ukg-readers">
      <div className="sr-ukg-readers-head"><strong>Choose the reader's question</strong><span>Based on ACAPS reader personas · example presentation, not validated user testing</span></div>
      <div className="sr-ukg-lenses" role="group" aria-label="Choose reader-oriented explanation">
        {(["briefing", "source-review", "scenario", "planning"] as const).map(lens => <button
          key={lens} type="button" aria-pressed={readerLens === lens}
          onClick={() => setReaderLens(lens)} className={readerLens === lens ? "active" : ""}
        >{{"briefing": "Regional briefing", "source-review": "Evidence check", "scenario": "Scenario method", "planning": "Planning horizon"}[lens]}</button>)}
      </div>
      <div className="sr-ukg-reader-detail" aria-live="polite">
        <div><span>{readerView.audience}</span><strong>{readerView.headline}</strong></div>
        <p>{readerView.explanation}</p><small>{readerView.caveat}</small>
      </div>
    </div>
    <div className="sr-ukg-legend" aria-label="Node provenance legend">
      <span><i className="sr-ukg-dot sr-ukg-dot-scenario"/> Synthetic scenario</span>
      <span><i className="sr-ukg-dot sr-ukg-dot-geography"/> Historical geography</span>
      <span><i className="sr-ukg-dot sr-ukg-dot-reference"/> ACAPS background reference</span>
    </div>
    <div className="sr-ukg-layout">
      <div className="sr-ukg-scroll" role="region" tabIndex={0} aria-label="Scrollable Ukraine risk-index knowledge graph">
        <GraphCanvas graph={graph} activeId={active.id} onNodeClick={selectNode}/>
      </div>
      <aside className="sr-ukg-details" aria-label="Selected knowledge graph node">
        <p className="sr-ukg-eyebrow">SELECTED GRAPH NODE</p>
        <h3>{active.label}</h3>
        <span className={`sr-ukg-provenance sr-ukg-provenance-${active.provenance}`}>{NODE_LABEL[active.provenance]}</span>
        <p>{active.detail}</p>
        {active.sourceUrl && <a className="sr-ukg-source-link" href={active.sourceUrl} target="_blank" rel="noopener noreferrer">Open original source <ExternalLink size={14} aria-hidden="true"/></a>}
        <h4>Relationships ({connections.length})</h4>
        {connections.length === 0 ? <p>No other nodes linked to this item.</p> : <ul className="sr-ukg-relations">
          {connections.map(edge => {
            const other = graph.nodes.find(node => node.id === (edge.from === active.id ? edge.to : edge.from));
            if (!other) return null;
            return <li key={edge.id}><button type="button" onClick={() => selectNode(other)}>{other.label}</button><span>{edge.relation}</span></li>;
          })}
        </ul>}
      </aside>
    </div>
    <p className="sr-ukg-footer">Source boundaries: historical geoBoundaries/OSM UKR ADM1, not current territorial control. The ACAPS link is independent background reading. Risk values are generated by the existing 26-week demonstration model. JSON includes no private expert data or unapproved moderator reports.</p>
  </section>;
}

function GraphCanvas({graph, activeId, onNodeClick}: {
  graph: UkraineRiskKnowledgeGraph;
  activeId: string;
  onNodeClick: (node: KnowledgeNode) => void;
}) {
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  return <div className="sr-ukg-canvas">
    <svg className="sr-ukg-lines" viewBox="0 0 1000 520" preserveAspectRatio="none" role="img" aria-label={`${graph.nodes.length} graph nodes and ${graph.edges.length} typed relationships. Use the focusable node buttons or relationship list to explore.`}>
      {graph.edges.map(edge => {
        const from = byId.get(edge.from), to = byId.get(edge.to);
        if (!from || !to) return null;
        return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.provenance === "context-only" ? "#b5874f" : edge.provenance === "geographic-metadata" ? "#7e9baa" : "#159bb0"} strokeDasharray={edge.provenance === "synthetic-scenario" ? "6 5" : undefined} strokeWidth="2" strokeOpacity="0.85" />;
      })}
    </svg>
    {graph.nodes.map(node => <button
      key={node.id}
      type="button"
      className={`sr-ukg-node sr-ukg-node-${node.kind} ${activeId === node.id ? "is-active" : ""}`}
      style={{left:`${node.x/10}%`,top:`${node.y/5.2}%`}}
      aria-pressed={activeId === node.id}
      aria-label={`${node.label}, ${NODE_LABEL[node.provenance]}. Inspect.`}
      onClick={() => onNodeClick(node)}
    ><span>{node.label}</span><small>{NODE_LABEL[node.provenance]}</small></button>)}
  </div>;
}
