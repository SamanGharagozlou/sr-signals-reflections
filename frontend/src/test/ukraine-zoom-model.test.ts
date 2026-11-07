import { describe, expect, it } from "vitest";
import { buildRegion, mock26Weeks, pearson, colorFor } from "@/lib/ukraine-zoom-model";

describe("Ukraine synthetic country zoom", () => {
  it("produces stable, bounded 26-week illustrative series", () => {
    const a = mock26Weeks("Zakarpattia");
    expect(a).toHaveLength(26);
    expect(a).toEqual(mock26Weeks("Zakarpattia"));
    expect(a.every(v => v >= 0.3 && v <= 4.9)).toBe(true);
  });
  it("computes symmetric correlations and flags constant series", () => {
    expect(pearson([1,2,3],[1,2,3])).toBeCloseTo(1);
    expect(pearson([1,2,3],[3,2,1])).toBeCloseTo(-1);
    expect(pearson([1,1,1],[1,2,3])).toBeNull();
    expect(pearson([1,2],[1])).toBeNull();
  });
  it("keeps layer colors and selected-region computations deterministic", () => {
    const a = buildRegion({id:"r1",name:"Zakarpattia",path:"M0 0Z",cx:10,cy:10});
    expect(a.trend[25]).toBe(a.current);
    expect(colorFor(a, a, "together")).toBe("#08607b");
  });
});
