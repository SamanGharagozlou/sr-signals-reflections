/** Synthetic-only source intake; source-level material never enters public routes. */
export type EvidenceSource = "email" | "note" | "link" | "photo";
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
  created_at: string; reviewed_at: string | null; has_photo: boolean;
}
export interface EvidenceFollowup {
  id: number; evidence_id: string; source_id: number; expert_id: string;
  redacted_message: string; request_note: string;
  previous_version: number; created_at: string;
}
export interface EvidenceSubmit {
  source_type: EvidenceSource; source_text: string; risk_id: string;
  reported_place: string; reported_date: string; reported_count: number | null;
  event: string; source_category: SourceCategory; proximity: Proximity;
  confirmed_synthetic: true; confirmed_no_pii: true;
  photo_png_base64?: string;
}

function bearer(): string {
  const token = typeof window === "undefined" ? null : window.sessionStorage.getItem("signal-demo-token");
  if (!token) throw new Error("Sign in as a demo expert or moderator first.");
  return token;
}

async function request<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method, cache: "no-store", headers: {
      "Authorization": `Bearer ${bearer()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    let reason = `Request failed (${response.status})`;
    try { const value = await response.json(); if (typeof value.detail === "string") reason = value.detail; }
    catch { /* no JSON details */ }
    throw new Error(reason);
  }
  return response.json() as Promise<T>;
}

function numericId(id: string): number {
  const n = Number(id.replace(/^EV-/, ""));
  if (!/^EV-\d+$/.test(id) || !Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid evidence ID");
  return n;
}

export const sourceEvidenceApi = {
  preview: (input: {source_type: EvidenceSource; source_text: string}) => request<EvidencePreview>("/evidence/preview", "POST", input),
  submit: (input: EvidenceSubmit) => request<{item: EvidenceRecord; notice: string}>("/evidence/submit", "POST", input),
  mine: () => request<{items: EvidenceRecord[]}>("/evidence/mine"),
  ownFollowups: (id: string) => request<{items: EvidenceFollowup[]}>(`/evidence/${numericId(id)}/followups`),
  moderatorFollowups: (id: string) => request<{items: EvidenceFollowup[]}>(`/moderator/source-intake/${numericId(id)}/followups`),
  followup: (id: string, message: string, version: number) =>
    request<{item: EvidenceRecord; notice: string}>(`/evidence/${numericId(id)}/followups`, "POST", {
      message, expected_version:version, confirmed_synthetic:true, confirmed_no_pii:true,
    }),
  inbox: () => request<{items: EvidenceRecord[]; notice: string}>("/moderator/source-intake"),
  review: (id: string, decision: Decision, note: string, version: number) =>
    request<{item: EvidenceRecord}>(`/moderator/source-intake/${numericId(id)}/review`, "POST", {decision, note, expected_version:version}),
  /** Fetch a private image only after auth. Returns a blob: never expose its URL publicly. */
  moderatorPhoto: async (id: string): Promise<Blob> => {
    const response = await fetch(`/api/moderator/source-intake/${numericId(id)}/photo`, {
      method: "GET", cache: "no-store", headers: {"Authorization": `Bearer ${bearer()}`},
    });
    if (!response.ok) throw new Error(`Private image unavailable (${response.status})`);
    const blob = await response.blob();
    if (blob.type !== "image/png") throw new Error("Unexpected image format");
    return blob;
  },
};
