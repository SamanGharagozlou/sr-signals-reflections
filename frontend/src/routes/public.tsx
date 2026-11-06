import { createFileRoute } from "@tanstack/react-router";
import { EyeOff } from "lucide-react";
import { AppHeader, ErrorState, Loading, StatePanel } from "@/components/signal/ui";
import { api, useApi } from "@/lib/api/client";

export const Route = createFileRoute("/public")({
  head: () => ({
    meta: [
      { title: "Public summary — SIGNAL demo" },
      { name: "description", content: "Moderator-approved, privacy-safe aggregate from a SIGNAL expert consultation (synthetic data)." },
      { property: "og:title", content: "SIGNAL public summary" },
      { property: "og:description", content: "Privacy-safe aggregate of a synthetic expert consultation." },
    ],
  }),
  component: PublicPage,
});

function PublicPage() {
  const q = useApi(() => api.getPublicSummary());
  return (
    <div className="min-h-screen">
      <AppHeader section="Public summary" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        {q.status === "loading" && <Loading />}
        {q.status === "error" && <ErrorState error={q.error} onRetry={q.refresh} />}
        {q.status === "ok" && !q.data.approved && (
          <StatePanel icon={<EyeOff className="h-6 w-6" />} title="No public summary approved">
            <p>A moderator has not approved a privacy-safe summary for this consultation yet.</p>
          </StatePanel>
        )}
        {q.status === "ok" && q.data.approved && (() => {
          const d = q.data;
          return (
            <article className="space-y-6">
              <header>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal">Risk {d.riskId} · frozen snapshot</p>
                <h1 className="mt-1 text-3xl font-semibold">{d.riskTitle}</h1>
                <p className="mt-2 text-sm text-muted-foreground">Approved {new Date(d.approvedAt!).toLocaleString()} · synthetic demo</p>
              </header>
              <section className="rounded-lg border bg-card p-5">
                <h2 className="text-base font-semibold">ACAPS qualitative rating</h2>
                <p className="mt-1">Risk level: <strong>{d.acapsRiskLevel}</strong></p>
              </section>
              <section className="rounded-lg border bg-card p-5">
                <h2 className="text-base font-semibold">Expert panel forecast</h2>
                <p className="mt-1 text-sm text-muted-foreground">{d.questionText}</p>
                <p className="mt-4 text-3xl font-semibold text-heading">{d.medianBand}</p>
                <p className="text-sm text-muted-foreground">Typical panel estimate (median band) from {d.panelN} experts</p>
                <p className="mt-3">{d.spreadDescription}</p>
                <p className="mt-1">{d.agreementSummary}</p>
              </section>
              <p className="rounded-md bg-amber-soft p-4 text-sm text-amber-foreground">
                This describes a small expert panel's views. It is not a calibrated prediction and not an official ACAPS forecast.
              </p>
            </article>
          );
        })()}
      </main>
    </div>
  );
}
