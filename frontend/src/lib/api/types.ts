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

/** Moderator-only source context returned by the existing ACAPS risk-context endpoint.
 * Source links are references, not independently verified evidence. */
export interface RiskSourceReference { label: string; url: string; }
export interface RiskEvidenceSection {
  text: string | null;
  sources: RiskSourceReference[];
}
export interface ModeratorRiskContext {
  risk_id: string | null;
  country: string | null;
  source: string;
  assessment: {
    status: string | null;
    trend: string | null;
    acaps_risk_level: string | null;
    acaps_probability_category: string | null;
    acaps_impact: string | null;
    expected_exposure: string | null;
    priority_needs: string[];
  };
  evidence: Record<"rationale" | "vulnerability_and_coping" | "expected_impact" | "materialisation", RiskEvidenceSection>;
  triggers: { id: string | null; title: string | null; description: string | null; sources: RiskSourceReference[] }[];
  unstructured_triggers: string | null;
  missing_fields: string[];
  warnings: string[];
}

/** Read-only Risk Radar inventory. Risk-level labels are source categories, not numeric event forecasts. */
export interface RiskInventoryEntry {
  id: string;
  title: string;
  country: string;
  level: string;
  status?: string;
  probability_category?: string;
  impact?: string;
  trend?: string;
}
export interface RiskInventory {
  count: number;
  source: string;
  risks: RiskInventoryEntry[];
}
export interface RiskDetail {
  id: string;
  title: string;
  country: string;
  risk_level: string;
  status: string;
  probability_category: string;
  impact: string;
  trend: string;
  exposure: string;
  priority_needs?: string;
  triggers: string;
  sources: string;
}

/** INFORM Severity is a crisis-level current-conditions index, separate from Risk Radar and Delphi forecasts. */
export type SeverityIndex =
  | { available: false; metric: string; reason: string; methodology_url: string; score_scale: string }
  | { available: true; metric: string; risk_id: string; country: string; crisis_id: string; crisis_name: string;
      score: number; level: string; release: string; source_url: string; match_note: string;
      dimensions: Record<"impact" | "conditions" | "complexity", number | null>;
      methodology_url: string; score_scale: string };

