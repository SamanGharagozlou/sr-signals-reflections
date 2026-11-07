import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardList, Compass, FileCheck2, MapPinned, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/signal/ui";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/")({
  head:()=>({meta:[
    {title:"S&R | Signals & Reflections"},
    {name:"description",content:"S&R is a moderator-first humanitarian expert consultation, scenario exploration and privacy-safe reporting prototype."},
    {property:"og:title",content:"S&R — Signals & Reflections"},
  ]}),
  component:Home,
});
function Home() {
  const nav=useNavigate();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const enter=async()=>{
    setBusy(true);setError("");
    try{await api.login("expert");nav({to:"/expert"});}
    catch(e){setError(e instanceof Error?e.message:"Cannot open expert demo");}
    finally{setBusy(false);}
  };
  return <div className="min-h-screen sr-bg">
    <AppHeader section="Synthetic demo"/>
    <main className="sr-home">
      <div className="sr-home-hero">
        <div><p className="sr-kicker">SIGNALS & REFLECTIONS / GROUND TRUTH</p>
          <h1>From local signals to <em>shared understanding.</em></h1>
          <p>Experts contribute independent judgment. Analysts review what changed and explore scenarios. Moderators approve the information partners can safely use.</p>
          <div className="sr-home-actions"><button className="sr-primary" onClick={enter} disabled={busy}><ClipboardList size={18}/>{busy?"Opening expert demo…":"Start expert contribution"}<ArrowRight size={17}/></button><Link className="sr-tertiary" to="/situation-room"><MapPinned size={17}/> Open situation room</Link></div>
          {error&&<p className="sr-error" role="alert">{error}</p>}
          <p className="sr-hero-foot"><ShieldCheck size={15}/> Five synthetic experts · Human approval · No live humanitarian predictions</p>
        </div>
        <div className="sr-home-visual" aria-label="Expert contributions become reviewable intelligence and then a human-approved public brief">
          <div className="sr-home-visual-top"><span className="sr-visual-number">01</span><p>EXPERT SIGNAL</p><strong>Independent forecast<br/>and evidence gap</strong></div>
          <div className="sr-home-connector">↓</div>
          <div className="sr-home-visual-top sr-home-visual-mid"><span className="sr-visual-number">02</span><p>ANALYST REFLECTION</p><strong>5-person panel<br/>and shock simulation</strong></div>
          <div className="sr-home-connector">↓</div>
          <div className="sr-home-visual-top sr-home-visual-last"><span className="sr-visual-number">03</span><p>APPROVED PARTNER BRIEF</p><strong>Privacy-safe<br/>human decision</strong></div>
        </div>
      </div>
      <div className="sr-home-steps">
        <div className="sr-home-step"><ClipboardList size={21}/><span>01 / CONTRIBUTE</span><h2>What do experts know?</h2><p>Capture an assessment, a six-month estimate and missing evidence, without treating opinion as fact.</p><button onClick={enter} disabled={busy}>Enter expert view <ArrowRight size={15}/></button></div>
        <div className="sr-home-step"><Compass size={21}/><span>02 / ANALYSE</span><h2>What changed?</h2><p>See updated panel aggregates, review evidence gaps and use a transparent scenario sandbox.</p><Link to="/spillovers">Open analyst sandbox <ArrowRight size={15}/></Link></div>
        <div className="sr-home-step"><FileCheck2 size={21}/><span>03 / SHARE</span><h2>What can we release?</h2><p>Present only a frozen moderator-approved aggregate, never private individual contributions.</p><Link to="/public">Open partner brief <ArrowRight size={15}/></Link></div>
      </div>
      <p className="sr-home-footnote"><CheckCircle2 size={15}/> ACAPS Risk Radar information is source context. Expert responses and all scenario paths are synthetic. S&R is an independent hackathon prototype, not an official ACAPS deployment.</p>
    </main>
  </div>;
}
