import { describe, it, expect } from "vitest";
import { cumulativeByWeek, outlookSeries, scenarioFinal, DEMO_EVENTS } from "@/lib/outlook-model";

describe("Educational outlook scenario model", () => {
  it("begins at zero and reaches exactly the chosen six-month input", () => {
    for (const p of [0, 1, 30, 55, 95, 100]) {
      expect(cumulativeByWeek(p, 0)).toBe(0);
      expect(cumulativeByWeek(p, 26)).toBeCloseTo(p, 8);
    }
  });
  it("never creates decreasing cumulative probabilities", () => {
    for (const event of DEMO_EVENTS) {
      const result = outlookSeries(event.base, 0, 15);
      expect(result).toHaveLength(27);
      for (let t = 1; t < result.length; t++) {
        for (const key of ["baseline", "adjusted", "lower", "upper"] as const) {
          expect(result[t][key]).toBeGreaterThanOrEqual(result[t - 1][key]);
        }
        expect(result[t].lower).toBeLessThanOrEqual(result[t].adjusted);
        expect(result[t].adjusted).toBeLessThanOrEqual(result[t].upper);
      }
    }
  });
  it("clamps invented user inputs, and never returns NaN", () => {
    expect(scenarioFinal(92, 35)).toBe(100);
    expect(scenarioFinal(5, -30)).toBe(0);
    expect(cumulativeByWeek(NaN, 6)).toBe(0);
    for (const point of outlookSeries(55, 20, 10)) {
      expect(Object.values(point).every(Number.isFinite)).toBe(true);
    }
  });
  it("keeps the base curve unchanged when only sensitivity changes", () => {
    const a = outlookSeries(55, 10, 5);
    const b = outlookSeries(55, 10, 25);
    expect(a.map(v => v.adjusted)).toEqual(b.map(v => v.adjusted));
    expect(a[26].lower).not.toBe(b[26].lower);
  });
});
