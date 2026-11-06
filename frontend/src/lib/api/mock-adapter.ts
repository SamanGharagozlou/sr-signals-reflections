/**
 * MOCK ADAPTER — in-memory, per-browser-tab simulation of the SIGNAL backend.
 * Nothing here is persisted to a server; a page reload resets the demo.
 *
 * NOTE: `describePanel` below exists only so the mock can produce plausible
 * numbers. In production the FastAPI backend computes all statistics and
 * enforces permissions; delete this when switching to fastapi-adapter.ts.
 */
import { EVIDENCE_GAPS, PANEL_SIZE, QUESTION, RISK_R1043, SEEDED, SIMULATED_FIFTH, type SeededExpert } from "./mock-data";
import {
  ApiError,
  type DemoRole,
  type ExpertReceipt,
  type ExpertSubmissionInput,
  type PanelStats,
  type RiskAssessment,
  type SignalApi,
} from "./types";

interface State {
  role: DemoRole | null;
  contributions: SeededExpert[];
  you: (ExpertReceipt & { input: ExpertSubmissionInput }) | null;
  feedbackReleased: boolean;
  snapshot: Awaited<ReturnType<SignalApi["getPublicSummary"]>> | null;
}

const fresh = (): State => ({
  role: null,
  contributions: SEEDED.map((s) => ({ ...s })),
  you: null,
  feedbackReleased: false,
  snapshot: null,
});

let state: State = fresh();
const listeners = new Set<() => void>();
export const subscribeMock = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((l) => l());
const delay = <T,>(v: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(v), ms));

function requireRole(role: DemoRole) {
  if (state.role !== role) throw new ApiError(403, `This view requires the demo ${role} role.`);
}

/* ---- mock-only stand-in for backend statistics ---- */
function quantile(sorted: number[], p: number) {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  const a = sorted[lo]!, b = sorted[hi]!;
  return a + (b - a) * (i - lo);
}
function describePanel(values: number[]): PanelStats | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const median = quantile(s, 0.5);
  const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75);
  const dev = s.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
  return { n: s.length, median, q1, q3, iqr: q3 - q1, mad: quantile(dev, 0.5), min: s[0]!, max: s[s.length - 1]! };
}
/* --------------------------------------------------- */

function panel() {
  const first = [...state.contributions.map((c) => c.probability)];
  const second = state.contributions.map((c) => (state.feedbackReleased && c.revised != null ? c.revised : c.probability));
  let revisers = state.feedbackReleased ? state.contributions.filter((c) => c.revised != null).length : 0;
  if (state.you) {
    first.push(state.you.probability);
    second.push(state.you.revisedProbability ?? state.you.probability); // carry forward
    if (state.you.revisedProbability != null) revisers++;
  }
  const agreement: Record<RiskAssessment, number> = { underestimated: 0, about_right: 0, overestimated: 0 };
  state.contributions.forEach((c) => agreement[c.assessment]++);
  if (state.you) agreement[state.you.input.assessment]++;
  return { first, second, revisers, agreement };
}

const band = (v: number) => {
  const lo = Math.floor(v / 10) * 10;
  return `${lo}–${Math.min(lo + 10, 100)}%`;
};
function agreementText(a: Record<RiskAssessment, number>) {
  const entries = Object.entries(a) as [RiskAssessment, number][];
  const total = entries.reduce((t, [, n]) => t + n, 0);
  const [top, n] = entries.sort((x, y) => y[1] - x[1])[0]!;
  const label = { underestimated: "underestimated", about_right: "about right", overestimated: "overestimated" }[top];
  return n / total > 0.5 ? `Most of the panel judged the ACAPS rating ${label}.` : "The panel was divided on the ACAPS rating.";
}

const submittedCount = () => state.contributions.length + (state.you ? 1 : 0);

const consultation = () => ({
  risk: RISK_R1043,
  question: QUESTION,
  panelSize: PANEL_SIZE,
  submittedCount: submittedCount(),
  feedbackReleased: state.feedbackReleased,
  publicSnapshotApproved: state.snapshot != null,
});

