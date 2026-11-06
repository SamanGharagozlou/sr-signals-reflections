/**
 * Rita's five agent characters as a *conceptual explanation* of SIGNAL.
 * This static content does not infer live agent execution from the application.
 * Keep capability statements aligned with actual demo behavior.
 */
export type CrewStage = "brief" | "watch" | "reveal" | "revise" | "receipt";
export type CrewCapability = "working" | "partial" | "future";

export type CrewRole = {
  id: CrewStage;
  name: string;
  phase: string;
  tagline: string;
  responsibility: string;
  inSignal: string;
  safeguard: string;
  capability: CrewCapability;
  proof: string;
  action: string;
  href: "/" | "/explore" | "/analysis";
  image: string;
};

export const crewRoles: readonly CrewRole[] = [
  {
    id: "brief", name: "Smith", phase: "01 / DEFINE", tagline: "Sharpens the question",
    responsibility: "Make a future event measurable: what happens, where, by when, and how it is resolved.",
    inSignal: "The demo includes a fixed R1043 six-month question with documented resolution criteria.",
    safeguard: "The question is not autonomously rewritten. ACAPS methodology and moderator review remain authoritative.",
    capability: "partial", proof: "Fixed demo question; no question-generation agent", action: "Explore the source risk", href: "/explore", image: "/crew/smith.svg",
  },
  {
    id: "watch", name: "Watchtower", phase: "02 / MONITOR", tagline: "Notices evidence gaps",
    responsibility: "Highlight triggers whose last assessment may predate a more recent written update.",
    inSignal: "Risk-context and missing-field displays help a moderator inspect supporting material.",
    safeguard: "No automated source surveillance, trigger rerating or unapproved outreach is running.",
    capability: "partial", proof: "Read-only evidence context; monitoring agent proposed", action: "Open the Risk Explorer", href: "/explore", image: "/crew/watchtower.svg",
  },
  {
    id: "reveal", name: "Synthesizer", phase: "03 / SYNTHESIZE", tagline: "Makes a panel understandable",
    responsibility: "Summarize consensus, uncertainty and comments without exposing who said what.",
    inSignal: "Deterministic medians and ranges, protected Delphi release, and keyword-based note themes work in the demo.",
    safeguard: "Keyword themes are not validated evidence or a real AI rewriting/anonymization service. Small panels receive coarse public outputs.",
    capability: "working", proof: "Deterministic aggregates and moderated release", action: "Review statistical views", href: "/analysis", image: "/crew/synthesizer.svg",
  },
  {
    id: "revise", name: "Contrarian", phase: "04 / CHALLENGE", tagline: "Makes the case against",
    responsibility: "Surface a credible alternative interpretation before experts revise their forecasts.",
    inSignal: "The moderator can review and approve a structured reflection/counterpoint card for the synthetic Delphi panel.",
    safeguard: "A card is never a private attack on one expert. All experts see the same moderator-approved prompt.",
    capability: "working", proof: "Moderator-approved reflection card", action: "Enter the guided demo", href: "/", image: "/crew/contrarian.svg",
  },
  {
    id: "receipt", name: "Referee", phase: "05 / VERIFY", tagline: "Closes the evidence loop",
    responsibility: "After the event horizon, adjudicate what occurred and privately score the earlier forecast.",
    inSignal: "Resolution criteria and an illustrative Brier-score endpoint exist; verified outcome adjudication does not.",
    safeguard: "No outcome is automatically determined, and no real expert performance is currently validated.",
    capability: "future", proof: "Outcome registry and adjudication are future work", action: "See the analytical limits", href: "/analysis", image: "/crew/referee.svg",
  },
] as const;

export const crewCapabilityLabels: Record<CrewCapability, string> = {
  working: "Related workflow implemented",
  partial: "Partially represented",
  future: "Future capability",
};

export const humanGates = [
  {title: "Define the consultation", detail: "Risk evidence and the event question require analyst judgment. The demo uses a preconfigured question.", implemented: false},
  {title: "Release panel feedback", detail: "Backend moderator permission gate releases a coarse group summary after the panel is complete.", implemented: true},
  {title: "Approve public findings", detail: "Backend moderator permission gate freezes the privacy-safe snapshot.", implemented: true},
  {title: "Resolve the outcome", detail: "A later, externally verified outcome determination is not implemented in this demo.", implemented: false},
] as const;
