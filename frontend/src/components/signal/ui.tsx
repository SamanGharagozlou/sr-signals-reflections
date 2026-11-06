import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AlertTriangle, Loader2, Lock, FlaskConical } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Risk } from "@/lib/api/types";

export function AppHeader({ section }: { section?: string }) {
  return (
    <header className="gt-masthead">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex min-h-12 items-center gap-3" aria-label="SIGNAL Ground Truth home">
          <span aria-hidden className="gt-brand-mark">S</span>
          <span className="flex flex-col">
            <span className="gt-brand">SIGNAL</span>
            <span className="gt-brand-subtitle">GROUND TRUTH / FORECASTING</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-[10px] font-semibold tracking-[0.18em] text-white/55 uppercase md:inline">Expert insight · human decision</span>
          {section && <span className="gt-role-chip">{section}</span>}
        </div>
      </div>
      <DemoBanner />
    </header>
  );
}


/** Presentational stage bar adapted from Rita's expert-round storyboard.
 * Labels are navigation context only; it never bypasses backend workflow gates. */
export function GroundTruthJourney({ current, description }: { current: 0 | 1 | 2 | 3 | 4; description?: string }) {
  const stages = ["Brief", "Call", "Reveal", "Revise", "Receipt"];
  return (
    <nav aria-label="Delphi journey" className="gt-journey">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
        <p className="gt-journey-kicker">GROUND TRUTH / EXPERT ROUND</p>
        <p className="text-xs text-white/70">{description || "Human-reviewed · synthetic demo"}</p>
      </div>
      <ol className="gt-journey-steps">
        {stages.map((stage, i) => (
          <li key={stage} aria-current={i === current ? "step" : undefined}
            className={`gt-journey-stage ${i === current ? "gt-journey-active" : ""} ${i < current ? "gt-journey-complete" : ""}`}>
            <span className="gt-journey-number">{String(i + 1).padStart(2, "0")}</span>
            <span>{stage}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DemoBanner() {
  return (
    <div role="note" className="border-t border-amber/40 bg-amber-soft">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm text-amber-foreground">
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
        Synthetic demo only · responses are saved to local FastAPI/SQLite. No real expert identities or sensitive reports.
      </p>
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-12 text-muted-foreground justify-center">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function StatePanel({ icon, title, children, tone = "neutral" }: { icon?: ReactNode; title: string; children?: ReactNode; tone?: "neutral" | "warn" | "error" }) {
  const toneCls = tone === "error" ? "border-destructive/40" : tone === "warn" ? "border-amber/50 bg-amber-soft" : "";
  return (
    <section className={`mx-auto max-w-lg rounded-lg border bg-card p-6 text-center ${toneCls}`}>
      {icon && <div className="mb-3 flex justify-center text-muted-foreground">{icon}</div>}
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="mt-2 space-y-4 text-muted-foreground">{children}</div>}
    </section>
  );
}

export function ErrorState({ error, onRetry }: { error: Error & { status?: number }; onRetry?: () => void }) {
  if (error.status === 403) return <DeniedState message={error.message} />;
  return (
    <StatePanel tone="error" icon={<AlertTriangle className="h-6 w-6" />} title="Something went wrong">
      <p>{error.message}</p>
      {onRetry && <Button variant="outline" className="min-h-11" onClick={onRetry}>Try again</Button>}
    </StatePanel>
  );
}

export function DeniedState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <StatePanel icon={<Lock className="h-6 w-6" />} title="Access restricted">
      <p>{message}</p>
      {action ?? <Button asChild variant="outline" className="min-h-11"><Link to="/">Choose a demo role</Link></Button>}
    </StatePanel>
  );
}

/**
 * Render original ACAPS trigger text without losing its provenance.
 * Only http(s) markdown links are made clickable; everything else remains escaped React text.
 * This is presentation logic, not evidence verification or an AI summary.
 */
function EvidenceLinks({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]\n]{1,200}\]\(https?:\/\/[^\s)]+\))/g);
  return <>{parts.map((part, index) => {
    const match = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    return match ? (
      <a key={index} href={match[2]} target="_blank" rel="noopener noreferrer"
        className="font-medium text-teal-deep underline underline-offset-2 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {match[1]} <span className="sr-only">(opens in new tab)</span>
      </a>
    ) : <span key={index}>{part}</span>;
  })}</>;
}

