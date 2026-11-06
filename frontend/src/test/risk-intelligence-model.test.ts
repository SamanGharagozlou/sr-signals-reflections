import { describe, it, expect } from "vitest";
import { filterRiskIndex, observedResolutionRate, riskLevel, riskPortfolio, riskStatus } from "@/lib/risk-intelligence-model";
import type { RiskInventoryEntry } from "@/lib/api/types";

const fixture: RiskInventoryEntry[] = [
  { id:"R1",country:"Chad",title:"A",level:"High",status:"Active" },
  { id:"R2",country:"Chad",title:"B",level:"Medium",status:"Materialised" },
  { id:"R3",country:"Sudan",title:"C",level:"Low",status:"Not Materialised" },
  { id:"R4",country:"Sudan",title:"D",level:"",status:"" },
];

describe("source-driven humanitarian intelligence", () => {
  it("classifies qualitative ratings and missing values without inventing numerics", () => {
    expect(riskLevel("High")).toBe("High");
    expect(riskLevel("unknown")).toBe("Unrated");
    expect(riskStatus("Not Materialised")).toBe("Not materialised");
    expect(riskStatus("Materialised")).toBe("Materialised");
    expect(riskStatus("Active")).toBe("Active");
    expect(riskStatus("N/A")).toBe("Other / missing");
  });
  it("counts records consistently across status, level, geography, and cross-tab", () => {
    const p = riskPortfolio(fixture);
    expect(p.total).toBe(4);
    expect(p.countryCount).toBe(2);
    expect(p.active).toBe(1);
    expect(p.unrated).toBe(1);
    expect(p.unknownStatus).toBe(1);
    expect(p.levelRows.reduce((sum,r)=>sum+r.count,0)).toBe(p.total);
    expect(p.statusRows.reduce((sum,r)=>sum+r.count,0)).toBe(p.total);
    expect(p.matrix.flatMap(r=>r.cells).reduce((sum,c)=>sum+c.count,0)).toBe(p.total);
  });
  it("filters by source labels, not derived forecasting probabilities", () => {
    expect(filterRiskIndex(fixture,{level:"High"}).map(r=>r.id)).toEqual(["R1"]);
    expect(filterRiskIndex(fixture,{status:"Not materialised"}).map(r=>r.id)).toEqual(["R3"]);
    expect(filterRiskIndex(fixture,{search:"Sudan"}).length).toBe(2);
    expect(filterRiskIndex(fixture,{search:"no such risk"})).toEqual([]);
  });
  it("keeps explicit denominator for descriptive resolution rates", () => {
    expect(observedResolutionRate(6,4)).toBe(60);
    expect(observedResolutionRate(0,0)).toBeNull();
    expect(observedResolutionRate(-1,2)).toBeNull();
  });
  it("handles an empty inventory",()=> {
    const p=riskPortfolio([]);
    expect(p.countryRows).toEqual([]);
    expect(p.levelRows.every(r=>r.share===0)).toBe(true);
  });
});
