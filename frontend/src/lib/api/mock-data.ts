/**
 * SYNTHETIC DEMO FIXTURES — fictional panel, not real experts or testimony.
 * Risk R1043 descriptors mirror the public ACAPS example; the forecast
 * question is a SIGNAL demo question, not an ACAPS-approved forecast.
 */
import type { EvidenceGap, ForecastQuestion, RiskAssessment, Risk } from "./types";

export const RISK_R1043: Risk = {
  id: "R1043",
  title: "Escalating cross-border insecurity affecting eastern Chad",
  synopsis:
    "Armed activity across the Sudan–Chad border may intensify, increasing attacks on border localities and pushing further displacement into eastern Chad, where camps and host communities are already stretched.",
  source: "ACAPS risk list (example entry R1043)",
  acapsRiskLevel: "High",
  acapsProbability: "High",
  acapsImpact: "4 / 5",
  status: "Active",
  expectedExposure: "> 500,000 people",
};

export const QUESTION: ForecastQuestion = {
  text: "Will a newly documented cross-border attack cause additional displacement in eastern Chad by 6 May 2027?",
  resolutionDate: "6 May 2027",
  resolutionCriteria: [
    "Resolves YES if a credible humanitarian source documents an attack originating across the Sudan–Chad border after the consultation opens.",
    "That source must link the attack to new displacement within eastern Chad (Ouaddaï, Sila, Wadi Fira or Ennedi Est).",
    "Resolves NO if no such documented attack-and-displacement link appears by 6 May 2027.",
  ],
  disclaimer: "SIGNAL demo question — not an ACAPS-approved forecast.",
};

export interface SeededExpert {
  probability: number;
  revised: number | null; // second-round value if this fictional expert revises
  assessment: RiskAssessment;
}

/** Four seeded fictional contributions (4/5 panel). */
export const SEEDED: SeededExpert[] = [
  { probability: 35, revised: null, assessment: "about_right" },
  { probability: 45, revised: 55, assessment: "about_right" },
  { probability: 70, revised: null, assessment: "underestimated" },
  { probability: 80, revised: 75, assessment: "about_right" },
];

/** Used when the moderator simulates the fifth contribution. */
export const SIMULATED_FIFTH: SeededExpert = { probability: 60, revised: null, assessment: "overestimated" };

export const EVIDENCE_GAPS: EvidenceGap[] = [
  { id: "g1", claim: "Seasonal road closures may delay reporting of border incidents by several weeks.", confidence: "medium" },
  { id: "g2", claim: "Displacement into informal sites outside camps may be under-counted.", confidence: "low" },
  { id: "g3", claim: "Local mediation efforts are not reflected in current risk indicators.", confidence: "low" },
];

export const PANEL_SIZE = 5;
