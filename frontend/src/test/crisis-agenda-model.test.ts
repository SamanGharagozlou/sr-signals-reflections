import { describe, expect, it } from "vitest";
import { DEMO_CRISES, isUnderCovered, orderCrises } from "@/lib/crisis-agenda-model";

describe("Phase 15E scenario model", () => {
  it("has 14 distinct synthetic crises", () => {
    expect(DEMO_CRISES).toHaveLength(14);
    expect(new Set(DEMO_CRISES.map(c=>c.id)).size).toBe(14);
  });
  it("does not mutate fixture when sorting and filtering", () => {
    const before=DEMO_CRISES.map(c=>c.id).join(",");
    expect(orderCrises(DEMO_CRISES,"need","All",false)[0].id).toBe("sudan");
    expect(DEMO_CRISES.map(c=>c.id).join(",")).toBe(before);
    expect(orderCrises(DEMO_CRISES,"recent","Europe",false).map(c=>c.id)).toEqual(["ukraine"]);
  });
  it("includes the zero-expert invitation cases", () => {
    expect(DEMO_CRISES.find(c=>c.id==="burkina")?.experts).toHaveLength(0);
    expect(DEMO_CRISES.find(c=>c.id==="cameroon")?.experts).toHaveLength(0);
  });
  it("computes coverage from explicit demonstration criteria", () => {
    expect(isUnderCovered(DEMO_CRISES.find(c=>c.id==="burkina")!)).toBe(true);
    expect(isUnderCovered(DEMO_CRISES.find(c=>c.id==="sudan")!)).toBe(false);
  });
  it("only includes trusted ACAPS website destinations", () => {
    for (const c of DEMO_CRISES) if (c.sourceUrl) {
      const url = new URL(c.sourceUrl);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("www.acaps.org");
    }
  });
});
