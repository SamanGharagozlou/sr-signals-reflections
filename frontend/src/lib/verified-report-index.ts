/** Curated public ACAPS reference metadata, verified against source pages on 2026-11-07.
 *  These links are NOT a live feed and are NOT guaranteed to be the latest publication.
 *  Never use these metadata to compute or support the fictional Crisis Agenda metrics.
 */
export type VerifiedReport = Readonly<{
  crisisId: string;
  title: string;
  publishedOn: string;
  verifiedOn: string;
  sourceName: "ACAPS";
  sourceUrl: string;
  subject: string;
}>;

export const VERIFIED_REPORTS: Readonly<Record<string, VerifiedReport>> = Object.freeze({
  ukraine: {
    crisisId: "ukraine",
    title: "Ukraine: May–August 2026 humanitarian access update",
    publishedOn: "2026-10-15", verifiedOn: "2026-11-07", sourceName: "ACAPS",
    sourceUrl: "https://www.acaps.org/en/countries/ukraine",
    subject: "Humanitarian access; oblast and raion comparisons",
  },
  sudan: {
    crisisId: "sudan",
    title: "Sudan: risk analysis (2026)",
    publishedOn: "2026-05-13", verifiedOn: "2026-11-07", sourceName: "ACAPS",
    sourceUrl: "https://www.acaps.org/en/countries/archives/detail/sudan-risk-analysis-2026",
    subject: "Anticipatory risks for June–December 2026",
  },
  chad: {
    crisisId: "chad",
    title: "Chad: Impact of floods",
    publishedOn: "2024-10-31", verifiedOn: "2026-11-07", sourceName: "ACAPS",
    sourceUrl: "https://www.acaps.org/en/countries/archives/detail/chad-impact-of-floods",
    subject: "Flood impacts; historical publication",
  },
  burkina: {
    crisisId: "burkina",
    title: "Burkina Faso: Humanitarian needs in blockaded areas",
    publishedOn: "2025-05-28", verifiedOn: "2026-11-07", sourceName: "ACAPS",
    sourceUrl: "https://www.acaps.org/en/countries/archives/detail/burkina-faso-humanitarian-needs-in-blockaded-areas",
    subject: "Humanitarian access and constraints in blockaded areas",
  },
});

/** Enforces conservative display invariants, independent of the report title. */
export function validateReport(record: VerifiedReport): boolean {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!record.crisisId || !record.title.trim() || !record.subject.trim()) return false;
  if (!iso.test(record.publishedOn) || !iso.test(record.verifiedOn)) return false;
  if (new Date(record.publishedOn).toISOString().slice(0, 10) !== record.publishedOn) return false;
  if (new Date(record.verifiedOn).toISOString().slice(0, 10) !== record.verifiedOn) return false;
  if (record.publishedOn > record.verifiedOn) return false;
  if (record.sourceName !== "ACAPS") return false;
  try {
    const url = new URL(record.sourceUrl);
    return url.protocol === "https:" && (url.hostname === "www.acaps.org" || url.hostname === "acaps.org") && /^\/en\//.test(url.pathname);
  } catch { return false; }
}

export function getVerifiedReport(crisisId: string): VerifiedReport | null {
  const report = Object.prototype.hasOwnProperty.call(VERIFIED_REPORTS, crisisId) ? VERIFIED_REPORTS[crisisId] : undefined;
  return report && validateReport(report) ? report : null;
}
