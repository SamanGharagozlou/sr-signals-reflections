import type { RiskInventoryEntry, RiskInventory } from "@/lib/api/types";

/** Presentational helpers only. All metrics are calculated from records returned by FastAPI. */
export function normalizedCountry(value: string) {
  const clean = value.trim().toLocaleLowerCase("en").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "").replace(/\s+/g, " ");
  const aliases: Record<string, string> = {
    "united states": "United States of America", "usa": "United States of America",
    "democratic republic of the congo": "Dem. Rep. Congo", "dr congo": "Dem. Rep. Congo", "drc": "Dem. Rep. Congo",
    "republic of the congo": "Congo", "congo brazzaville": "Congo",
    "south sudan": "S. Sudan", "cote divoire": "Côte d'Ivoire", "ivory coast": "Côte d'Ivoire",
    "central african republic": "Central African Rep.", "western sahara": "W. Sahara",
    "equatorial guinea": "Eq. Guinea", "bosnia and herzegovina": "Bosnia and Herz.",
    "dominican republic": "Dominican Rep.", "solomon islands": "Solomon Is.",
    "north macedonia": "Macedonia", "east timor": "Timor-Leste", "eswatini": "eSwatini",
    "myanmar (burma)": "Myanmar", "the gambia": "Gambia", "gambia, the": "Gambia",
    "syria": "Syria", "russian federation": "Russia", "tanzania, united republic of": "Tanzania",
    "vietnam": "Vietnam", "laos": "Laos", "palestinian territories": "Palestine",
    "state of palestine": "Palestine", "west bank and gaza": "Palestine",
  };
  return aliases[clean] || value.trim();
}

export type ExplorerMode = "all" | "active" | "high";
export function isActiveRisk(risk: RiskInventoryEntry) {
  return (risk.status || "").trim().toLowerCase() === "active";
}
export function isHighRisk(risk: RiskInventoryEntry) {
  return /\bhigh\b/i.test(risk.level || "");
}
export function filteredRisks(risks: RiskInventoryEntry[], mode: ExplorerMode, query = "") {
  const text = query.trim().toLowerCase();
  return risks.filter(r => {
    if (mode === "active" && !isActiveRisk(r)) return false;
    if (mode === "high" && !isHighRisk(r)) return false;
    if (!text) return true;
    return [r.country, r.id, r.title].some(v => (v || "").toLowerCase().includes(text));
  });
}
export interface CountryAggregate {
  country: string;
  risks: RiskInventoryEntry[];
  high: number;
  active: number;
  highest: "high" | "medium" | "low" | "unrated";
}
export function groupByCountry(risks: RiskInventoryEntry[]): CountryAggregate[] {
  const grouped = new Map<string, CountryAggregate>();
  for (const risk of risks) {
    const key = normalizedCountry(risk.country || "Unspecified");
    const country = grouped.get(key) ?? { country: key, risks: [], high: 0, active: 0, highest: "unrated" as const };
    country.risks.push(risk);
    if (isHighRisk(risk)) country.high++;
    if (isActiveRisk(risk)) country.active++;
    if (isHighRisk(risk)) country.highest = "high";
    else if (/medium/i.test(risk.level || "") && country.highest !== "high") country.highest = "medium";
    else if (/low/i.test(risk.level || "") && country.highest === "unrated") country.highest = "low";
    grouped.set(key, country);
  }
  return Array.from(grouped.values()).sort((a,b) => b.high-a.high || b.active-a.active || a.country.localeCompare(b.country));
}
export function riskInventorySummary(data: RiskInventory) {
  const risks = data.risks;
  return {
    records: risks.length,
    countries: new Set(risks.map(r=>normalizedCountry(r.country || "Unspecified"))).size,
    active: risks.filter(isActiveRisk).length,
    high: risks.filter(isHighRisk).length,
    statusAvailable: risks.length > 0 && risks.some(r=>typeof r.status === "string" && r.status.length > 0),
  };
}
