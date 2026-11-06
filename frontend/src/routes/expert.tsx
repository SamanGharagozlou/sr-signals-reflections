import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Hourglass, ShieldCheck, MessageCircleQuestion, EyeOff, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, DeniedState, ErrorState, Loading, RiskSummary, StatePanel } from "@/components/signal/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, useApi } from "@/lib/api/client";
import type { Confidence, Consultation, ExpertReceipt, PrivacyPreference, RiskAssessment } from "@/lib/api/types";

export const Route = createFileRoute("/expert")({
  head: () => ({
    meta: [
      { title: "Expert consultation — SIGNAL demo" },
      { name: "description", content: "Four short steps: privacy, risk assessment, forecast and missing factors (synthetic demo)." },
      { property: "og:title", content: "SIGNAL expert consultation" },
      { property: "og:description", content: "Independently assess an ACAPS risk and forecast a specific event." },
    ],
  }),
  component: ExpertPage,
});

function ExpertPage() {
  const me = useApi(() => api.me());
  const consultation = useApi(() => api.getConsultation());
  let body;
  if (me.status === "loading" || consultation.status === "loading") body = <Loading />;
  else if (me.status === "error") body = <ErrorState error={me.error} onRetry={me.refresh} />;
  else if (consultation.status === "error") body = <ErrorState error={consultation.error} onRetry={consultation.refresh} />;
  else if (me.data.role !== "expert")
    body = (
      <DeniedState message="The expert consultation is only available in the demo expert role."
        action={<Button className="min-h-11" onClick={async () => { await api.login("expert"); window.location.reload(); }}>Enter as demo expert</Button>} />
    );
  else body = <ExpertGate consultation={consultation.data} />;
  return (
    <div className="min-h-screen">
      <AppHeader section="Expert" />
      <main className="mx-auto max-w-xl px-4 py-8">{body}</main>
    </div>
  );
}

function ExpertGate({ consultation }: { consultation: Consultation }) {
  const receipt = useApi(() => api.getExpertReceipt());
  if (receipt.status === "loading") return <Loading />;
  if (receipt.status === "error") return <ErrorState error={receipt.error} onRetry={receipt.refresh} />;
  if (receipt.data) return <AfterSubmit receipt={receipt.data} />;
  if (consultation.submittedCount >= consultation.panelSize)
    return <StatePanel title="Consultation full">The demo panel already has {consultation.panelSize} contributions. A moderator can reset the demo.</StatePanel>;
  return <Wizard consultation={consultation} />;
}

/* ---------------- wizard ---------------- */

const PRIVACY: { v: PrivacyPreference; label: string; limit: string }[] = [
  { v: "known_to_acaps", label: "Known to ACAPS only", limit: "ACAPS staff can see who you are. Other panel members cannot." },
  { v: "pseudonymous_panel", label: "Pseudonymous within the trusted panel", limit: "Panel members see a code name. ACAPS administrators may still be able to link it to you." },
  { v: "anonymous_consultation", label: "Anonymous within this consultation", limit: "Your answers are not shown with your name. Small panels and detailed notes can still make people recognisable." },
];
const ASSESS: { v: RiskAssessment; label: string }[] = [
  { v: "underestimated", label: "Underestimated" },
  { v: "about_right", label: "About right" },
  { v: "overestimated", label: "Overestimated" },
];
const CONF: { v: Confidence; label: string }[] = [
  { v: "low", label: "Low" }, { v: "medium", label: "Medium" }, { v: "high", label: "High" },
];
const STEPS = ["Privacy", "Brief", "Blind call", "Evidence gaps", "Review"];

interface Draft { privacy?: PrivacyPreference; assessment?: RiskAssessment; probability: string; note: string; confidence?: Confidence }

function parseProb(s: string): number | null {
  if (!/^\d{1,3}$/.test(s.trim())) return null;
  const n = Number(s);
  return n >= 0 && n <= 100 ? n : null;
}

