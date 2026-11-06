/**
 * Frontend view-models for SIGNAL. These are PROVISIONAL shapes: the FastAPI
 * response schemas are not confirmed yet. The adapter layer maps backend
 * responses into these types so UI components never depend on raw payloads.
 */
export type DemoRole = "expert" | "moderator" | "public";
export type PrivacyPreference = "known_to_acaps" | "pseudonymous_panel" | "anonymous_consultation";
export type RiskAssessment = "underestimated" | "about_right" | "overestimated";
export type Confidence = "low" | "medium" | "high";

export interface Risk {
  id: string;
  title: string;
  synopsis: string;
  source: string;
  acapsRiskLevel: string;
  acapsProbability: string;
  acapsImpact: string;
  status: string;
  expectedExposure: string;
}

export interface ForecastQuestion {
  text: string;
  resolutionDate: string;
  resolutionCriteria: string[];
  disclaimer: string;
}

export interface Consultation {
  risk: Risk;
  question: ForecastQuestion;
  panelSize: number;
  submittedCount: number;
  feedbackReleased: boolean;
  publicSnapshotApproved: boolean;
}

export interface ExpertSubmissionInput {
  privacy: PrivacyPreference;
  assessment: RiskAssessment;
  probability: number;
  note: string;
  confidence: Confidence;
}

export interface ExpertReceipt {
  receiptCode: string;
  submittedAt: string;
  probability: number;
  revisedProbability: number | null;
}

export interface ExpertFeedback {
  released: boolean;
  /** Coarse band, rounded to 10 points. */
  centralBand?: string;
  agreementSummary?: string;
  canRevise?: boolean;
}

export interface PanelStats {
  n: number;
  median: number;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  mad: number | null;
  min: number;
  max: number;
}

export interface EvidenceGap {
  id: string;
  claim: string;
  confidence: Confidence;
}

export interface ModeratorDashboard {
  consultation: Consultation;
  firstRound: PanelStats | null;
  secondRound: PanelStats | null;
  revisersCount: number;
  firstRoundValues: number[];
  secondRoundValues: number[];
  agreement: Record<RiskAssessment, number>;
  evidenceGaps: EvidenceGap[];
}

export interface PublicSummary {
  approved: boolean;
  approvedAt?: string;
  riskId?: string;
  riskTitle?: string;
  acapsRiskLevel?: string;
  panelN?: number;
  medianBand?: string;
  spreadDescription?: string;
  agreementSummary?: string;
  questionText?: string;
}

export interface SignalApi {
  getConsultation(): Promise<Consultation>;
  login(role: DemoRole): Promise<{ role: DemoRole }>;
  me(): Promise<{ role: DemoRole | null }>;
  submitExpert(input: ExpertSubmissionInput): Promise<ExpertReceipt>;
  getExpertReceipt(): Promise<ExpertReceipt | null>;
  getExpertFeedback(): Promise<ExpertFeedback>;
  reviseExpert(probability: number): Promise<ExpertReceipt>;
  getModeratorDashboard(): Promise<ModeratorDashboard>;
  simulateFifthContribution(): Promise<void>;
  releaseFeedback(): Promise<void>;
  publishSnapshot(): Promise<void>;
  getPublicSummary(): Promise<PublicSummary>;
  resetDemo(): Promise<void>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
