import snapshot from "./acaps-archive-snapshot.json";

export type AcapsPublication = Readonly<{
  id: string;
  country: string;
  publishedOn: string;
  title: string;
  topic: string;
  summary: string;
  reportUrl: string;
  detailUrl: string;
  linkType: "pdf" | "report-page" | "country-page";
  linkBasis: "provided-by-team" | "verified-acaps-page";
}>;

export function isSafeAcapsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "www.acaps.org" || url.username || url.password) return false;
    if (url.search || url.hash) return false;
    return url.pathname.startsWith("/en/countries/") ||
      (/^\/fileadmin\/Data_Product\/Main_media\/[A-Za-z0-9_().%-]+\.pdf$/i.test(url.pathname));
  } catch { return false; }
}

export function isValidPublication(r: AcapsPublication): boolean {
  if (!r.id || !r.country.trim() || !r.title.trim() || !r.summary.trim() || !r.topic.trim()) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.publishedOn)) return false;
  if (Number.isNaN(Date.parse(`${r.publishedOn}T00:00:00Z`))) return false;
  if (!isSafeAcapsUrl(r.reportUrl) || !isSafeAcapsUrl(r.detailUrl)) return false;
  if (!(["pdf", "report-page", "country-page"] as string[]).includes(r.linkType)) return false;
  if (r.linkType === "pdf" && !r.reportUrl.toLowerCase().endsWith(".pdf")) return false;
  if (r.linkType !== "pdf" && r.reportUrl.toLowerCase().endsWith(".pdf")) return false;
  return r.linkBasis === "provided-by-team" || r.linkBasis === "verified-acaps-page";
}

export const ARCHIVE_CHECKED_ON: string = snapshot.checkedOn;
export const ACAPS_ARCHIVE_URL = "https://www.acaps.org/en/countries/archives";
export const ACAPS_PUBLICATIONS: ReadonlyArray<AcapsPublication> = Object.freeze(
  (snapshot.items as AcapsPublication[]).filter(isValidPublication)
    .sort((a,b)=>b.publishedOn.localeCompare(a.publishedOn) || a.country.localeCompare(b.country))
);

export const ACAPS_COUNTRIES = Object.freeze([...new Set(ACAPS_PUBLICATIONS.map(x=>x.country))].sort());
export function filterAcapsPublications(country: string, query: string): AcapsPublication[] {
  const needle = query.trim().toLocaleLowerCase();
  return ACAPS_PUBLICATIONS.filter(r =>
    (country === "All countries" || r.country === country) &&
    (!needle || `${r.country} ${r.title} ${r.topic} ${r.summary}`.toLocaleLowerCase().includes(needle))
  );
}
