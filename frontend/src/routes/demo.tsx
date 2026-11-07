import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo")({ component: JuryDemoJourney });

type Stage = {
  name: string;
  path: string;
  eyebrow: string;
  headline: string;
  show: string;
  say: string;
  caution?: string;
};

const stages: Stage[] = [
  {
    name: "Home",
    path: "/",
    eyebrow: "01 / THE PROBLEM",
    headline: "A shared view before the next crisis",
    show: "Open Home. Explain the six-month anticipatory-action question and the source-labelled risk view.",
    say: "The prototype helps people work from a common risk picture; it does not replace human judgment.",
  },
  {
    name: "Analyse",
    path: "/analysis",
    eyebrow: "02 / EVIDENCE",
    headline: "Explore risks with context",
    show: "Open Analyse and pick one example. Point out what the chart actually measures and the time window.",
    say: "Separate observed severity, contextual signals, and future-oriented judgments. Do not treat them as equivalent.",
    caution: "Never describe demonstration forecasts as validated real-world predictions.",
  },
  {
    name: "Contribute",
    path: "/expert",
    eyebrow: "03 / EXPERT INPUT",
    headline: "Structured judgment, not a black box",
    show: "Open Contribute. Switch between Expert check-in & reflect and Add sources & follow-ups; verify a draft persists.",
    say: "Experts can provide a reasoned forecast and supporting evidence through separate workflows.",
    caution: "Use synthetic example entries only; avoid displaying identifying expert information.",
  },
  {
    name: "Moderator",
    path: "/moderator",
    eyebrow: "04 / HUMAN CHECKPOINT",
    headline: "Review before anything is shared",
    show: "Open Moderator with an authorized demo session; demonstrate review and evidence synthesis without changing final publication state.",
    say: "Human moderators inspect the inputs and decide what can be released. The system must not publish automatically.",
    caution: "If access is denied, treat that as a successful permission boundary; don't bypass authentication.",
  },
  {
    name: "Share",
    path: "/public",
    eyebrow: "05 / RESPONSIBLE OUTPUT",
    headline: "Only approved, understandable findings",
    show: "Open Share. If no approved snapshot exists, explain the unavailable state rather than pretending a brief has been published.",
    say: "Public conclusions are downstream of moderator approval, with evidence and limitations made visible.",
    caution: "Do not expose unpublished or raw expert content.",
  },
];

function JuryDemoJourney() {
  const [activeIndex, setActiveIndex] = useState(0);
  const step = stages[activeIndex];

  return (
    <main className="sr-jury-page" id="sr-jury-start">
      <section className="sr-jury-hero" aria-labelledby="sr-jury-title">
        <div className="sr-jury-hero-inner">
          <div className="sr-jury-topline">
            <span className="sr-jury-eyebrow">SIGNAL / ANTICIPATORY ACTION</span>
            <span className="sr-jury-status">PRESENTER WALKTHROUGH · DEMONSTRATION</span>
          </div>
          <h1 id="sr-jury-title">From scattered signals<br /><em>to reviewed decisions.</em></h1>
          <p className="sr-jury-intro">
            A five-stop journey through evidence, structured expert input,
            moderator review and responsible publication.
          </p>
          <div className="sr-jury-hero-meta" aria-label="Demo principles">
            <span>Source-aware</span><span>Human-led</span><span>Approval-gated</span>
          </div>
        </div>
      </section>

      <section className="sr-jury-body" aria-labelledby="sr-jury-flow-heading">
        <header className="sr-jury-section-head">
          <div>
            <p className="sr-jury-small-label">THE LIVE STORY</p>
            <h2 id="sr-jury-flow-heading">One connected journey</h2>
          </div>
          <p>Choose a stage to see the presenter cue, then open the existing application page.</p>
        </header>

        <div className="sr-jury-flow" role="group" aria-label="Demo stages">
          {stages.map((item, index) => (
            <button
              type="button"
              key={item.path}
              className={`sr-jury-stage${activeIndex === index ? " is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-pressed={activeIndex === index}
            >
              <span className="sr-jury-stage-num">{String(index + 1).padStart(2, "0")}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        <div className="sr-jury-detail" aria-live="polite">
          <div className="sr-jury-detail-main">
            <p className="sr-jury-small-label">{step.eyebrow}</p>
            <h3>{step.headline}</h3>
            <div className="sr-jury-copy-grid">
              <div>
                <h4>Show</h4>
                <p>{step.show}</p>
              </div>
              <div>
                <h4>Say</h4>
                <p>{step.say}</p>
              </div>
            </div>
            {step.caution && <p className="sr-jury-caution"><strong>Guardrail:</strong> {step.caution}</p>}
          </div>
          <aside className="sr-jury-detail-aside" aria-label="Presenting controls">
            <span className="sr-jury-count">{String(activeIndex + 1).padStart(2, "0")} <span>/ 05</span></span>
            <p className="sr-jury-aside-desc">Navigate to the real application. This guide does not fabricate data or approvals.</p>
            <a className="sr-jury-primary" href={step.path}>Open {step.name} <span aria-hidden="true">↗</span></a>
            <div className="sr-jury-actions">
              <button type="button" onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0}>Previous</button>
              <button type="button" onClick={() => setActiveIndex(Math.min(stages.length - 1, activeIndex + 1))} disabled={activeIndex === stages.length - 1}>Next stage</button>
            </div>
          </aside>
        </div>

        <footer className="sr-jury-footer">
          <p><strong>Demonstration boundary.</strong> This is a navigation and speaking guide—not an analytics result, access grant, moderator approval or publication action. Follow the data/source labels and live permissions shown in each page.</p>
        </footer>
      </section>
    </main>
  );
}
