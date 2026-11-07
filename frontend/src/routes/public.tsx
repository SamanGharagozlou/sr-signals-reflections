import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, EyeOff, ShieldCheck } from "lucide-react";
import { AppHeader, ErrorState, Loading } from "@/components/signal/ui";
import { api, useApi } from "@/lib/api/client";

export const Route=createFileRoute("/public")({
  head:()=>({meta:[
    {title:"Partner Brief | S&R — Signals & Reflection"},
    {name:"description",content:"S&R privacy-safe, moderator-approved aggregate; no individual expert data."},
  ]}),
  component:PartnerBrief,
});
function PartnerBrief(){
  const q=useApi(()=>api.getPublicSummary());
  return <div className="min-h-screen sr-bg"><AppHeader section="Partner view / approved only"/>
    <main className="sr-page sr-report-page">
      <p className="sr-kicker">SHARE / HUMAN-APPROVED INTELLIGENCE</p>
      {q.status==="loading"&&<Loading label="Loading approved public snapshot…"/>}
      {q.status==="error"&&<ErrorState error={q.error} onRetry={q.refresh}/>}
      {q.status==="ok"&&!q.data.approved&&<div className="sr-report-unapproved"><EyeOff size={30}/><h1>Report awaiting approval</h1><p>The five-person synthetic expert panel and moderator review must be complete before the report is visible. S&R never presents a private or unapproved aggregate as public information.</p><Link className="sr-tertiary" to="/">Return to S&R <ArrowRight size={17}/></Link></div>}
      {q.status==="ok"&&q.data.approved&&(()=>{
        const d=q.data;
        return <article className="sr-report">
          <header className="sr-report-header"><div><p className="sr-kicker">PARTNER BRIEF / RISK {d.riskId} / SYNTHETIC CONSULTATION</p><h1>CHAD · <em>NEXT SIX MONTHS</em></h1><p>{d.riskTitle}</p></div><div className="sr-report-approved"><CheckCircle2 size={19}/> MODERATOR APPROVED</div></header>
          <div className="sr-report-banner"><h2>Independent experts. Reviewed synthesis. Controlled release.</h2><p>The displayed range reflects an approved, rounded five-person synthetic judgment. It is not a validated event forecast or an official ACAPS assessment.</p></div>
          <div className="sr-report-cards">
            <section><span>Expert median band</span><strong>{d.medianBand}</strong><p>Approved and rounded. No individual estimates are shared.</p></section>
            <section><span>Panel participation</span><strong>{d.panelN} / 5</strong><p>{d.forecastRound==="revised_panel"?"Approved revised Delphi panel":"Approved initial Delphi panel"}</p></section>
            <section><span>Original risk context</span><strong>{d.acapsRiskLevel||"Not recorded"}</strong><p>Separate qualitative Risk Radar assessment, not the expert probability.</p></section>
          </div>
          <div className="sr-report-lower"><section><p className="sr-kicker">THE RESOLUTION QUESTION</p><h3>{d.questionText}</h3><details className="sr-disclosure"><summary>Panel agreement and spread</summary><p>{d.spreadDescription}</p><p>{d.agreementSummary}</p></details></section><aside><ShieldCheck size={20}/><h3>Publication controls</h3><p>Only the frozen approved snapshot is public. No individual notes, identities or unreviewed scenario calculations are included.</p><p>{d.approvedAt?`Approved ${new Date(d.approvedAt).toLocaleString()}`:"Approved synthetic snapshot"}</p></aside></div>
          <div className="sr-report-footer"><p>Independent S&R hackathon prototype · Synthetic demo · No automated funding or operational decisions.</p><Link to="/situation-room">View geographic risk context <ArrowRight size={15}/></Link></div>
        </article>;
      })()}
    </main>
  </div>;
}
