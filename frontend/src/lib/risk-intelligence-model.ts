import type { RiskInventoryEntry } from "@/lib/api/types";
import { normalizedCountry } from "@/lib/risk-explorer-model";

/**
 * Descriptive counts of Risk Radar records. Never treat risk level or row counts
 * as a numerical severity index, incidence rate or calibrated probability.
 */
export type RiskLevel = "High" | "Medium" | "Low" | "Unrated";
export type RiskStatus = "Active" | "Materialised" | "Not materialised" | "Other / missing";
export const LEVELS: RiskLevel[] = ["High", "Medium", "Low", "Unrated"];
export const STATUSES: RiskStatus[] = ["Active", "Materialised", "Not materialised", "Other / missing"];

export function riskLevel(value?: string | null): RiskLevel {
  const s = (value ?? "").trim().toLowerCase();
  if (/^high\b/.test(s)) return "High";
  if (/^medium\b/.test(s)) return "Medium";
  if (/^low\b/.test(s)) return "Low";
  return "Unrated";
}

export function riskStatus(value?: string | null): RiskStatus {
  const s = (value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (s === "active") return "Active";
  if (/^not\s+materiali[sz]ed$/.test(s)) return "Not materialised";
  if (/^materiali[sz]ed$/.test(s)) return "Materialised";
  return "Other / missing";
}

export type Distribution<T extends string> = { label: T; count: number; share: number };
function distribution<T extends string>(values: T[], labels: T[]): Distribution<T>[] {
  return labels.map(label => {
    const count = values.filter(v => v === label).length;
    return { label, count, share: values.length ? 100 * count / values.length : 0 };
  });
}

export function riskPortfolio(risks: RiskInventoryEntry[]) {
  const countries = new Map<string, { country: string; total: number; high: number; active: number }>();
  const byLevel = risks.map(r => riskLevel(r.level));
  const byStatus = risks.map(r => riskStatus(r.status));
  for (const r of risks) {
    const name = normalizedCountry(r.country || "Unspecified") || "Unspecified";
    const item = countries.get(name) ?? { country: name, total: 0, high: 0, active: 0 };
    item.total++;
    if (riskLevel(r.level) === "High") item.high++;
    if (riskStatus(r.status) === "Active") item.active++;
    countries.set(name, item);
  }
  const levelRows = distribution(byLevel, LEVELS);
  const statusRows = distribution(byStatus, STATUSES);
  const countryRows = [...countries.values()].sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));
  const matrix = LEVELS.map(level => ({ level, cells: STATUSES.map(status => ({
    status, count: risks.filter(r => riskLevel(r.level) === level && riskStatus(r.status) === status).length,
  })) }));
  return {
    total: risks.length,
    countryCount: countries.size,
    active: statusRows[0].count,
    high: levelRows[0].count,
    unrated: levelRows[3].count,
    unknownStatus: statusRows[3].count,
    levelRows,
    statusRows,
    countryRows,
    matrix,
  };
}

export function filterRiskIndex(
  risks: RiskInventoryEntry[],
  input: { search?: string; level?: RiskLevel | "All"; status?: RiskStatus | "All" },
) {
  const query = (input.search ?? "").trim().toLowerCase();
  return risks.filter(r => {
    if (input.level && input.level !== "All" && riskLevel(r.level) !== input.level) return false;
    if (input.status && input.status !== "All" && riskStatus(r.status) !== input.status) return false;
    if (!query) return true;
    return [r.id, r.title, r.country].some(value => (value || "").toLowerCase().includes(query));
  });
}

/** Use only official resolved outcomes, never the number of active/unknown records. */
export function observedResolutionRate(materialised: number, notMaterialised: number): number | null {
  const resolved = materialised + notMaterialised;
  return resolved > 0 && materialised >= 0 && notMaterialised >= 0
    ? 100 * materialised / resolved : null;
}
