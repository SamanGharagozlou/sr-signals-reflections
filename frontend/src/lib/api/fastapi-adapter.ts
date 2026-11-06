/**
 * SIGNAL synthetic-demo FastAPI adapter.
 * Maps the real API contract to the Lovable presentation models.
 * No client-side statistics, source synthesis, or unsupported access to raw submissions.
 * Demo-only shared invitation codes: NEVER use for real humanitarian contributors.
 */
import { ApiError, type SignalApi, type DemoRole, type Consultation, type ExpertReceipt, type ModeratorDashboard, type PanelStats, type HistoricalEvaluation, type ModeratorSynthesis, type ModeratorCounterpoint, type DelphiCounterpoint } from "./types";

const PATH = "/api";
const TOKEN_KEY = "signal-demo-token";

const getToken = () => typeof window === "undefined" ? null : window.sessionStorage.getItem(TOKEN_KEY);
const setToken = (token: string | null) => {
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
  else window.sessionStorage.removeItem(TOKEN_KEY);
};

async function request<T>(path: string, init: RequestInit = {}, authorized = false): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (init.body) headers.set("Content-Type", "application/json");
  if (authorized) {
    const token = getToken();
    if (!token) throw new ApiError(401, "Sign in to this synthetic demo first.");
    headers.set("Authorization", `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(PATH + path, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(0, "Cannot reach FastAPI. Start the Python server on port 8765 and the frontend dev server on port 5173.");
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const error = await res.json();
      if (typeof error.detail === "string") message = error.detail;
    } catch { /* error body may be non-JSON */ }
    if (res.status === 401) setToken(null);
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

interface RawRisk {
  id: string; title: string; country: string; probability_category: string;
  impact: string; risk_level: string; status: string; exposure: string;
  triggers: string; sources: string;
}
interface RawConsultation {
  risk: RawRisk;
  source: string;
  forecast: { question: string; deadline: string; resolution: string; status: string };
  responded: number; panel_size: number; feedback_released: boolean; public_approved: boolean;
}
interface RawMe {
  role: "expert" | "moderator";
  expert_id: string | null;
  submission?: { probability: number; created_at: string; agreement: string; anonymity: string; confidence: string } | null;
  revision?: { probability: number; created_at: string } | null;
}
interface Group {
  count: number; expected: number; median: number | null; range: number[];
  iqr: number | null; mad: number | null; agreement: Record<"underestimated" | "about_right" | "overestimated", number>;
  theme_counts: Record<string, number>;
  round_two_count: number; round_two_median: number | null;
  round_two_range: number[]; round_two_iqr: number | null; round_two_mad: number | null;
}

function mapConsultation(raw: RawConsultation): Consultation {
  return {
    risk: {
      id: raw.risk.id,
      title: raw.risk.title,
      synopsis: raw.risk.triggers || "Original ACAPS assessment; see its cited sources for detailed context.",
      source: raw.source,
      acapsRiskLevel: raw.risk.risk_level,
      acapsProbability: raw.risk.probability_category,
      acapsImpact: raw.risk.impact,
      status: raw.risk.status,
      expectedExposure: raw.risk.exposure,
    },
    question: {
      text: raw.forecast.question,
      resolutionDate: raw.forecast.deadline,
      resolutionCriteria: [raw.forecast.resolution],
      disclaimer: raw.forecast.status,
    },
    panelSize: raw.panel_size,
    submittedCount: raw.responded,
    feedbackReleased: raw.feedback_released,
    publicSnapshotApproved: raw.public_approved,
  };
}

function stats(n: number, median: number | null, range: number[], iqr: number | null, mad: number | null): PanelStats | null {
  if (median === null || range.length < 2) return null;
  // The backend does NOT expose individual forecasts or quartiles.
  // Never reverse-engineer them or invent q1/q3 from IQR.
  return { n, median, min: range[0], max: range[1], iqr, mad, q1: null, q3: null };
}

function receipt(me: RawMe): ExpertReceipt | null {
  if (!me.submission || !me.expert_id) return null;
  return {
    receiptCode: `DEMO-${me.expert_id.toUpperCase()}`, // UI reference; NOT a backend receipt or security token
    submittedAt: me.submission.created_at,
    probability: me.submission.probability,
    revisedProbability: me.revision?.probability ?? null,
  };
}

const getRawConsultation = () => request<RawConsultation>("/consultation");
const getRawMe = () => request<RawMe>("/me", {}, true);

export const fastapiAdapter: SignalApi = {
  async getConsultation() { return mapConsultation(await getRawConsultation()); },
  async login(role: DemoRole) {
    if (role === "public") {
      setToken(null);
      return { role };
    }
    // Synthetic-demo-only credentials documented by the local FastAPI backend.
    const code = role === "expert" ? "FIELD-05" : "ACAPS-DEMO";
    const data = await request<{ role: "expert" | "moderator"; token: string }>("/login", {
      method: "POST", body: JSON.stringify({ code }),
    });
    setToken(data.token);
    return { role: data.role };
  },
  async me() {
    if (!getToken()) return { role: null };
    try { const raw = await getRawMe(); return { role: raw.role }; }
    catch (error) { if (error instanceof ApiError && error.status === 401) return { role: null }; throw error; }
  },
  async submitExpert(input) {
    await request("/expert/submit", {
      method: "POST", body: JSON.stringify({
        agreement: input.assessment,
        probability: input.probability,
        confidence: input.confidence,
        note: input.note,
        anonymity: ({known_to_acaps:"acaps_only",pseudonymous_panel:"pseudonymous",anonymous_consultation:"anonymous"} as const)[input.privacy],
      }),
    }, true);
    const result = receipt(await getRawMe());
    if (!result) throw new ApiError(500, "Contribution saved but receipt could not be loaded. Refresh this page.");
    return result;
  },
  async getExpertReceipt() { return receipt(await getRawMe()); },
  async getExpertFeedback() {
    const f = await request<{available:boolean;reason?:string;group?:{forecast_median_band:string;assessment_pattern:string};counterpoint?:DelphiCounterpoint|null}>("/expert/feedback", {}, true);
    if (!f.available || !f.group) return { released: false };
    const me = await getRawMe();
    return {
      released: true,
      centralBand: f.group.forecast_median_band,
      agreementSummary: f.group.assessment_pattern,
      canRevise: me.revision == null,
      counterpoint: f.counterpoint ?? null,
    };
  },
  async reviseExpert(probability) {
    await request("/expert/revise", { method:"POST",body:JSON.stringify({probability}) }, true);
    const result = receipt(await getRawMe());
    if (!result) throw new ApiError(500,"Revision saved but receipt could not be reloaded.");
    return result;
  },
  async getModeratorDashboard(): Promise<ModeratorDashboard> {
    const [consultation, raw] = await Promise.all([
      this.getConsultation(),
      request<{group:Group;feedback_released:boolean;public_approved:boolean}>("/moderator/dashboard", {}, true),
    ]);
    const g = raw.group;
    return {
      consultation,
      firstRound: stats(g.count,g.median,g.range,g.iqr,g.mad),
      secondRound: g.round_two_median == null ? null : stats(g.count,g.round_two_median,g.round_two_range,g.round_two_iqr,g.round_two_mad),
      revisersCount: g.round_two_count,
      firstRoundValues: [], // backend intentionally exposes no individual estimates
      secondRoundValues: [],
      agreement: g.agreement,
      evidenceGaps: Object.entries(g.theme_counts || {}).map(([theme,count],i) => ({
        id:`theme-${i}`, claim: `${theme} · mentioned in ${count} synthetic note(s)`, confidence:"low" as const,
      })),
    };
  },
  async getHistoricalEvaluation() {
    return request<HistoricalEvaluation>("/moderator/historical-evaluation", {}, true);
  },
  async getModeratorSynthesis() {
    return request<ModeratorSynthesis>("/moderator/synthesis", {}, true);
  },
  async approveModeratorFollowup(questionId) {
    await request("/moderator/follow-up/approve", {
      method: "POST", body: JSON.stringify({ question_id: questionId }),
    }, true);
  },
  async getModeratorCounterpoint() {
    return request<ModeratorCounterpoint>("/moderator/counterpoint", {}, true);
  },
  async approveModeratorCounterpoint(promptId) {
    await request("/moderator/counterpoint/approve", {
      method: "POST", body: JSON.stringify({ prompt_id: promptId }),
    }, true);
  },
  async simulateFifthContribution() {
    // The backend deliberately requires an expert-authenticated contribution.
    throw new ApiError(409, "Use the Expert view (FIELD-05) to submit the fifth synthetic response.");
  },
  async releaseFeedback() { await request("/moderator/release", {method:"POST"}, true); },
  async publishSnapshot() { await request("/moderator/publish", {method:"POST"}, true); },
  async getPublicSummary() {
    const p=await request<{available:boolean;risk_id?:string;panel_size?:number;forecast_median_band?:string;approved_at?:string;notice?:string}>("/public-summary");
    if (!p.available) return { approved:false };
    const consultation = await this.getConsultation();
    return {
      approved:true,
      approvedAt:p.approved_at,
      riskId:p.risk_id,
      riskTitle:consultation.risk.title,
      acapsRiskLevel:consultation.risk.acapsRiskLevel,
      panelN:p.panel_size,
      medianBand:p.forecast_median_band,
      // No subgroup statistics or disagreement details are present in the frozen public snapshot.
      spreadDescription:p.notice,
      agreementSummary:"",
      questionText:consultation.question.text,
    };
  },
  async resetDemo() {
    await request("/demo/reset", {method:"POST"}, true);
    setToken(null); // reset revokes all server sessions
  },
};
