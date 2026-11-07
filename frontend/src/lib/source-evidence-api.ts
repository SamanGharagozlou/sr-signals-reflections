/** Synthetic-only source intake; never expose a public route for source-level material. */
export type EvidenceSource = "email" | "note";
export type SourceCategory = "field_observation" | "ngo_report" | "news_media" | "other";
export type Proximity = "firsthand" | "trusted_secondhand" | "media" | "unknown";
export type Decision = "accepted_for_analysis" | "needs_more_evidence" | "rejected";
export interface EvidencePreview {
  sanitized_preview: string;
  reported_count: number | null;
  reported_place: string;
  reported_date: string;
  event: string;
  suggested_risk_id: string | null;
  notice: string;
  redaction_automatically_verified: false;
}
export interface EvidenceRecord {
  id: string; expert_id: string; source_type: EvidenceSource; redacted_text: string;
  risk_id: string; reported_place: string; reported_date: string;
  reported_count: number | null; event: string; source_category: SourceCategory;
  proximity: Proximity; status: "pending_review" | Decision;
  redaction_confirmed: boolean; reviewer_note: string; version: number;
  created_at: string; reviewed_at: string | null;
}
export interface EvidenceSubmit {
  source_type: EvidenceSource; source_text: string; risk_id: string;
  reported_place: string; reported_date: string; reported_count: number | null;
  event: string; source_category: SourceCategory; proximity: Proximity;
  confirmed_synthetic: true; confirmed_no_pii: true;
}

async function request<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const token = typeof window === "undefined" ? null : window.sessionStorage.getItem("signal-demo-token");
  if (!token) throw new Error("Sign in as a demo expert or moderator first.");
  const response = await fetch(`/api${path}`, { method, cache: "no-store", headers: {
    "Authorization": `Bearer ${token}`,
    ...(body ? { "Content-Type": "application/json" } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) {
    let reason = `Request failed (${response.status})`;
    try { const value = await response.json(); if (typeof value.detail === "string") reason = value.detail; }
    catch { /* no JSON details */ }
    throw new Error(reason);
  }
  return response.json() as Promise<T>;
}
export const sourceEvidenceApi = {
  preview: (input: {source_type: EvidenceSource; source_text: string}) => request<EvidencePreview>("/evidence/preview","POST",input),
  submit: (input: EvidenceSubmit) => request<{item: EvidenceRecord;notice: string}>("/evidence/submit","POST",input),
  mine: () => request<{items: EvidenceRecord[]}>("/evidence/mine"),
  inbox: () => request<{items: EvidenceRecord[];notice:string}>("/moderator/source-intake"),
  review: (id: string, decision: Decision, note: string, version: number) => {
    const n = Number(id.replace(/^EV-/,""));
    if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid evidence ID");
    return request<{item:EvidenceRecord}>(`/moderator/source-intake/${n}/review`,"POST",{decision,note,expected_version:version});
  },
};
