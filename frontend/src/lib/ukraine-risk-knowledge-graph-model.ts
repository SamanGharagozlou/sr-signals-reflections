/**
 * S&R / Ukraine risk-index knowledge graph — synthetic demonstration only.
 *
 * The graph makes *declared relationships* explicit; it does not claim causality.
 * Index values, theme assignments and time-series correlations come entirely from
 * the pre-existing fictional Phase 15D Ukraine model. Official ACAPS context is
 * reference-only and NEVER treated as evidence for numeric synthetic values.
 */
import { pearson, weeklyChanges, type ScenarioRegion } from "@/lib/ukraine-zoom-model";

export type KnowledgeNodeKind = "country" | "region" | "index" | "theme" | "geography" | "reference";
export type KnowledgeProvenance = "geographic-metadata" | "synthetic-scenario" | "context-only";

export interface KnowledgeNode {
  id: string;
  label: string;
  detail: string;
  kind: KnowledgeNodeKind;
  provenance: KnowledgeProvenance;
  x: number; // SVG layout only, not real geographic coordinates
  y: number;
  regionId?: string;
  sourceUrl?: string;
}

export interface KnowledgeEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  provenance: KnowledgeProvenance;
  coefficient?: number;
}

export interface UkraineRiskKnowledgeGraph {
  schemaVersion: "sr.ukraine.synthetic-knowledge-graph.v1";
  country: "Ukraine";
  indexBasis: "fictional-26-week-scenario";
  selectedRegionId: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

/** Reader needs derived from ACAPS "Understanding our readers through personas" (pp. 2–5).
 * These are presentation lenses, NOT forecasts, authorization roles or person profiles.
 */
export type UkraineReaderLens = "briefing" | "source-review" | "scenario" | "planning";

export interface ReaderLensSummary {
  label: string;
  audience: string;
  headline: string;
  explanation: string;
  caveat: string;
}

/** No external queries, new datasets, or decisions: reframe only existing synthetic graph. */
export function describeUkraineReaderLens(
  selected: ScenarioRegion,
  graph: UkraineRiskKnowledgeGraph,
  lens: UkraineReaderLens,
): ReaderLensSummary {
  const all = graph.nodes.filter(node => node.id.startsWith("peer:"));
  const topPeer = all[0];
  const movement = `${selected.delta12 >= 0 ? "+" : ""}${selected.delta12.toFixed(2)}`;
  const theme = THEME_NAMES[selected.pattern].toLowerCase();
  switch (lens) {
    case "briefing":
      return {
        label: "Regional briefing", audience: "Jose · regional information user",
        headline: `${selected.name}: illustrative index ${selected.current.toFixed(2)} / 5`,
        explanation: `The fictional index changed ${movement} over 12 weeks. ${topPeer ? `${topPeer.label} is one of the most similarly moving simulated regions.` : "No comparable simulated region is available."} Use this view to rehearse concise cross-region synthesis, not to brief real operations.`,
        caveat: "A model-generated comparison, not a priority ranking or an ACAPS finding.",
      };
    case "source-review":
      return {
        label: "Evidence and assumptions", audience: "Emily · global methodology producer",
        headline: "Separate context references from computed scenario values",
        explanation: `The index and weekly co-movement are generated from fictional series. Administrative boundaries are historical; ${graph.nodes.some(node => node.id === "source:acaps") ? "the ACAPS source is background reading only" : "no curated ACAPS background reading is available"}. Select nodes to inspect their provenance.`,
        caveat: "No observed regional severity, source-confidence score, or independently verified index is supplied.",
      };
    case "scenario":
      return {
        label: "Scenario exploration", audience: "Pierre · field information producer",
        headline: `Illustrative scenario: ${theme}`,
        explanation: `The ${selected.name} scenario uses a deterministic 26-week series and a hypothetical ${theme} tag. Similarity edges represent Pearson correlation of simulated weekly changes, not a causal mechanism.`,
        caveat: "Requires verified field evidence, methodology review and expert assessment before operational use.",
      };
    case "planning":
      return {
        label: "Planning horizon", audience: "Aisha · field information user",
        headline: "A six-month illustrative horizon, not a resource-allocation forecast",
        explanation: `The 26-week demonstration helps explain how a planning-oriented outlook could be presented for ${selected.name}. Its fictional index cannot support funding decisions, beneficiary targeting or prioritization.`,
        caveat: "Real planning would require validated needs, capacity, access, trends and dated evidence.",
      };
  }
}

export interface UkraineReportContext {
  title: string;
  publishedOn: string;
  sourceUrl: string;
}

const THEME_NAMES: Record<ScenarioRegion["pattern"], string> = {
  front: "Front-line pressure",
  energy: "Energy disruption",
  displacement: "Displacement",
};

/** Stable graph for the selected administrative region; maximum four other regions. */
export function buildUkraineRiskKnowledgeGraph(
  regions: readonly ScenarioRegion[],
  selected: ScenarioRegion,
  report: UkraineReportContext | null,
): UkraineRiskKnowledgeGraph {
  if (!regions.some(region => region.id === selected.id)) {
    throw new Error("Selected Ukraine region is absent from the mapped dataset");
  }
  const peers = regions
    .filter(region => region.id !== selected.id)
    .map(region => ({
      region,
      correlation: pearson(weeklyChanges(selected.trend), weeklyChanges(region.trend)),
    }))
    .filter((item): item is { region: ScenarioRegion; correlation: number } => item.correlation !== null)
    .sort((a, b) => b.correlation - a.correlation || a.region.name.localeCompare(b.region.name))
    .slice(0, 4);

  const nodes: KnowledgeNode[] = [
    {
      id: "country:ukraine", label: "Ukraine", detail: "Country grouping for a historical ADM1 boundary layer.",
      kind: "country", provenance: "geographic-metadata", x: 120, y: 110,
    },
    {
      id: "region:focus", label: selected.name,
      detail: "Selected administrative region, identified from historical geospatial metadata.",
      kind: "region", provenance: "geographic-metadata", regionId: selected.id, x: 352, y: 110,
    },
    {
      id: "index:focus", label: `Index ${selected.current.toFixed(2)}`,
      detail: `Fictional latest weekly index: ${selected.current.toFixed(2)} / 5; 12-week fictional change: ${selected.delta12 >= 0 ? "+" : ""}${selected.delta12.toFixed(2)}. Not observed or calibrated.`,
      kind: "index", provenance: "synthetic-scenario", x: 595, y: 110,
    },
    {
      id: "theme:focus", label: THEME_NAMES[selected.pattern],
      detail: `A deterministic fictional scenario classification for ${selected.name}; not a documented real-world driver.`,
      kind: "theme", provenance: "synthetic-scenario", x: 839, y: 110,
    },
    {
      id: "source:geometry", label: "Historical ADM1 map",
      detail: "geoBoundaries/OSM-derived historical administrative shapes (2017 reference). Not territorial control or evidence for risk values.",
      kind: "geography", provenance: "geographic-metadata", x: 120, y: 367,
      sourceUrl: "https://www.geoboundaries.org/",
    },
  ];

  const edges: KnowledgeEdge[] = [
    { id: "e:country-region", from: "country:ukraine", to: "region:focus", relation: "geographic grouping", provenance: "geographic-metadata" },
    { id: "e:region-index", from: "region:focus", to: "index:focus", relation: "fictional index for region", provenance: "synthetic-scenario" },
    { id: "e:index-theme", from: "index:focus", to: "theme:focus", relation: "illustrative pattern tag", provenance: "synthetic-scenario" },
    { id: "e:country-geo", from: "country:ukraine", to: "source:geometry", relation: "historic map geometry only", provenance: "geographic-metadata" },
  ];

  const positions = [
    [590, 280], [840, 280], [590, 442], [840, 442],
  ] as const;
  peers.forEach((item, i) => {
    const id = `peer:${item.region.id}`;
    nodes.push({
      id,
      label: item.region.name,
      detail: `Illustrative index ${item.region.current.toFixed(2)} / 5. Weekly-change correlation with ${selected.name}: ${item.correlation.toFixed(2)} (synthetic; no causal inference).`,
      kind: "region", provenance: "synthetic-scenario", regionId: item.region.id,
      x: positions[i][0], y: positions[i][1],
    });
    edges.push({
      id: `e:peer:${item.region.id}`, from: "index:focus", to: id,
      relation: `fictional co-movement (r=${item.correlation.toFixed(2)})`,
      provenance: "synthetic-scenario", coefficient: Number(item.correlation.toFixed(4)),
    });
  });

  if (report && /^https:\/\/www\.acaps\.org\/en\//.test(report.sourceUrl)) {
    nodes.push({
      id: "source:acaps", label: "ACAPS reading",
      detail: `${report.title} · published ${report.publishedOn}. Background context only; does not validate this index or its correlations.`,
      kind: "reference", provenance: "context-only", sourceUrl: report.sourceUrl, x: 350, y: 367,
    });
    edges.push({
      id: "e:country-reading", from: "country:ukraine", to: "source:acaps",
      relation: "contextual reading, not score evidence", provenance: "context-only",
    });
  }

  return {
    schemaVersion: "sr.ukraine.synthetic-knowledge-graph.v1",
    country: "Ukraine",
    indexBasis: "fictional-26-week-scenario",
    selectedRegionId: selected.id,
    nodes, edges,
  };
}

/** Self-contained, versioned export for inspection; no private panel data included. */
export function serializeUkraineRiskKnowledgeGraph(graph: UkraineRiskKnowledgeGraph): string {
  return JSON.stringify(graph, null, 2) + "\n";
}
