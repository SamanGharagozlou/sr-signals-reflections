import { describe, expect, it } from "vitest";
import { filteredRisks, groupByCountry, normalizedCountry, riskInventorySummary } from "@/lib/risk-explorer-model";
import type { RiskInventory } from "@/lib/api/types";

const inventory: RiskInventory = {
  count: 3,
  source: "synthetic fixtures",
  risks: [
    { id: "R1043", title: "Chad cross-border attacks", country: "Chad", level: "High", status: "Active" },
    { id: "R2000", title: "South Sudan access", country: "South Sudan", level: "Medium", status: "Materialised" },
    { id: "R3000", title: "Chad local markets", country: "Chad", level: "Low", status: "Active" },
  ],
};

describe("Risk Explorer source-based filters", () => {
  it("uses actual risk records, not hard-coded world summary metrics", () => {
    expect(riskInventorySummary(inventory)).toMatchObject({ records: 3, countries: 2, active: 2, high: 1 });
  });
  it("filters active statuses without presenting resolved risks as active", () => {
    expect(filteredRisks(inventory.risks, "active").map(r => r.id)).toEqual(["R1043", "R3000"]);
    expect(filteredRisks(inventory.risks, "high").map(r => r.id)).toEqual(["R1043"]);
  });
  it("keeps country aliases mappable and records selectable", () => {
    expect(normalizedCountry("South Sudan")).toBe("S. Sudan");
    expect(groupByCountry(inventory.risks).find(c => c.country === "Chad")?.risks).toHaveLength(2);
  });
  it("searches country, identifier and title", () => {
    expect(filteredRisks(inventory.risks, "all", "south sudan")).toHaveLength(1);
    expect(filteredRisks(inventory.risks, "all", "R3000")).toHaveLength(1);
  });
});
