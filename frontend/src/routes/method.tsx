import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Compass, EyeOff, FileCheck2,
  LockKeyhole, ScanSearch, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { AppHeader } from "@/components/signal/ui";
import { crewCapabilityLabels, crewRoles, humanGates, type CrewStage } from "@/lib/crew-model";

export const Route = createFileRoute("/method")({
  head: () => ({ meta: [
    { title: "How S&R works — the Human Forecasting Loop" },
    { name: "description", content: "Meet Rita's conceptual Agent Crew and inspect the human-approved evidence-to-forecast workflow implemented by S&R." },
  ] }),
  component: MethodPage,
});

function MethodPage() {
  const [selected, setSelected] = useState<CrewStage>("brief");
  const current = crewRoles.find((r) => r.id === selected) ?? crewRoles[0];

  return (
    <div className="min-h-screen bg-[#f3f6f7]">
      <AppHeader section="How it works" />
      <main className="gt-crew-shell">
        <section className="gt-crew-hero" aria-labelledby="crew-title">
          <div className="gt-crew-hero-orbit" aria-hidden="true"><span /><span /><span /></div>
          <div className="gt-crew-hero-copy">
            <p className="gt-crew-eyebrow"><Sparkles size={14} aria-hidden="true" /> S&R / THE HUMAN FORECASTING LOOP</p>
            <h1 id="crew-title">Meet the <em>Agent Crew.</em><br />Keep humans in charge.</h1>
            <p className="gt-crew-hero-intro">Five memorable roles explain how humanitarian evidence becomes a transparent expert forecast. They are <strong>conceptual guides</strong> to S&R's workflow—not five autonomous AI services.</p>
            <div className="gt-crew-hero-actions">
              <a href="#crew-stage" className="gt-crew-primary">Explore the crew <ArrowRight size={17} aria-hidden="true" /></a>
              <Link to="/explore" className="gt-crew-secondary">Open Risk Explorer <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="gt-crew-hero-stamp" aria-hidden="true"><strong>05</strong><span>ROLES<br />01 HUMAN-LED SYSTEM</span></div>
        </section>

        <div className="gt-crew-truth" role="note"><ShieldCheck size={18} aria-hidden="true" /><p><strong>Implementation truth.</strong> Our working prototype uses deterministic statistics, existing FastAPI permissions, and human moderation. The character roles explain and propose future capabilities; no autonomous agent crew has been deployed.</p></div>

        <section id="crew-stage" className="gt-crew-section" aria-labelledby="crew-section-title">
          <div className="gt-crew-section-header">
            <div><p className="gt-crew-kicker">01 / THE CAST</p><h2 id="crew-section-title">Every role has a boundary.</h2></div>
            <p>Choose a character to examine its responsibility, what S&R actually implements, and what it never decides.</p>
          </div>
          <div className="gt-crew-cards" role="group" aria-label="Select a conceptual role">
            {crewRoles.map((role, i) => (
              <button key={role.id} type="button" onClick={() => setSelected(role.id)}
                aria-pressed={selected === role.id} aria-controls="crew-details"
                className={`gt-crew-card ${selected === role.id ? "is-active" : ""} ${role.id === "revise" ? "is-dissent" : ""}`}>
                <div className="gt-crew-card-illustration"><img src={role.image} alt="" loading="lazy" /></div>
                <div className="gt-crew-card-body">
                  <span className="gt-crew-card-overline">{String(i + 1).padStart(2, "0")} / {role.phase.split(" / ")[1]}</span>
                  <span className="gt-crew-card-name">{role.name}</span>
                  <span className="gt-crew-card-tagline">{role.tagline}</span>
                  <span className="gt-crew-card-foot">View role <ChevronRight size={15} aria-hidden="true" /></span>
                </div>
              </button>
            ))}
          </div>

          <article className="gt-crew-details" id="crew-details" aria-live="polite" aria-label={`${current.name} role details`}>
            <div className="gt-crew-details-ident">
              <img src={current.image} alt="" aria-hidden="true" />
              <p>{current.phase}</p>
              <h3>{current.name}</h3>
              <span className={`gt-crew-capability is-${current.capability}`}>{crewCapabilityLabels[current.capability]}</span>
              <small>{current.proof}</small>
            </div>
            <div className="gt-crew-details-text">
              <div><span className="gt-crew-detail-label">The role in Rita's concept</span><p>{current.responsibility}</p></div>
              <div><span className="gt-crew-detail-label">What S&R demonstrates today</span><p>{current.inSignal}</p></div>
              <div className="gt-crew-guard"><LockKeyhole size={19} aria-hidden="true" /><span><strong>Non-negotiable boundary</strong>{current.safeguard}</span></div>
              <Link to={current.href} className="gt-crew-detail-link">{current.action} <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
          </article>
        </section>

        <section className="gt-crew-loop" aria-labelledby="crew-loop-title">
          <div className="gt-crew-section-header">
            <div><p className="gt-crew-kicker">02 / FROM S&R TO DECISION</p><h2 id="crew-loop-title">One evidence-to-forecast loop.</h2></div>
            <p>Click through a connected process; only verified backend outputs advance to public release.</p>
          </div>
          <ol className="gt-crew-timeline">
            <li><div className="gt-crew-node"><ScanSearch size={23} aria-hidden="true" /></div><div><span>01 / SOURCE</span><strong>Explore risk intelligence</strong><p>Load available ACAPS risk text, categories and evidence gaps. Do not equate qualitative risk with present crisis severity.</p></div></li>
            <li><div className="gt-crew-node"><Compass size={23} aria-hidden="true" /></div><div><span>02 / FORECAST</span><strong>Ask a bounded question</strong><p>Experts independently estimate a specific six-month event; each submits their own judgment before feedback.</p></div></li>
            <li><div className="gt-crew-node"><Workflow size={23} aria-hidden="true" /></div><div><span>03 / DELPHI</span><strong>Reveal disagreement safely</strong><p>A moderator releases aggregate feedback and an approved reflection card; experts may revise their probabilities.</p></div></li>
            <li><div className="gt-crew-node"><FileCheck2 size={23} aria-hidden="true" /></div><div><span>04 / PUBLISH</span><strong>Approve a frozen summary</strong><p>A moderator authorizes a privacy-safe public snapshot. Verified outcome scoring remains future work.</p></div></li>
          </ol>
        </section>

        <section className="gt-crew-oversight" aria-labelledby="crew-oversight-title">
          <div className="gt-crew-oversight-heading">
            <div><p className="gt-crew-kicker">03 / HUMAN OVERSIGHT</p><h2 id="crew-oversight-title">The checkpoints aren't decoration.</h2></div>
            <EyeOff size={30} aria-hidden="true" />
          </div>
          <div className="gt-crew-gates">
            {humanGates.map((gate, i) => <div key={gate.title} className="gt-crew-gate">
              <div className="gt-crew-gate-top"><span>{String(i + 1).padStart(2, "0")}</span>{gate.implemented ? <span className="gt-crew-gate-status is-live"><Check size={13} aria-hidden="true"/> Backend enforced</span> : <span className="gt-crew-gate-status">Manual / planned</span>}</div>
              <h3>{gate.title}</h3><p>{gate.detail}</p>
            </div>)}
          </div>
        </section>

        <section className="gt-crew-finale">
          <div><p className="gt-crew-kicker">04 / SEE IT IN THE PRODUCT</p><h2>Good forecasts need good boundaries.</h2><p>Follow a source record into the synthetic consultation, inspect its aggregate disagreement and see which decisions remain human.</p></div>
          <div className="gt-crew-finale-links"><Link to="/explore">Explore risks <ArrowRight size={16} aria-hidden="true" /></Link><Link to="/">Choose a demo role <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        </section>
      </main>
    </div>
  );
}