export const mockAdapter: SignalApi = {
  getConsultation: () => delay(consultation()),
  async login(role) { state.role = role; emit(); return delay({ role }); },
  me: () => delay({ role: state.role }),

  async submitExpert(input) {
    requireRole("expert");
    if (state.you) throw new ApiError(409, "You have already submitted.");
    if (submittedCount() >= PANEL_SIZE) throw new ApiError(409, "The demo panel is already full. Reset the demo to try again.");
    state.you = {
      input,
      probability: input.probability,
      revisedProbability: null,
      receiptCode: "SIG-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
      submittedAt: new Date().toISOString(),
    };
    emit();
    const { input: _i, ...receipt } = state.you;
    return delay(receipt, 500);
  },
  async getExpertReceipt() {
    requireRole("expert");
    if (!state.you) return delay(null);
    const { input: _i, ...r } = state.you;
    return delay(r);
  },
  async getExpertFeedback() {
    requireRole("expert");
    if (!state.feedbackReleased || !state.you) return delay({ released: false });
    const s = describePanel(panel().first)!;
    return delay({
      released: true,
      centralBand: `${band(s.q1).split("–")[0]}–${band(s.q3).split("–")[1]}`,
      agreementSummary: agreementText(panel().agreement),
      canRevise: state.you.revisedProbability == null,
    });
  },
  async reviseExpert(p) {
    requireRole("expert");
    if (!state.you || !state.feedbackReleased) throw new ApiError(409, "Revision is not open.");
    if (state.you.revisedProbability != null) throw new ApiError(409, "You have already used your one revision.");
    state.you.revisedProbability = p;
    emit();
    const { input: _i, ...r } = state.you;
    return delay(r, 400);
  },

  async getModeratorDashboard() {
    requireRole("moderator");
    const p = panel();
    return delay({
      consultation: consultation(),
      firstRound: describePanel(p.first),
      secondRound: state.feedbackReleased ? describePanel(p.second) : null,
      revisersCount: p.revisers,
      firstRoundValues: [...p.first].sort((a, b) => a - b),
      secondRoundValues: state.feedbackReleased ? [...p.second].sort((a, b) => a - b) : [],
      agreement: p.agreement,
      evidenceGaps: EVIDENCE_GAPS,
    });
  },
  async getHistoricalEvaluation() {
    requireRole("moderator");
    return delay({ available: false, source: "Browser-only mock", reason: "Historical evaluation is only available from FastAPI with the official CSV." });
  },
  async simulateFifthContribution() {
    requireRole("moderator");
    if (submittedCount() >= PANEL_SIZE) throw new ApiError(409, "Panel already complete.");
    state.contributions.push({ ...SIMULATED_FIFTH });
    emit();
    return delay(undefined);
  },
  async releaseFeedback() {
    requireRole("moderator");
    state.feedbackReleased = true;
    emit();
    return delay(undefined);
  },
  async publishSnapshot() {
    requireRole("moderator");
    if (submittedCount() < PANEL_SIZE) throw new ApiError(409, "Wait for the full panel before approving a public snapshot.");
    const p = panel();
    const s = describePanel(state.feedbackReleased ? p.second : p.first)!;
    state.snapshot = {
      approved: true,
      approvedAt: new Date().toISOString(),
      riskId: RISK_R1043.id,
      riskTitle: RISK_R1043.title,
      acapsRiskLevel: RISK_R1043.acapsRiskLevel,
      panelN: s.n,
      medianBand: band(s.median),
      spreadDescription: s.iqr <= 20 ? "Views were fairly close together." : "Views varied considerably across the panel.",
      agreementSummary: agreementText(p.agreement),
      questionText: QUESTION.text,
    };
    emit();
    return delay(undefined);
  },
  getPublicSummary: () => delay(state.snapshot ?? { approved: false }),
  async resetDemo() {
    const role = state.role;
    state = fresh();
    state.role = role;
    emit();
    return delay(undefined);
  },
};
