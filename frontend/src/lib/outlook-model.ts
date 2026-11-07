/**
 * Educational scenario visualization, NOT a forecast model.
 * For an assumed 26-week occurrence probability p26, impose a constant weekly hazard
 * purely to construct a monotonic cumulative occurrence curve.
 * p(t) = 1 - (1 - p26)^(t/26). There is no historical fitting or stochastic simulation.
 */
export const OUTLOOK_WEEKS = 26;

export const DEMO_EVENTS = [
  { id: "cross-border", title: "Cross-border displacement", subtitle: "R1043-linked illustration", base: 55 },
  { id: "flood", title: "Flood-related disruption", subtitle: "Fictional comparison scenario", base: 40 },
  { id: "health", title: "Health-service disruption", subtitle: "Fictional comparison scenario", base: 30 },
] as const;

export type ScenarioEvent = (typeof DEMO_EVENTS)[number];

export function clampPercent(input: number): number {
  return Number.isFinite(input) ? Math.min(100, Math.max(0, input)) : 0;
}

export function cumulativeByWeek(finalPercent: number, week: number, horizon = OUTLOOK_WEEKS): number {
  const p = clampPercent(finalPercent) / 100;
  if (!Number.isFinite(week) || !Number.isFinite(horizon) || horizon <= 0) return 0;
  const t = Math.min(horizon, Math.max(0, week));
  if (t === 0 || p === 0) return 0;
  if (p === 1) return 100;
  return 100 * (1 - Math.pow(1 - p, t / horizon));
}

export interface OutlookPoint { week: number; baseline: number; adjusted: number; lower: number; upper: number; }

export function outlookSeries(base: number, shift: number, sensitivity: number): OutlookPoint[] {
  const baseline = clampPercent(base);
  const adjusted = clampPercent(baseline + (Number.isFinite(shift) ? shift : 0));
  const spread = Math.min(50, Math.max(0, Number.isFinite(sensitivity) ? sensitivity : 0));
  return Array.from({ length: OUTLOOK_WEEKS + 1 }, (_, week) => ({
    week,
    baseline: cumulativeByWeek(baseline, week),
    adjusted: cumulativeByWeek(adjusted, week),
    lower: cumulativeByWeek(clampPercent(adjusted - spread), week),
    upper: cumulativeByWeek(clampPercent(adjusted + spread), week),
  }));
}

export function scenarioFinal(base: number, shift: number): number {
  return clampPercent(clampPercent(base) + (Number.isFinite(shift) ? shift : 0));
}

export function scenarioNarrative(base: number, shift: number): string {
  const after = scenarioFinal(base, shift);
  const before = clampPercent(base);
  if (after === before) return `The illustrative endpoint remains ${Math.round(after)}%. No assumption shift is applied.`;
  return `Your hypothetical adjustment moves the six-month endpoint from ${Math.round(before)}% to ${Math.round(after)}%. This does not measure the real effect of any trigger or intervention.`;
}
