import { describe, expect, it } from "vitest";
import { DEFAULT_SCENARIO, scenarioMemo, simulateSpillover } from "@/lib/spillover-model";

describe("S&R bounded spillover sensitivity demo", () => {
  it("has no effect without an assumed shock", () => {
    const s=simulateSpillover({ ...DEFAULT_SCENARIO, intensity:0 });
    expect(s).toEqual({ origin:0, displacement:0, access:0, basicNeeds:0, regional:0 });
  });
  it("disabling movement removes regional movement-driven pressure", () => {
    const s=simulateSpillover({ ...DEFAULT_SCENARIO, enabled:{ ...DEFAULT_SCENARIO.enabled, movement:false } });
    expect(s.displacement).toBe(0); expect(s.regional).toBe(0);
    expect(s.access).toBeGreaterThan(0);
  });
  it("time delay blocks later effects until the corresponding week", () => {
    const s=simulateSpillover({ ...DEFAULT_SCENARIO, week:0 });
    expect(s.displacement).toBe(0); expect(s.basicNeeds).toBe(0);
  });
  it("clamps all outputs within 0..100 and remains deterministic", () => {
    const v={ ...DEFAULT_SCENARIO,intensity:999,transmission:999 };
    const a=simulateSpillover(v); expect(a).toEqual(simulateSpillover(v));
    for(const n of Object.values(a)) {expect(n).toBeGreaterThanOrEqual(0);expect(n).toBeLessThanOrEqual(100);}
  });
  it("labels exported notes as assumed, not verified forecasts", () => {
    const note=scenarioMemo(DEFAULT_SCENARIO,simulateSpillover(DEFAULT_SCENARIO),"5/5 synthetic panel");
    expect(note).toContain("NOT an approved public report");
    expect(note).toContain("NOT empirical event probabilities");
  });
});