function Wizard({ consultation }: { consultation: Consultation }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>({ probability: "", note: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (step === 0 && !d.privacy) return "Please choose a privacy preference.";
    if (step === 1 && !d.assessment) return "Please choose one option.";
    if (step === 2 && parseProb(d.probability) == null) return "Enter a whole number between 0 and 100.";
    if (step === 3 && !d.confidence) return "Please choose your confidence.";
    if (step === 3 && d.note.length > 300) return "Keep the note to 300 characters or fewer.";
    return null;
  };
  const next = () => {
    const e = validate();
    setError(e);
    if (!e) setStep((s) => s + 1);
  };
  const back = () => { setError(null); setStep((s) => s - 1); };
  const submit = async () => {
    setSubmitting(true);
    try {
      await api.submitExpert({ privacy: d.privacy!, assessment: d.assessment!, probability: parseProb(d.probability)!, note: d.note.trim(), confidence: d.confidence! });
      window.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
      setSubmitting(false);
    }
  };
  const { risk, question } = consultation;

  return (
    <div>
      <div className="mb-6 rounded-lg border bg-card px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-deep">Independent Delphi round · synthetic exercise</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-heading">Your expert contribution</h1>
        <p className="mt-1 text-sm text-muted-foreground">Make your own assessment before seeing other forecasts. Group feedback is shown only after the moderator releases it.</p>
      </div>
      <nav aria-label="Progress" className="mb-6">
        <p className="text-sm text-muted-foreground">{step === 4 ? "Review before submitting" : `Step ${step + 1} of 4 · ${STEPS[step]}`}</p>
        <ol className="mt-2 flex gap-1.5">
          {STEPS.slice(0, 4).map((s, i) => (
            <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} aria-current={i === step ? "step" : undefined}>
              <span className="sr-only">{s}</span>
            </li>
          ))}
        </ol>
      </nav>

      <form onSubmit={(e) => { e.preventDefault(); if (step < 4) next(); else submit(); }} noValidate>
        {step === 0 && (
          <Fieldset legend="How should your contribution be handled?" hint="Choose what fits your situation. No option guarantees complete anonymity." error={error}>
            {PRIVACY.map((o) => (
              <Choice key={o.v} name="privacy" checked={d.privacy === o.v} onChange={() => setD({ ...d, privacy: o.v })} label={o.label} detail={o.limit} />
            ))}
          </Fieldset>
        )}

        {step === 1 && (
          <>
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-deep">Brief · the existing assessment</p>
              <h2 className="font-serif text-xl font-semibold text-heading">Review the context, then challenge it</h2>
              <p className="text-sm text-muted-foreground">This is the source risk record, not an instruction to agree with it. Read the triggers and check the provided source links before answering.</p>
            </div>
            <RiskSummary risk={risk} />
            <div className="mt-6">
              <Fieldset legend="Is ACAPS's rating of this risk…" hint="Give your own independent view." error={error}>
                {ASSESS.map((o) => (
                  <Choice key={o.v} name="assessment" checked={d.assessment === o.v} onChange={() => setD({ ...d, assessment: o.v })} label={o.label} />
                ))}
              </Fieldset>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-deep"><EyeOff className="h-4 w-4" aria-hidden /> Blind call · round one</div>
            <p className="inline-block rounded-md bg-amber-soft px-2.5 py-1 text-xs font-medium text-amber-foreground">{question.disclaimer}</p>
            <h2 className="text-xl font-semibold">{question.text}</h2>
            <p className="text-sm text-muted-foreground">Enter your own probability. The panel median is deliberately hidden until your forecast is submitted and feedback is released.</p>
            <details className="group rounded-md border bg-card">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-heading">
                How will this be resolved? <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="list-disc space-y-2 px-8 pb-4 text-sm">{question.resolutionCriteria.map((c) => <li key={c}>{c}</li>)}</ul>
            </details>
            <div>
              <label htmlFor="prob" className="block font-medium text-heading">Your probability (0–100%)</label>
              <p id="prob-hint" className="text-sm text-muted-foreground">This is separate from ACAPS's qualitative "High" probability category.</p>
              <div className="mt-2 flex items-center gap-2">
                <Input id="prob" inputMode="numeric" autoComplete="off" value={d.probability} placeholder="0–100"
                  onChange={(e) => setD({ ...d, probability: e.target.value.replace(/[^\d]/g, "").slice(0, 3) })}
                  aria-invalid={!!error} aria-describedby={`prob-hint${error ? " prob-err" : ""}`}
                  className="h-12 w-28 text-lg" />
                <span className="text-lg">%</span>
              </div>
              {error && <p id="prob-err" role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="note" className="block font-medium text-heading">Is anything important missing? <span className="font-normal text-muted-foreground">(optional)</span></label>
              <p className="text-sm text-muted-foreground">Avoid names, locations of individuals or anything that could identify you or others.</p>
              <Textarea id="note" rows={4} maxLength={300} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} className="mt-2" />
              <p className="mt-1 text-right text-xs text-muted-foreground" aria-live="polite">{d.note.length}/300</p>
            </div>
            <Fieldset legend="How confident are you in your answers?" error={error}>
              <div className="grid grid-cols-3 gap-2">
                {CONF.map((o) => (
                  <Choice key={o.v} name="confidence" checked={d.confidence === o.v} onChange={() => setD({ ...d, confidence: o.v })} label={o.label} />
                ))}
              </div>
            </Fieldset>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold">Review your independent call</h2>
            <dl className="mt-4 divide-y rounded-lg border bg-card">
              <Row k="Privacy" v={PRIVACY.find((p) => p.v === d.privacy)!.label} onEdit={() => setStep(0)} />
              <Row k="ACAPS rating is" v={ASSESS.find((p) => p.v === d.assessment)!.label} onEdit={() => setStep(1)} />
              <Row k="Forecast" v={`${parseProb(d.probability)}%`} onEdit={() => setStep(2)} />
              <Row k="Missing factors" v={d.note.trim() || "None"} onEdit={() => setStep(3)} />
              <Row k="Confidence" v={CONF.find((p) => p.v === d.confidence)!.label} onEdit={() => setStep(3)} />
            </dl>
            <p className="mt-3 rounded-md border border-teal/20 bg-teal-soft p-3 text-sm text-accent-foreground"><ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden /> Your first-round forecast is recorded as your original view. You may revise it once later; a revision does not erase the original.</p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {step > 0 && <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={back}>Back</Button>}
          <Button type="submit" className="min-h-11 flex-1" disabled={submitting}>
            {step < 3 ? "Continue" : step === 3 ? "Review" : submitting ? "Submitting…" : "Record independent call"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Fieldset({ legend, hint, error, children }: { legend: string; hint?: string; error: string | null; children: React.ReactNode }) {
  return (
    <fieldset aria-describedby={error ? "fs-err" : undefined}>
      <legend className="font-serif text-xl font-semibold text-heading">{legend}</legend>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-4 space-y-2">{children}</div>
      {error && <p id="fs-err" role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}

function Choice({ name, checked, onChange, label, detail }: { name: string; checked: boolean; onChange: () => void; label: string; detail?: string }) {
  return (
    <label className={`flex min-h-11 cursor-pointer gap-3 rounded-lg border bg-card p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${checked ? "border-primary bg-teal-soft" : "hover:border-teal"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 h-4 w-4 accent-primary" />
      <span>
        <span className="font-medium text-heading">{label}</span>
        {detail && <span className="mt-0.5 block text-sm text-muted-foreground">{detail}</span>}
      </span>
    </label>
  );
}

function Row({ k, v, onEdit }: { k: string; v: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 p-4">
      <div><dt className="text-sm text-muted-foreground">{k}</dt><dd className="font-medium text-heading break-words">{v}</dd></div>
      <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={onEdit}>Edit</Button>
    </div>
  );
}

/* ---------------- after submit ---------------- */

function AfterSubmit({ receipt }: { receipt: ExpertReceipt }) {
  const fb = useApi(() => api.getExpertFeedback());
  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-6">
        <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden />
        <h1 className="mt-2 text-2xl font-semibold">Round-one call recorded</h1>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted-foreground">Receipt</dt><dd className="font-mono font-medium text-heading">{receipt.receiptCode}</dd></div>
          <div><dt className="text-muted-foreground">Submitted</dt><dd className="font-medium text-heading">{new Date(receipt.submittedAt).toLocaleString()}</dd></div>
          <div><dt className="text-muted-foreground">Your forecast</dt><dd className="font-medium text-heading">{receipt.probability}%</dd></div>
          {receipt.revisedProbability != null && <div><dt className="text-muted-foreground">Revised to</dt><dd className="font-medium text-heading">{receipt.revisedProbability}%</dd></div>}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">Synthetic demo reference (not a cryptographic seal or a real receipt). Original and revised values are stored separately by the local FastAPI backend. No ACAPS assessment changes automatically.</p>
      </section>

      {fb.status === "loading" && <Loading />}
      {fb.status === "error" && <ErrorState error={fb.error} onRetry={fb.refresh} />}
      {fb.status === "ok" && !fb.data.released && (
        <StatePanel tone="warn" icon={<Hourglass className="h-6 w-6" />} title="Waiting for group feedback">
          <p>A moderator will release a coarse summary of the panel's views. You'll then have one chance to revise your forecast.</p>
        </StatePanel>
      )}
      {fb.status === "ok" && fb.data.released && (
        <section className="rounded-lg border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-deep">Reveal · moderator released</p>
          <h2 className="mt-1 text-xl font-semibold">See the panel's perspective</h2>
          <div className="mt-4 rounded-lg bg-teal-soft px-4 py-4">
            <p className="text-sm text-accent-foreground">Round-one panel median band</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-heading">{fb.data.centralBand}</p>
            <p className="mt-1 text-sm text-accent-foreground">{fb.data.agreementSummary}</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Different forecasts are useful; agreement is not proof of accuracy. This band is coarse to reduce disclosure, but a five-person panel cannot guarantee anonymity.</p>
          {fb.data.counterpoint && (
            <div className="mt-5 rounded-lg border border-amber/40 bg-amber-soft p-4" aria-label="Moderator-approved reflection prompt">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-foreground">
                <MessageCircleQuestion className="h-4 w-4" aria-hidden /> Reflection · approved by moderator
              </div>
              <h3 className="mt-2 text-lg font-semibold">{fb.data.counterpoint.title}</h3>
              <p className="mt-1 text-sm text-heading">{fb.data.counterpoint.text}</p>
              <p className="mt-3 text-xs text-muted-foreground">{fb.data.counterpoint.notice}</p>
            </div>
          )}
          {!fb.data.counterpoint && <p className="mt-4 text-xs text-muted-foreground">No counterargument has been approved for this round. Your original forecast remains valid.</p>}
          {fb.data.canRevise ? <Revise current={receipt.probability} /> : <p className="mt-4 text-sm text-muted-foreground">Your one revision has been used. The initial call remains recorded.</p>}
        </section>
      )}
    </div>
  );
}

function Revise({ current }: { current: number }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const n = parseProb(v);
    if (n == null) return setErr("Enter a whole number between 0 and 100.");
    setBusy(true);
    try { await api.reviseExpert(n); toast.success("Revision saved"); window.location.reload(); }
    catch (e) { toast.error((e as Error).message); setBusy(false); }
  };
  return (
    <form className="mt-5 border-t pt-5" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-deep"><ArrowLeftRight className="h-4 w-4" aria-hidden /> Revise · optional</div>
      <label htmlFor="rev" className="mt-2 block font-medium text-heading">Would you change your probability? (one time only)</label>
      <p className="text-sm text-muted-foreground">Your original forecast is {current}%. You can keep it unchanged. Revising is never required, and the original is preserved.</p>
      <div className="mt-2 flex items-center gap-2">
        <Input id="rev" inputMode="numeric" value={v} placeholder="0–100" onChange={(e) => setV(e.target.value.replace(/[^\d]/g, "").slice(0, 3))} className="h-12 w-28 text-lg" aria-invalid={!!err} />
        <span>%</span>
        <Button type="submit" className="min-h-11" disabled={busy || v === ""}>Save revision</Button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
    </form>
  );
}
