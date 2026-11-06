import type { PanelStats, RiskAssessment } from "./api/types";

/** Aggregate-only presentation values. Never infer expert-level samples. */
export function boundedProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function medianMovement(first: PanelStats | null, second: PanelStats | null): number | null {
  if (!first || !second) return null;
  return Math.round((second.median - first.median) * 10) / 10;
}

export function rangeLabel(stats: PanelStats | null): string {
  return stats ? `${stats.min}–${stats.max}%` : "Not available";
}

export function roundDescription(stats: PanelStats | null): string {
  if (!stats) return "No expert forecasts submitted yet.";
  return `Panel of ${stats.n}: median ${stats.median}%, minimum ${stats.min}%, maximum ${stats.max}%, interquartile range ${stats.iqr == null ? "not available" : `${stats.iqr} percentage points`}.`;
}

export function assessmentRows(agreement: Record<RiskAssessment, number>) {
  const rows = [
    { key: "underestimated" as const, title: "Underestimated", color: "#A8322D" },
    { key: "about_right" as const, title: "About right", color: "#00738C" },
    { key: "overestimated" as const, title: "Overestimated", color: "#8D98A2" },
  ];
  const total = rows.reduce((sum, row) => sum + Math.max(0, agreement[row.key] || 0), 0);
  return rows.map((row) => ({
    ...row,
    count: Math.max(0, agreement[row.key] || 0),
    share: total ? (Math.max(0, agreement[row.key] || 0) / total) * 100 : 0,
  }));
}
