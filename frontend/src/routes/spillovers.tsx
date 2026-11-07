import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, Copy, LockKeyhole, Pause, Play, RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { COUNTRY_OUTLINES } from "@/lib/geo/country-paths";
import { AppHeader, ErrorState, Loading } from "@/components/signal/ui";
import { api, useApi } from "@/lib/api/client";
import {
  CHANNELS, DEFAULT_SCENARIO, SHOCK_LABEL,
  scenarioMemo, simulateSpillover, type Channel, type ScenarioInput, type ScenarioOutput, type Shock,
} from "@/lib/spillover-model";

export const Route = createFileRoute("/spillovers")({
  head: () => ({ meta: [
    { title: "Spillovers | S&R Analyst Sandbox" },
    { name: "description", content: "Human-controlled, explicitly illustrative shock-propagation sensitivity analysis for humanitarian risk." },
  ] }),
  component: SpilloversPage,
});

function SpilloversPage() {
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="min-h-screen sr-bg">
    <AppHeader section="Analyst sandbox" />
    <main className="sr-page">
      <div className="sr-intro">
        <div><p className="sr-kicker">ANALYSE / SPILLOVERS / HUMAN-IN-THE-LOOP</p>
          <h1>How could a shock <em>spill over?</em></h1>
          <p>Test one assumption at a time. Watch possible effects unfold across connected risks and review the reasoning.</p>
        </div>
        <div className="sr-demo-label"><ShieldCheck size={17}/> Synthetic scenario, not a verified forecast</div>
      </div>
      {!authorized ? <section className="sr-gate">
        <LockKeyhole size={26}/><h2>Enter the internal analyst demonstration</h2>
        <p>The latest synthetic panel aggregate is accessible only through the moderator-protected API. The sandbox does not expose individual expert notes or personal identities.</p>
        {error && <p role="alert" className="sr-error">{error}</p>}
        <button disabled={busy} className="sr-primary" onClick={async()=>{
          setBusy(true); setError("");
          try { await api.login("moderator"); setAuthorized(true); }
          catch(e) { setError(e instanceof Error ? e.message : "Could not open analyst role"); }
          finally { setBusy(false); }
        }}>{busy ? "Opening…" : "Enter analyst view"} <ArrowRight size={17}/></button>
        <Link to="/expert" className="sr-small-link">Return to expert contribution</Link>
      </section> : <AnalystSandbox />}
    </main>
  </div>;
}

