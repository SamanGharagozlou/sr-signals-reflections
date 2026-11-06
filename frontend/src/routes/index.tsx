import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, LayoutDashboard, Globe } from "lucide-react";
import { AppHeader } from "@/components/signal/ui";
import { api } from "@/lib/api/client";
import type { DemoRole } from "@/lib/api/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SIGNAL — Ground Truth & Forecasting (demo)" },
      { name: "description", content: "Choose a synthetic demo role to explore expert consultation, moderation and public summaries for humanitarian risk." },
      { property: "og:title", content: "SIGNAL — Ground Truth & Forecasting" },
      { property: "og:description", content: "A synthetic-data prototype for the ACAPS humanitarian risk challenge." },
    ],
  }),
  component: Index,
});

const roles: { role: DemoRole; to: "/expert" | "/moderator" | "/public"; title: string; body: string; icon: typeof Globe }[] = [
  { role: "expert", to: "/expert", title: "Expert view", body: "Give your independent assessment and forecast in four short steps.", icon: ClipboardList },
  { role: "moderator", to: "/moderator", title: "ACAPS moderator", body: "Review panel aggregates, release feedback and approve a public snapshot.", icon: LayoutDashboard },
  { role: "public", to: "/public", title: "Public summary", body: "See the privacy-safe aggregate once a moderator approves it.", icon: Globe },
];

function Index() {
  const navigate = useNavigate();
  const enter = async (r: (typeof roles)[number]) => {
    await api.login(r.role);
    navigate({ to: r.to });
  };
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:py-20">
        <section className="gt-home-hero" aria-labelledby="hero-title">
          <div className="gt-hero-eyebrow"><span className="gt-dot" /> THE HUMAN FORECASTING LOOP <span className="text-white/45">/ ACAPS CHALLENGE DEMO</span></div>
          <h1 id="hero-title" className="gt-display mt-5">LOCAL KNOWLEDGE.<br /><span className="gt-hero-emphasis">SHARED CLARITY.</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Independent expert calls. Transparent disagreement. Human-approved humanitarian risk insight.
          </p>
          <Link to="/explore" className="gt-explore-hero-cta">Explore the Risk Radar <ArrowRight size={18} aria-hidden/></Link>
          <div className="gt-home-stages" aria-label="How SIGNAL works">
            <span><strong>01</strong> Brief</span>
            <span><strong>02</strong> Forecast</span>
            <span><strong>03</strong> Deliberate</span>
            <span><strong>04</strong> Publish</span>
          </div>
        </section>
        <h2 className="mt-12 text-lg font-semibold">Choose your demo workspace</h2>
        <p className="text-sm text-muted-foreground">Synthetic-demo sign-in only — shared invitation codes; inputs are stored in your local FastAPI demo database, not Lovable Cloud.</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {roles.map((r) => (
            <li key={r.role}>
              <button onClick={() => enter(r)}
                className="gt-role-card group flex h-full w-full flex-col rounded-lg border bg-card p-5 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring">
                <r.icon className="h-6 w-6 text-teal" aria-hidden />
                <span className="mt-3 font-serif text-lg font-semibold text-heading">{r.title}</span>
                <span className="mt-1 flex-1 text-sm text-muted-foreground">{r.body}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Enter demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
