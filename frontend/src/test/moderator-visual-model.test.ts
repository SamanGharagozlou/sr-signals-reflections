import { describe, expect, it } from "vitest";
import { assessmentRows, boundedProbability, medianMovement, rangeLabel, roundDescription } from "@/lib/moderator-visual-model";
import type { PanelStats } from "@/lib/api/types";

const first: PanelStats = { n: 5, min: 30, max: 85, median: 70, iqr: 18, q1: null, q3: null, mad: 7 };
const second: PanelStats = { n: 5, min: 45, max: 80, median: 55, iqr: 12, q1: null, q3: null, mad: 5 };

describe("moderator aggregate-only visual model", () => {
  it("restricts axis coordinates to the 0–100% range", () => {
    expect(boundedProbability(-30)).toBe(0);
    expect(boundedProbability(115)).toBe(100);
    expect(boundedProbability(NaN)).toBe(0);
    expect(boundedProbability(72)).toBe(72);
  });
  it("describes only values actually returned by the server", () => {
    expect(roundDescription(first)).toContain("interquartile range 18 percentage points");
    expect(roundDescription(first)).not.toContain("quartile bounds");
    expect(rangeLabel(first)).toBe("30–85%");
    expect(rangeLabel(null)).toBe("Not available");
  });
  it("compares observed medians without imputing revisions", () => {
    expect(medianMovement(first, second)).toBe(-15);
    expect(medianMovement(first, null)).toBeNull();
  });
  it("uses only aggregate rating counts", () => {
    const rows = assessmentRows({ underestimated: 2, about_right: 3, overestimated: 0 });
    expect(rows.map((r) => r.count)).toEqual([2, 3, 0]);
    expect(rows.map((r) => r.share)).toEqual([40, 60, 0]);
  });
});