/** Current crisis scores in a country; NOT matched to a selected ACAPS Risk Radar risk. */
export interface InformCrisisObservation {
  crisis_id: string;
  crisis_name: string;
  score: number;
  level: string;
  trend: string;
  reliability: string;
  last_updated: string;
  dimensions: { impact: number; conditions: number; complexity: number };
  geographic_scope: string | null;
  subnational_areas: string[];
  source_row: number | null;
}
export interface InformCountryCrisisContext {
  available: boolean;
  country: string;
  release: string | null;
  release_date: string | null;
  source_url: string;
  crises: InformCrisisObservation[];
  note: string;
  reason?: string;
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

export interface DelphiCounterpoint {
  id: string;
  title: string;
  text: string;
  notice: string;
}

export interface ModeratorCounterpoint {
  available: boolean;
  reason?: string | null;
  options: Pick<DelphiCounterpoint, "id" | "title" | "text">[];
  approved_id: string | null;
  notice: string;
}

export interface ExpertFeedback {
  released: boolean;
  /** Coarse band, rounded to 10 points. */
  centralBand?: string;
  agreementSummary?: string;
  canRevise?: boolean;
  counterpoint?: DelphiCounterpoint | null;
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

/** Descriptive ACAPS historical outcomes. No inferred numerical forecast calibration. */
export interface HistoricalRiskLevel {
  level: string;
  total: number;
  resolved: number;
  materialised: number;
  not_materialised: number;
  active: number;
  unknown_status: number;
  observed_materialisation_pct: number | null;
  small_sample: boolean;
  rate_displayable: boolean;
}
export interface HistoricalEvaluation {
  available: boolean;
  source: string;
  reason?: string;
  population?: string;
  totals?: {
    total: number;
    resolved: number;
    materialised: number;
    not_materialised: number;
    active: number;
    unknown_status: number;
  };
  by_risk_level?: HistoricalRiskLevel[];
  risk_matrix_version?: string;
  limitations?: string[];
  brier_evaluation?: string;
}

export interface ModeratorFollowup {
  id: string;
  topic: string;
  question: string;
  approved_at: string;
  status: string;
}

export interface ModeratorSynthesis {
  available: boolean;
  reason?: string;
  panel_size?: number;
  disagreement_summary?: string;
  evidence_status?: string;
  proposed?: { id: string; topic: string; question: string };
  review_notice?: string;
  approved?: ModeratorFollowup | null;
}

export interface PublicSummary {
  approved: boolean;
  approvedAt?: string;
  riskId?: string;
  riskTitle?: string;
  acapsRiskLevel?: string;
  panelN?: number;
  medianBand?: string;
  forecastRound?: "initial_panel" | "revised_panel";
  spreadDescription?: string;
  agreementSummary?: string;
  questionText?: string;
}

/** Moderator-only, deterministic field-completeness prompts; not verified evidence. */
export interface EvidenceQualityFlag {
  code: string;
  label: string;
  priority: "review-first" | "review";
  source_field: string;
  field_present: boolean;
  reason: string;
  suggested_review: string;
  fingerprint: string;
  triaged: boolean;
  triaged_at: string | null;
}
export interface EvidenceReviewItem {
  risk_id: string;
  source_risk_id_present: boolean;
  title: string;
  country: string;
  status: string;
  risk_level: string;
  priority: "review-first" | "review";
  flags: EvidenceQualityFlag[];
  open_flags: number;
}
export interface EvidenceReviewQueue {
  available: boolean;
  source: string;
  total_records: number;
  items: EvidenceReviewItem[];
  reason?: string | null;
  methodology: string;
  summary: {
    open_flags: number;
    triaged_flags: number;
    flagged_records: number;
    review_first_records: number;
    by_rule: Record<string, number>;
  };
}
export interface EvidenceTriageInput {
  risk_id: string;
  rule_code: string;
  fingerprint: string;
  disposition: "triaged" | "open";
}

/** Moderator-only read model. No expert-level records or notes are included. */
export interface SituationRoomAnalyst {
  role: "moderator";
  synthetic: true;
  risk: RiskDetail;
  source: string;
  forecast: { question: string; deadline: string; resolution: string; status: string };
  source_context: ModeratorRiskContext;
  panel: {
    count: number; expected: number; ready: boolean;
    feedback_released: boolean; approved: boolean;
    round_one_median: number | null; round_one_range: number[];
    revised_panel_median: number | null; revised_panel_range: number[];
    revised_count: number; median_change_pp: number | null;
    agreement: Record<RiskAssessment, number>;
    approved_band: string | null; approved_round: "initial_panel" | "revised_panel" | null;
  };
  notice: string;
}

export interface SignalApi {
  getSituationRoomAnalyst(): Promise<SituationRoomAnalyst>;
  getRiskInventory(): Promise<RiskInventory>;
  getRiskDetail(riskId: string): Promise<RiskDetail>;
  getSeverityIndex(riskId: string): Promise<SeverityIndex>;
  getInformCountryCrisisContext(country: string): Promise<InformCountryCrisisContext>;
  getConsultation(): Promise<Consultation>;
  login(role: DemoRole): Promise<{ role: DemoRole }>;
  me(): Promise<{ role: DemoRole | null }>;
  submitExpert(input: ExpertSubmissionInput): Promise<ExpertReceipt>;
  getExpertReceipt(): Promise<ExpertReceipt | null>;
  getExpertFeedback(): Promise<ExpertFeedback>;
  reviseExpert(probability: number): Promise<ExpertReceipt>;
  getEvidenceReviewQueue(): Promise<EvidenceReviewQueue>;
  triageEvidenceFlag(input: EvidenceTriageInput): Promise<void>;
  getModeratorDashboard(): Promise<ModeratorDashboard>;
  getModeratorRiskContext(riskId: string): Promise<ModeratorRiskContext>;
  getHistoricalEvaluation(): Promise<HistoricalEvaluation>;
  getModeratorSynthesis(): Promise<ModeratorSynthesis>;
  approveModeratorFollowup(questionId: string): Promise<void>;
  getModeratorCounterpoint(): Promise<ModeratorCounterpoint>;
  approveModeratorCounterpoint(promptId: string): Promise<void>;
  simulateFifthContribution(): Promise<void>;
  releaseFeedback(): Promise<void>;
  publishSnapshot(): Promise<void>;
  getPublicSummary(): Promise<PublicSummary>;
  resetDemo(): Promise<void>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