export function RiskEvidence({ text }: { text: string }) {
  const sections = text
    .split(/(?=\b(?:Trigger ID|Title|Description|Sources):)/)
    .flatMap((part) => part.split(/\n+/))
    .map((part) => part.trim()).filter(Boolean);
  return (
    <div className="space-y-3 break-words text-sm leading-relaxed">
      {sections.map((section, index) => {
        const match = /^(Trigger ID|Title|Description|Sources):\s*([\s\S]*)$/.exec(section);
        return <p key={index}>
          {match ? <><strong className="font-semibold text-heading">{match[1]}: </strong><EvidenceLinks text={match[2]} /></> : <EvidenceLinks text={section} />}
        </p>;
      })}
    </div>
  );
}

export function RiskSummary({ risk, compact }: { risk: Risk; compact?: boolean }) {
  const facts = [
    ["Risk level", risk.acapsRiskLevel],
    ["Probability", risk.acapsProbability],
    ["Impact", risk.acapsImpact],
    ["Status", risk.status],
    ["Exposure", risk.expectedExposure],
  ];
  return (
    <section className="rounded-lg border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal">ACAPS risk {risk.id} · qualitative rating</p>
      <h2 className="mt-1 text-lg font-semibold">{risk.title}</h2>
      {!compact && risk.synopsis && (
        <details className="group mt-3 rounded-md border bg-background px-4 py-3">
          <summary className="cursor-pointer font-medium text-heading hover:text-teal-deep focus-visible:outline-2 focus-visible:outline-ring">
            Review triggers and supporting source text
          </summary>
          <div className="mt-4 border-t pt-3">
            <RiskEvidence text={risk.synopsis} />
            <p className="mt-3 text-xs text-muted-foreground">Original supplied risk text. External citations are not independently verified by SIGNAL.</p>
          </div>
        </details>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-md bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="font-medium text-heading">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">Source: {risk.source}</p>
    </section>
  );
}

export function ConfirmAction({
  label, title, description, confirmLabel, onConfirm, disabled, variant = "default",
}: {
  label: string; title: string; description: string; confirmLabel: string;
  onConfirm: () => void; disabled?: boolean; variant?: "default" | "outline" | "destructive";
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} disabled={disabled} className="min-h-11 w-full justify-center">{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description} This action updates the local synthetic FastAPI demo.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
          <AlertDialogAction className="min-h-11" onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Anonymous dot plot of 0–100% values. No identity labels. */
export function DotPlot({ values, median, label }: { values: number[]; median?: number; label: string }) {
  const counts = new Map<number, number>();
  return (
    <figure aria-label={`${label}: ${values.length} anonymous forecasts`}>
      <figcaption className="mb-2 text-sm font-medium text-heading">{label}</figcaption>
      <div className="relative h-16 rounded-md bg-muted">
        {median != null && (
          <div className="absolute inset-y-1 w-0.5 bg-heading" style={{ left: `${median}%` }} aria-hidden>
            <span className="absolute -top-0.5 left-1 text-[10px] text-heading">median</span>
          </div>
        )}
        {values.map((v, i) => {
          const stack = counts.get(v) ?? 0;
          counts.set(v, stack + 1);
          return (
            <span key={i} className="absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-card bg-primary"
              style={{ left: `${v}%`, bottom: `${10 + stack * 14}px` }} aria-hidden />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>0%</span><span>50%</span><span>100%</span></div>
    </figure>
  );
}
