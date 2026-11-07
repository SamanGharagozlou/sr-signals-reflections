/**
 * S&R illustrative shock-sensitivity sandbox. Never describes a fitted, calibrated,
 * empirical, or ACAPS-approved causal/forecasting model.
 * Values are relative scenario pressure points (0..100), NOT probabilities.
 * Changing one parameter holds all others fixed. No sensitive expert-level data.
 */
export type Shock = "conflict" | "flood" | "movement";
export type Channel = "movement" | "access" | "needs" | "regional";
export const CHANNELS: { id: Channel; name: string; explanation: string }[] = [
  { id: "movement", name: "Cross-border movement", explanation: "Shock to displacement pressure in Chad" },
  { id: "access", name: "Humanitarian access", explanation: "Shock to aid-route disruption" },
  { id: "needs", name: "Basic needs", explanation: "Secondary pressure from movement and access" },
  { id: "regional", name: "Regional effects", explanation: "Possible secondary pressure beyond Chad" },
];
export const SHOCK_LABEL: Record<Shock, string> = {
  conflict: "Sudan conflict escalation", flood: "Severe flooding", movement: "Border displacement surge",
};
export interface ScenarioInput {
  shock: Shock;
  intensity: number; // 0..100 assumed strength, not source data
  transmission: number; // 0..100 intervention/sensitivity adjustment
  delayWeeks: number; // 0..6 lag
  week: number; // 0..12 time cursor
  enabled: Record<Channel, boolean>;
}
export interface ScenarioOutput {
  origin: number;
  displacement: number;
  access: number;
  basicNeeds: number;
  regional: number;
}
const clamp = (n: number, min = 0, max = 100) => Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
const progress = (week: number, lag: number) => {
  const t = Math.max(0, Math.min(12, week) - lag);
  return 1 - Math.exp(-t / 3.0);
};
/** All coefficients are explicitly fictional assumptions. */
export function simulateSpillover(v: ScenarioInput): ScenarioOutput {
  const severity = clamp(v.intensity);
  const transfer = clamp(v.transmission) / 100;
  const lag = clamp(v.delayWeeks, 0, 6);
  const now = clamp(v.week, 0, 12);
  const bias: Record<Shock, { movement: number; access: number }> = {
    conflict: { movement: 0.72, access: 0.48 },
    flood: { movement: 0.28, access: 0.80 },
    movement: { movement: 0.90, access: 0.32 },
  };
  const b = bias[v.shock];
  const displacement = v.enabled.movement ? severity * transfer * b.movement * progress(now, lag) : 0;
  const access = v.enabled.access ? severity * transfer * b.access * progress(now, lag + 1) : 0;
  const basicNeeds = v.enabled.needs ? (displacement * 0.44 + access * 0.78) * progress(now, lag + 2) : 0;
  const regional = v.enabled.regional ? displacement * 0.33 * progress(now, lag + 3) : 0;
  return {
    origin: Math.round(severity * progress(now, 0) * 10) / 10,
    displacement: Math.round(clamp(displacement) * 10) / 10,
    access: Math.round(clamp(access) * 10) / 10,
    basicNeeds: Math.round(clamp(basicNeeds) * 10) / 10,
    regional: Math.round(clamp(regional) * 10) / 10,
  };
}
export const DEFAULT_SCENARIO: ScenarioInput = {
  shock: "conflict", intensity: 55, transmission: 65, delayWeeks: 1, week: 8,
  enabled: { movement: true, access: true, needs: true, regional: true },
};
export function scenarioMemo(v: ScenarioInput, out: ScenarioOutput, panelNote: string): string {
  return [
    "S&R | ANALYST SCENARIO NOTE — SYNTHETIC DEMONSTRATION",
    "Human review required. Not ACAPS-issued, not a validated forecast.",
    `Linked source question: R1043, eastern Chad / Sudan displacement. ${panelNote}`,
    `Assumed shock: ${SHOCK_LABEL[v.shock]}`,
    `Shock magnitude: ${v.intensity}/100; transmission: ${v.transmission}%; delay: ${v.delayWeeks} weeks; display week: ${v.week}/12`,
    `Enabled relationships: ${CHANNELS.filter(c => v.enabled[c.id]).map(c => c.name).join(", ") || "none"}`,
    `Relative pressure points: movement=${out.displacement.toFixed(1)}, access=${out.access.toFixed(1)}, basic needs=${out.basicNeeds.toFixed(1)}, regional=${out.regional.toFixed(1)}.`,
    "All numerical relationships are illustrative assumptions and are NOT empirical event probabilities.",
    "This note is local to the analyst demo. It is NOT an approved public report or evidence verification.",
  ].join("\n");
}