function AnalystSandbox() {
  const [refreshKey,setRefreshKey] = useState(0);
  return <PanelSnapshot key={refreshKey} onRefresh={()=>setRefreshKey(x=>x+1)}/>;
}
function PanelSnapshot({onRefresh}:{onRefresh:()=>void}) {
  const q=useApi(()=>api.getSituationRoomAnalyst());
  const [scenario,setScenario]=useState<ScenarioInput>({ ...DEFAULT_SCENARIO, enabled:{...DEFAULT_SCENARIO.enabled} });
  const [playing,setPlaying]=useState(false);
  const [copied,setCopied]=useState(false);
  useEffect(()=>{
    if(!playing) return;
    const id=window.setInterval(()=>setScenario(old=>{
      if(old.week>=12) {setPlaying(false);return old;}
      return {...old,week:old.week+1};
    }),650);
    return ()=>window.clearInterval(id);
  },[playing]);
  const out=useMemo(()=>simulateSpillover(scenario),[scenario]);
  if(q.status==="loading")return <Loading label="Checking latest five-expert panel…"/>;
  if(q.status==="error")return <ErrorState error={q.error} onRetry={q.refresh}/>;
  const panel=q.data.panel;
  const memo=scenarioMemo(scenario,out,`${panel.count}/${panel.expected} synthetic expert submissions; aggregate median ${panel.revised_panel_median ?? panel.round_one_median ?? "not available"}%.`);
  const setNumber=(key:"intensity"|"transmission"|"delayWeeks"|"week",v:number)=>setScenario(s=>({...s,[key]:v}));
  const toggle=(channel:Channel)=>setScenario(s=>({...s,enabled:{...s.enabled,[channel]:!s.enabled[channel]}}));
  const copy=async()=>{
    try { await navigator.clipboard.writeText(memo);setCopied(true);window.setTimeout(()=>setCopied(false),2000); }
    catch{setCopied(false);}
  };
  return <>
    <div className="sr-panel-context">
      <div className="sr-panel-identity"><span className="sr-dot"/><div><strong>Latest synthetic contribution panel</strong><small>Risk R1043 · Eastern Chad / Sudan displacement · private aggregates only</small></div></div>
      <div className="sr-panel-quick"><div><span>Experts</span><strong>{panel.count}/{panel.expected}</strong></div><div><span>Median estimate</span><strong>{panel.revised_panel_median ?? panel.round_one_median ?? "—"}{panel.round_one_median == null ? "" : "%"}</strong></div><div><span>Moderator approved</span><strong>{panel.approved ? "Yes" : "Not yet"}</strong></div></div>
      <button onClick={onRefresh} className="sr-tertiary">Refresh latest input</button>
    </div>
    <div className="sr-critical-note">The live panel updates after an expert submits. An expert contribution is a hypothesis, <strong>not automatically verified evidence</strong>. The operator explicitly selects a shock and assumptions below; the model does not infer causality from panel forecasts.</div>
    <div className="sr-sandbox-grid">
      <aside className="sr-controls">
        <div className="sr-section-head"><SlidersHorizontal size={18}/><h2>Isolate a shock</h2></div>
        <label className="sr-field-label" htmlFor="sr-shock">Scenario assumption</label>
        <select id="sr-shock" value={scenario.shock} onChange={e=>{setPlaying(false);setScenario(s=>({...s,shock:e.target.value as Shock,week:0}));}}>
          {(Object.keys(SHOCK_LABEL) as Shock[]).map(k=><option key={k} value={k}>{SHOCK_LABEL[k]}</option>)}
        </select>
        <Range label="Assumed magnitude" value={scenario.intensity} min={0} max={100} unit="/100" onChange={v=>setNumber("intensity",v)}/>
        <Range label="Transmission assumption" value={scenario.transmission} min={0} max={100} unit="%" onChange={v=>setNumber("transmission",v)}/>
        <Range label="Propagation delay" value={scenario.delayWeeks} min={0} max={6} unit=" weeks" onChange={v=>setNumber("delayWeeks",v)}/>
        <div className="sr-section-head sr-edges-head"><h3>Active pathways</h3><span>Toggle to isolate</span></div>
        <div className="sr-channels">{CHANNELS.map(c=><label key={c.id} className="sr-channel"><input type="checkbox" checked={scenario.enabled[c.id]} onChange={()=>toggle(c.id)}/><span><strong>{c.name}</strong><small>{c.explanation}</small></span></label>)}</div>
        <button className="sr-tertiary sr-reset" onClick={()=>{setPlaying(false);setScenario({...DEFAULT_SCENARIO,enabled:{...DEFAULT_SCENARIO.enabled}});}}><RotateCcw size={15}/> Reset assumptions</button>
      </aside>
      <section className="sr-visual" aria-label="Illustrative geographic shock spillover map">
        <div className="sr-section-head sr-visual-head"><div><p className="sr-kicker">REGIONAL MAP / ILLUSTRATIVE NETWORK</p><h2>How effects travel</h2></div><span className="sr-legend"><span/> Enabled channel</span></div>
        <NetworkChart scenario={scenario} out={out} playing={playing}/>
        <div className="sr-playback">
          <button className="sr-primary" onClick={()=>{if(scenario.week>=12)setNumber("week",0);setPlaying(p=>!p);}} aria-label={playing?"Pause animation":"Play animation"}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?"Pause":"Play shock"}</button>
          <div className="sr-week-control"><label htmlFor="sr-week">Time: week <strong>{scenario.week}</strong> / 12</label><input id="sr-week" type="range" min={0} max={12} value={scenario.week} onChange={e=>{setPlaying(false);setNumber("week",Number(e.target.value));}}/></div>
        </div>
        <p className="sr-visual-warning">Arrows show <strong>assumed</strong> pathways and model response. Numerical values are relative pressure points, not humanitarian risk ratings, probabilities, verified impacts or ACAPS predictions.</p>
      </section>
      <aside className="sr-outcomes">
        <div className="sr-section-head"><h2>Scenario response</h2></div>
        <p className="sr-quiet">At week {scenario.week}; change one parameter and compare the bars.</p>
        {([ ["Movement pressure",out.displacement],["Aid-access pressure",out.access],["Basic-needs pressure",out.basicNeeds],["Regional pressure",out.regional] ] as [string,number][]).map(([name,n])=><div key={name} className="sr-result"><span>{name}<b>{n.toFixed(1)}</b></span><div className="sr-result-track"><span style={{width:`${n}%`}}/></div></div>)}
        <details className="sr-disclosure"><summary>How are values calculated? <ChevronDown size={15}/></summary><p>Deterministic bounded transfer with fictional shock-specific channel coefficients, a user-controlled transmission multiplier, and a delayed response curve. No regression, observed causal estimates, historical fitting or uncertainty calibration is performed. All results change only with the scenario inputs.</p></details>
        <div className="sr-actions"><Link className="sr-tertiary" to="/situation-room">Return to Situation Room</Link><Link className="sr-primary" to="/moderator">Review & approve <ArrowRight size={16}/></Link></div>
      </aside>
    </div>
    <section className="sr-analyst-report"><div><p className="sr-kicker">ANALYST WORKSPACE / NOT PUBLIC</p><h2>Scenario notes</h2><p>For discussion with the jury. This local sensitivity note is separate from the moderator-approved public forecast.</p></div><button className="sr-tertiary" onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?"Copied":"Copy analyst notes"}</button><details><summary>Read calculation and provenance note <ChevronDown size={16}/></summary><pre>{memo}</pre></details></section>
    <div className="sr-next"><p>When your team completes evidence review, a moderator can release an approved forecast. The public page contains only that frozen aggregate.</p><Link to="/public">View approved partner brief <ArrowRight size={16}/></Link></div>
  </>;
}
function Range({label,value,min,max,unit,onChange}:{label:string;value:number;min:number;max:number;unit:string;onChange:(n:number)=>void}) {
  const id=`sr-${label.toLowerCase().replace(/[^a-z]+/g,"-")}`;
  return <div className="sr-range"><label htmlFor={id}>{label}<strong>{value}{unit}</strong></label><input id={id} type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}/></div>;
}
function NetworkChart({scenario:v,out,playing}:{scenario:ScenarioInput;out:ScenarioOutput;playing:boolean}) {
  const active=(id:Channel)=>v.enabled[id] && v.intensity>0 && v.transmission>0;
  return <svg className={`sr-network ${playing?"sr-network-live":""}`} viewBox="0 0 700 380" role="img" aria-label={`Assumption network at week ${v.week}: movement ${out.displacement}, access ${out.access}, needs ${out.basicNeeds}, regional ${out.regional} pressure points`}>
    <defs><marker id="sr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#05839B"/></marker></defs>
    <rect x="0" y="0" width="700" height="380" rx="12" fill="#EDF4F6"/>
    <g transform="translate(-1585 -690) scale(3.7)" opacity="0.23" aria-hidden="true">{COUNTRY_OUTLINES.filter(c=>["TCD","SDN","SSD","NER","NGA","CMR","CAF","LBY"].includes(c.iso)).map(c=><path key={c.iso} d={c.d} fill={c.iso==="TCD"?"#6fb6c7":"#bfd0d4"} stroke="white" strokeWidth="0.8"/>)}</g>
    <path d="M144 177 C210 172,210 106,268 108" className={active("movement")?"sr-edge sr-edge-on":"sr-edge"} markerEnd={active("movement")?"url(#sr-arrow)":undefined}/>
    <path d="M144 191 C205 210,210 275,268 275" className={active("access")?"sr-edge sr-edge-on":"sr-edge"} markerEnd={active("access")?"url(#sr-arrow)":undefined}/>
    <path d="M420 107 Q505 108 528 180" className={active("needs")?"sr-edge sr-edge-on":"sr-edge"} markerEnd={active("needs")?"url(#sr-arrow)":undefined}/>
    <path d="M420 274 Q502 263 528 205" className={active("needs")?"sr-edge sr-edge-on":"sr-edge"} markerEnd={active("needs")?"url(#sr-arrow)":undefined}/>
    <path d="M420 109 Q510 65 530 63" className={active("regional")?"sr-edge sr-edge-on":"sr-edge"} markerEnd={active("regional")?"url(#sr-arrow)":undefined}/>
    <Node x={22} y={142} w={122} title={v.shock==="flood"?"Flood shock":v.shock==="movement"?"Border surge":"Conflict shock"} value={out.origin} sub="Assumed input" dark/>
    <Node x={268} y={70} w={152} title="Movement / Chad" value={out.displacement} sub="Possible pathway" active={active("movement")}/>
    <Node x={268} y={237} w={152} title="Access / Chad" value={out.access} sub="Possible pathway" active={active("access")}/>
    <Node x={528} y={151} w={150} title="Basic needs" value={out.basicNeeds} sub="Possible pressure" active={active("needs")}/>
    <Node x={528} y={20} w={150} title="Regional / Niger" value={out.regional} sub="Illustrative pathway" active={active("regional")}/>
    <text x="350" y="355" fill="#67818A" fontSize="13" textAnchor="middle">Cross-border effects are assumptions · No province or person is geolocated</text>
  </svg>;
}
function Node({x,y,w,title,value,sub,dark=false,active=true}:{x:number;y:number;w:number;title:string;value:number;sub:string;dark?:boolean;active?:boolean}) {
  return <g><rect x={x} y={y} width={w} height={77} rx={9} fill={dark?"#104B68":active?"#B7E2E9":"#DCE7E9"} stroke={dark?"#104B68":active?"#71B5C2":"#C2CED2"} strokeWidth="1.3"/><text x={x+w/2} y={y+24} textAnchor="middle" fontSize="13" fontWeight="bold" fill={dark?"#fff":"#104B68"}>{title}</text><text x={x+w/2} y={y+47} textAnchor="middle" fontSize="21" fontWeight="bold" fill={dark?"#fff":"#08647B"}>{value.toFixed(1)}</text><text x={x+w/2} y={y+64} textAnchor="middle" fontSize="10" fill={dark?"#CFEDF1":"#527B87"}>{sub}</text></g>;
}
