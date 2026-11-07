/**
 * Synthetic demonstration model — NOT an ACAPS forecast or observed Ukraine risk data.
 * Stable formulas make map, trend and correlation views internally consistent.
 */
export type Scenario = "risk" | "front" | "energy" | "displacement" | "together";
export type Pattern = "front" | "energy" | "displacement";
export interface UkraineRegion {
  id: string;
  name: string;
  path: string;
  cx: number;
  cy: number;
}
export interface ScenarioRegion extends UkraineRegion {
  pattern: Pattern;
  trend: number[];
  current: number;
  delta12: number;
}

function seed(s: string): number {
  let v = 2166136261;
  for (let i = 0; i < s.length; i++) {
    v ^= s.charCodeAt(i);
    v = Math.imul(v, 16777619);
  }
  return v >>> 0;
}

export function mock26Weeks(name: string): number[] {
  const v = seed(name);
  const group = v % 3;
  const base = 1.4 + ((v >>> 5) % 16) / 10;
  return Array.from({ length: 26 }, (_, t) => {
    const cycle = 0.38 * Math.sin(t * 0.32 + group * 1.1);
    const common = 0.28 * Math.cos(t * 0.19);
    const regional = 0.12 * Math.sin(t * 0.71 + (v % 17));
    const drift = ((v >>> 10) % 7 - 3) * (t / 25) * 0.075;
    return Math.max(0.3, Math.min(4.9, +(base + cycle + common + regional + drift).toFixed(2)));
  });
}

export function buildRegion(region: UkraineRegion): ScenarioRegion {
  const trend = mock26Weeks(region.name);
  const pattern = (["front", "energy", "displacement"] as const)[seed(region.name) % 3];
  return { ...region, trend, pattern, current: trend[25], delta12: +(trend[25] - trend[13]).toFixed(2) };
}

export function weeklyChanges(series: number[]): number[] {
  return series.slice(1).map((value, index) => value - series[index]);
}

export function pearson(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let numerator = 0, va = 0, vb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    numerator += x * y; va += x * x; vb += y * y;
  }
  if (va === 0 || vb === 0) return null;
  return Math.max(-1, Math.min(1, numerator / Math.sqrt(va * vb)));
}

export function colorFor(region: ScenarioRegion, selected: ScenarioRegion, mode: Scenario): string {
  if (mode === "together") {
    const corr = pearson(weeklyChanges(region.trend), weeklyChanges(selected.trend)) ?? 0;
    const idx = Math.max(0, Math.min(4, Math.floor((corr + 1) * 2.5)));
    return ["#e5ebee", "#cde6ec", "#9bd2df", "#48a9bd", "#08607b"][idx];
  }
  if (mode !== "risk") return region.pattern === mode ? "#0b7890" : "#d9e7eb";
  const idx = Math.max(0, Math.min(4, Math.floor(region.current)));
  return ["#e5edf0", "#c9e3e9", "#9ad1dd", "#53b1c4", "#0c6580"][idx];
}
