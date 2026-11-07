import { describe, expect, it } from "vitest";
import { buildRegion } from "@/lib/ukraine-zoom-model";
import { buildUkraineRiskKnowledgeGraph, describeUkraineReaderLens, serializeUkraineRiskKnowledgeGraph } from "@/lib/ukraine-risk-knowledge-graph-model";

const mk = (id: string, name: string) => buildRegion({id,name,path:"M0 0Z",cx:0,cy:0});
const regions = [
  mk("a","Zakarpattia"),mk("b","Kyiv"),mk("c","Odesa"),mk("d","Kharkiv"),
  mk("e","Lviv"),mk("f","Kherson"),mk("g","Poltava"),
];
const context = {title:"ACAPS background report",publishedOn:"2026-10-15",sourceUrl:"https://www.acaps.org/en/countries/ukraine"};

describe("Phase 15I Ukraine synthetic risk knowledge graph", () => {
  it("is deterministic, versioned and scoped to one selected oblast", () => {
    const a = buildUkraineRiskKnowledgeGraph(regions, regions[0], context);
    expect(a).toEqual(buildUkraineRiskKnowledgeGraph(regions, regions[0], context));
    expect(a.schemaVersion).toBe("sr.ukraine.synthetic-knowledge-graph.v1");
    expect(a.selectedRegionId).toBe("a");
    expect(a.nodes.some(x=>x.label==="Zakarpattia")).toBe(true);
  });
  it("has no dangling edges or duplicate node ids", () => {
    const graph = buildUkraineRiskKnowledgeGraph(regions, regions[0], context);
    const ids = graph.nodes.map(n=>n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const edge of graph.edges) {
      expect(ids).toContain(edge.from);
      expect(ids).toContain(edge.to);
      expect(edge.relation.length).toBeGreaterThan(0);
    }
  });
  it("includes up to four selectable regions, never the focus itself", () => {
    const graph = buildUkraineRiskKnowledgeGraph(regions, regions[0], context);
    const peers = graph.nodes.filter(n => n.id.startsWith("peer:"));
    expect(peers).toHaveLength(4);
    expect(peers.every(n => n.regionId!=="a")).toBe(true);
    expect(graph.edges.filter(e=>e.coefficient!==undefined)).toHaveLength(4);
    expect(graph.edges.filter(e=>e.coefficient!==undefined).every(e=>e.coefficient!>=-1&&e.coefficient!<=1)).toBe(true);
  });
  it("is explicit about synthetic provenance of every numeric edge and index", () => {
    const graph=buildUkraineRiskKnowledgeGraph(regions,regions[0],context);
    expect(graph.nodes.find(n=>n.id==="index:focus")?.provenance).toBe("synthetic-scenario");
    expect(graph.edges.filter(e=>e.coefficient!==undefined).every(e=>e.provenance==="synthetic-scenario")).toBe(true);
    expect(graph.indexBasis).toBe("fictional-26-week-scenario");
  });
  it("does not treat ACAPS contextual reading as index evidence", () => {
    const graph=buildUkraineRiskKnowledgeGraph(regions,regions[0],context);
    expect(graph.nodes.find(n=>n.id==="source:acaps")?.provenance).toBe("context-only");
    expect(graph.edges.find(e=>e.to==="source:acaps")?.relation).toContain("not score evidence");
    expect(graph.edges.some(e=>e.from==="source:acaps"&&e.to==="index:focus")).toBe(false);
  });
  it("rejects untrusted report domain and handles missing report gracefully", () => {
    const fake={...context,sourceUrl:"https://example.com/impostor"};
    expect(buildUkraineRiskKnowledgeGraph(regions,regions[0],fake).nodes.some(n=>n.id==="source:acaps")).toBe(false);
    expect(buildUkraineRiskKnowledgeGraph(regions,regions[0],null).nodes.some(n=>n.id==="source:acaps")).toBe(false);
  });
  it("does not fabricate a correlation if only one region exists", () => {
    const graph=buildUkraineRiskKnowledgeGraph([regions[0]],regions[0],null);
    expect(graph.nodes.filter(n=>n.id.startsWith("peer:"))).toHaveLength(0);
  });
  it("rejects an absent selected region", () => {
    expect(()=>buildUkraineRiskKnowledgeGraph(regions,mk("unknown","Unknown"),null)).toThrow(/absent/);
  });
  it("supports four ACAPS persona-inspired reading lenses without changing scores", () => {
    const g = buildUkraineRiskKnowledgeGraph(regions, regions[0], context);
    const before = JSON.stringify(g);
    const briefing = describeUkraineReaderLens(regions[0], g, "briefing");
    const evidence = describeUkraineReaderLens(regions[0], g, "source-review");
    const scenario = describeUkraineReaderLens(regions[0], g, "scenario");
    const planning = describeUkraineReaderLens(regions[0], g, "planning");
    expect(briefing.audience).toContain("Jose");
    expect(evidence.audience).toContain("Emily");
    expect(scenario.audience).toContain("Pierre");
    expect(planning.audience).toContain("Aisha");
    expect([briefing, evidence, scenario, planning].every(x => x.caveat.length > 20)).toBe(true);
    expect(JSON.stringify(g)).toBe(before);
  });
  it("does not misrepresent linked ACAPS reading as a risk measurement", () => {
    const g = buildUkraineRiskKnowledgeGraph(regions, regions[0], context);
    const summary = describeUkraineReaderLens(regions[0], g, "source-review");
    expect(summary.explanation).toContain("background reading only");
  });
  it("exports valid JSON without private expert or moderator fields", () => {
    const graph=buildUkraineRiskKnowledgeGraph(regions,regions[0],context);
    const json=serializeUkraineRiskKnowledgeGraph(graph);
    expect(JSON.parse(json)).toEqual(graph);
    expect(json.endsWith("\n")).toBe(true);
    expect(json).not.toMatch(/expert_email|moderator_token|private_forecast/i);
  });
});
