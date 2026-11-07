import { describe, expect, it } from "vitest";
import { VERIFIED_REPORTS, getVerifiedReport, validateReport } from "@/lib/verified-report-index";

describe("Phase 15F curated ACAPS report metadata", () => {
  it("accepts all pinned, dated source references", () => {
    expect(Object.keys(VERIFIED_REPORTS).length).toBe(4);
    for (const [id, report] of Object.entries(VERIFIED_REPORTS)) {
      expect(id).toBe(report.crisisId);
      expect(validateReport(report)).toBe(true);
    }
  });
  it("does not invent reports for countries without a verified reference", () => {
    expect(getVerifiedReport("cameroon")).toBeNull();
    expect(getVerifiedReport("__proto__")).toBeNull();
  });
  it("rejects untrusted URLs, impossible dates and future publication dates", () => {
    const sample = VERIFIED_REPORTS.chad;
    expect(validateReport({ ...sample, sourceUrl: "http://www.acaps.org/en/countries/chad" })).toBe(false);
    expect(validateReport({ ...sample, sourceUrl: "https://www.acaps.org.evil.com/en/countries/chad" })).toBe(false);
    expect(validateReport({ ...sample, publishedOn: "2026-11-08" })).toBe(false);
    expect(validateReport({ ...sample, publishedOn: "2026-02-30" })).toBe(false);
  });
});
