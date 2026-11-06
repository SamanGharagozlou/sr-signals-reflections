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
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex min-h-11 items-center gap-2">
          <span className="font-serif text-xl font-semibold text-heading">SIGNAL</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">Ground Truth &amp; Forecasting</span>
        </Link>
        {section && <span className="rounded-full bg-teal-soft px-3 py-1 text-sm font-medium text-accent-foreground">{section}</span>}
      </div>
      <DemoBanner />
    </header>
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
      {!compact && <p className="mt-2 leading-relaxed">{risk.synopsis}</p>}
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
