import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, EyeOff, Info, Mail, ShieldCheck, Users } from "lucide-react";
import {
  DEMO_CRISES, REGIONS, isUnderCovered, orderCrises,
  type Crisis, type Expert, type Order, type Region,
} from "@/lib/crisis-agenda-model";

type Panel = "experts" | "update" | "actions";
type Stage = 0 | 1 | 2 | 3;
const STAGES = ["You ask", "They answer", "Propose sharing names", "Both agree"];

/** Completely local presentation-only interactions. No API writes or storage. */
export function CrisisAgenda() {
  const [order, setOrder] = useState<Order>("need");
  const [region, setRegion] = useState<"All" | Region>("All");
  const [underOnly, setUnderOnly] = useState(false);
  const [grid, setGrid] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("experts");
  const [expert, setExpert] = useState<Expert | null>(null);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [stage, setStage] = useState<Stage>(0);
  const [demoEmail, setDemoEmail] = useState("");
  const [updateRequest, setUpdateRequest] = useState("");
  const [updateSubmitted, setUpdateSubmitted] = useState(false);
  const [inviteRole, setInviteRole] = useState("");
  const [inviteSubmitted, setInviteSubmitted] = useState(false);
  const [watching, setWatching] = useState<string[]>([]);

  const visible = useMemo(() => orderCrises(DEMO_CRISES, order, region, underOnly), [order, region, underOnly]);
  const totalUnder = DEMO_CRISES.filter(isUnderCovered).length;
  const open = (c: Crisis, next: Panel) => {
    if (expanded === c.id && panel === next) { setExpanded(null); return; }
    setExpanded(c.id); setPanel(next); setExpert(null); setQuestion(""); setSubmittedQuestion(""); setStage(0);
    setDemoEmail(""); setUpdateRequest(""); setUpdateSubmitted(false); setInviteRole(""); setInviteSubmitted(false);
  };
  const choose = (e: Expert) => { if (!e.available) return; setExpert(e); setQuestion(""); setSubmittedQuestion(""); setStage(0); };

  return <main className="sr-15e" aria-label="Illustrative crisis agenda">
    <div className="sr-15e-disclaimer"><Info size={16} aria-hidden="true" /> SYNTHETIC SCENARIO — all rankings, needs, dates, expert profiles, exchanges and recommendations on this screen are fictional; no messages are transmitted.</div>
    <div className="sr-15e-layout">
      <aside className="sr-15e-sidebar" aria-label="Crisis agenda filters">
        <div className="sr-15e-side-title"><small>Explore the</small><h1>CRISIS <span>AGENDA</span></h1><p>Illustrative scenario week: 9 November 2026</p></div>
        <div className="sr-15e-control-label">Order by</div>
        {([
          ["recent", "Newest first", "Recent fictional scenario dates"],
          ["need", "Most people in need", "Illustrative scale only"],
          ["attention", "Most forgotten", "Simulated needs and coverage gap"],
        ] as [Order,string,string][]).map(([id,title,desc])=><button key={id} type="button" className={`sr-15e-sort ${order===id?"active":""}`} aria-pressed={order===id} onClick={()=>setOrder(id)}><strong>{title}</strong><small>{desc}</small></button>)}
        <div className="sr-15e-control-label">Region</div>
        <div className="sr-15e-region-list">{REGIONS.map(r=><button key={r} type="button" className={region===r?"active":""} aria-pressed={region===r} onClick={()=>setRegion(r)}>{r}</button>)}</div>
        <label className="sr-15e-toggle"><input type="checkbox" checked={underOnly} onChange={e=>setUnderOnly(e.target.checked)}/><span><strong>Only under-covered crises</strong><small>Fictional needs and limited coverage</small></span></label>
        <p className="sr-15e-explainer"><strong>Demo coverage rule:</strong> at least 2.5M simulated people in need, low simulated media attention, and either an old report or fewer than three example expert inputs. This does not identify real ACAPS coverage gaps.</p>
      </aside>
      <section className="sr-15e-content" aria-label="Ranked crises">
        <div className="sr-15e-list-head"><div><p className="sr-15e-overline">SHARE / CRISIS DISCOVERY</p><h2>{order==="recent"?"NEWEST SCENARIOS":order==="attention"?"ILLUSTRATIVE COVERAGE GAPS":"RANKED BY PEOPLE IN NEED"}</h2></div><span>{visible.length} shown · {totalUnder} under-covered (demo)</span></div>
        <div className="sr-15e-view-switch" role="group" aria-label="Agenda layout"><button type="button" aria-pressed={!grid} onClick={()=>setGrid(false)}>List</button><button type="button" aria-pressed={grid} onClick={()=>setGrid(true)}>Grid: needs vs attention</button></div>
        <div className="sr-15e-reminder">Example figures only. External ACAPS links lead to genuine country analysis, not to a live feed or an automatically verified newest report.</div>
        <div className={grid?"sr-15e-cards is-grid":"sr-15e-cards"}>{visible.map((c,i)=><article key={c.id} className="sr-15e-case">
          <div className="sr-15e-case-summary"><div className="sr-15e-rank"><strong>#{i+1}</strong><small>demo rank</small></div><div className="sr-15e-case-detail"><div className="sr-15e-name">{c.name.toUpperCase()} <small>{c.region}</small>{isUnderCovered(c)&&<span className="sr-15e-under">UNDER-COVERED · DEMO</span>}</div><p>{new Date(`${c.date}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} · {c.title}</p><div className="sr-15e-stats"><span><b>{c.peopleM}M</b> simulated people in need</span><span>Attention: <b>{c.media}</b></span><span>Report age (demo): <b>{c.reportAgeDays}d</b></span><span><b>{c.expertInputs}</b> simulated inputs</span></div><div className="sr-15e-need-bar" aria-label={`${c.peopleM} million simulated people in need`}><span style={{width:`${Math.min(100,100*c.peopleM/30)}%`}}/></div>
            <div className="sr-15e-source"><BookOpen size={13} aria-hidden="true"/><a href={c.sourceUrl ?? "https://www.acaps.org/en/countries"} target="_blank" rel="noopener noreferrer">{c.sourceUrl?`ACAPS ${c.name} country analysis` : "Browse ACAPS country analyses"}</a><small>External · public source</small></div>
          </div><div className="sr-15e-actions"><button type="button" aria-expanded={expanded===c.id&&panel==="experts"} onClick={()=>open(c,"experts")}>Ask experts</button><button type="button" aria-expanded={expanded===c.id&&panel==="update"} onClick={()=>open(c,"update")}>Request an update</button><button type="button" aria-expanded={expanded===c.id&&panel==="actions"} onClick={()=>open(c,"actions")}>Suggested actions</button></div></div>
          {expanded===c.id&&<div className="sr-15e-expanded">
            {panel==="experts"&&<section aria-label={`Ask experts on ${c.name}`}>
              <div className="sr-15e-expanded-head"><h3>Ask experts on {c.name}</h3><span><ShieldCheck size={15} aria-hidden="true"/> Fictional expert pool · no real delivery</span></div>
              <div className="sr-15e-steps">{STAGES.map((label,n)=><span key={label} className={stage===n?"active":stage>n?"complete":""}>{n+1}. {label}</span>)}</div>
              {c.experts.length===0?<div className="sr-15e-invite"><Users size={26} aria-hidden="true"/><h4>No experts in this demonstration pool</h4><p>Suggest the field of expertise needed. Do not enter a real person's name, contact details, location or sensitive information.</p><label>Area of expertise <input maxLength={120} placeholder="e.g., food security" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}/></label><button type="button" disabled={!inviteRole.trim()} onClick={()=>setInviteSubmitted(true)}>Preview trusted expert invitation</button>{inviteSubmitted&&<p role="status" className="sr-15e-confirm">Demo invitation prepared locally. Nothing was sent or saved.</p>}</div>
              : <><div className="sr-15e-expert-grid">{c.experts.map(e=><div key={e.id} className="sr-15e-expert-card"><div className="sr-15e-person"><span className="sr-15e-avatar">P</span><div><strong>{e.label}</strong><small>Pseudonym · fictional profile</small></div></div><p>{e.specialty} · {e.area}</p><small>Last active (demo): {e.active}</small><div className={e.available?"sr-15e-available":"sr-15e-unavailable"}>{e.available?"Open to questions":"Not taking questions now"}</div><button type="button" disabled={!e.available} onClick={()=>choose(e)}>{e.available?`Ask ${e.id} a question`:"Unavailable"}</button></div>)}</div>
              {expert && <div className="sr-15e-thread" aria-label="Illustrative conversation"><h4>Fictional conversation with {expert.label}</h4><p className="sr-15e-privacy"><EyeOff size={16} aria-hidden="true"/> All identities and messages here are invented. Nothing is delivered or stored. Do not enter sensitive information, exact locations, routes or security details.</p>
                {!submittedQuestion ? <div className="sr-15e-form"><label>Your question to {expert.label}<textarea rows={3} maxLength={400} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask a general, non-sensitive analysis question…" /></label><button type="button" disabled={!question.trim()} onClick={()=>{setSubmittedQuestion(question.trim());setStage(0);}}>Preview question (no sending)</button></div>
                : <><p className="sr-15e-bubble"><strong>You asked · demo</strong>{submittedQuestion}</p>
                  {stage>=1&&<p className="sr-15e-bubble reply"><strong>Expert reply · fictional</strong>For this demonstration I would compare the available public reports, document uncertainty, and flag evidence gaps before reaching a conclusion.</p>}
                  {stage>=2&&<p className="sr-15e-consent">Name-sharing proposal simulated. Both parties must explicitly opt in; there is no actual identity disclosure.</p>}
                  {stage>=3&&<p className="sr-15e-confirm" role="status"><CheckCircle2 size={16} aria-hidden="true"/> Both agreed (demo state). No real identities are revealed.</p>}
                  <div className="sr-15e-thread-actions">{stage===0&&<button type="button" onClick={()=>setStage(1)}>Show their reply (demo)</button>}{stage===1&&<button type="button" onClick={()=>setStage(2)}>Propose sharing names (demo)</button>}{stage===2&&<button type="button" onClick={()=>setStage(3)}>They accept (demo)</button>}<button type="button" className="subtle" onClick={()=>{setQuestion("");setSubmittedQuestion("");setStage(0);}}>Restart demonstration</button></div></>}
              </div>}
              </>}
              <div className="sr-15e-who"><strong>Who sees what? (proposed system, not active permissions)</strong><p><b>Selected expert:</b> Only their own future private exchange, subject to authentication.</p><p><b>Other experts:</b> No access to this private exchange.</p><p><b>Moderators:</b> Limited routing and moderation metadata under a future access policy.</p><p><b>Public:</b> No messages or identity information.</p></div>
            </section>}
            {panel==="update"&&<section className="sr-15e-form" aria-label={`Request update on ${c.name}`}><h3>Request an update on {c.name}</h3><p>Local UI demonstration only. No email is sent and no request is stored.</p><label>Demo email address <input type="email" maxLength={160} placeholder="you@partner-org.org" value={demoEmail} onChange={e=>setDemoEmail(e.target.value)}/></label><label>What would you like to know? (optional)<textarea rows={2} maxLength={400} value={updateRequest} onChange={e=>setUpdateRequest(e.target.value)} placeholder="A general, non-sensitive evidence question…"/></label><button type="button" disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(demoEmail)} onClick={()=>setUpdateSubmitted(true)}>Preview request (not sent)</button>{updateSubmitted&&<p role="status" className="sr-15e-confirm">Demo request composed. No email, API call, or persistence occurred.</p>}</section>}
            {panel==="actions"&&<section className="sr-15e-suggestions" aria-label={`Suggested partner actions for ${c.name}`}><h3>Questions for partner discussion · demonstration</h3><p>Not operational instructions. No funding or response recommendation has been validated.</p><ol><li>Review the original country analysis and its publication date.</li><li>Identify missing evidence and invite qualified review through authorized channels.</li><li>Record uncertainty, data freshness, and the need for human validation.</li></ol><div className="sr-15e-suggestion-actions"><button type="button" onClick={()=>setWatching(w=>w.includes(c.id)?w.filter(x=>x!==c.id):[...w,c.id])}>{watching.includes(c.id)?"Remove from local watchlist":"Add to local watchlist"}</button><span>Watchlist exists only in this browser session.</span></div></section>}
            <div className="sr-15e-close"><button type="button" onClick={()=>setExpanded(null)}>Close</button></div>
          </div>}
        </article>)}
        </div>
        {visible.length===0&&<p className="sr-15e-no-results">No matching fictional scenarios. Change the region or coverage filter.</p>}
        <div className="sr-15e-footer"><p>This screen is a standalone synthetic interaction prototype. For real, up-to-date analysis, consult the source directly.</p><Link to="/expert">Existing Chad synthetic forecasting workflow <ArrowRight size={15} aria-hidden="true"/></Link></div>
      </section>
    </div>
  </main>;
}
