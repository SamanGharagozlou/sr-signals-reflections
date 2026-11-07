import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { sourceEvidenceApi, type Decision, type EvidenceRecord } from "@/lib/source-evidence-api";

const statusLabel: Record<EvidenceRecord["status"],string> = {
  pending_review:"Awaiting analyst",accepted_for_analysis:"Accepted for analysis",
  needs_more_evidence:"More evidence needed",rejected:"Rejected",
};
export function SourceEvidenceInbox(){
  const [items,setItems]=useState<EvidenceRecord[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [expanded,setExpanded]=useState(true);
  const [notes,setNotes]=useState<Record<string,string>>({});
  const refresh=async()=>{
    setBusy(true);setError("");
    try{const result=await sourceEvidenceApi.inbox();setItems(result.items);}catch(e){setError(e instanceof Error?e.message:"Could not load evidence");}
    finally{setBusy(false);}
  };
  useEffect(()=>{void refresh();},[]);
  const review=async(row:EvidenceRecord,decision:Decision)=>{
    setBusy(true);setError("");
    try{await sourceEvidenceApi.review(row.id,decision,notes[row.id]||"",row.version);await refresh();}
    catch(e){setError(e instanceof Error?e.message:"Decision failed");setBusy(false);}
  };
  return <section className="rounded-xl border border-[#d0e0e5] bg-white shadow-sm" aria-label="New synthetic source submissions">
    <div className="flex items-center justify-between gap-3 rounded-t-xl bg-[#0b4a6f] p-4 text-white">
      <div><p className="text-[10px] font-semibold uppercase tracking-widest text-[#aedce8]">S&R / PRIVATE ANALYST REVIEW</p><h2 className="mt-1 flex items-center gap-2 text-lg font-semibold"><ClipboardCheck size={19}/> New source evidence</h2>
        <p className="text-xs text-[#d1e8ef]">{items.filter(x=>x.status==="pending_review").length} awaiting human review · synthetic only</p></div>
      <button type="button" className="rounded border border-white/30 px-2 py-1 text-xs" onClick={()=>{setExpanded(v=>!v);if(!expanded)void refresh();}}>{expanded?"Collapse":"Open"}</button>
    </div>
    {expanded&&<div className="space-y-3 p-4">
      <div className="flex items-center justify-between"><p className="text-xs text-[#647b88]">Received reports are not verified facts. Acceptance permits analyst consideration, not automatic publication.</p><button type="button" disabled={busy} className="flex gap-1 text-xs text-[#007d98]" onClick={()=>void refresh()}><RefreshCw size={14}/>Refresh</button></div>
      {error&&<p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-800">{error}</p>}
      {!busy&&items.length===0&&<p className="rounded bg-[#f0f5f7] p-3 text-xs text-[#526f80]">No source records. Contribute as a synthetic expert and save a source, then return here.</p>}
      {items.map(row=><article key={row.id} className="rounded-lg border border-[#d9e5e9] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#124962]">{row.id} · {row.risk_id}</strong><span className="rounded bg-[#eff5f7] px-2 py-1 text-[11px] text-[#466573]">{statusLabel[row.status]}</span></div>
        <p className="mt-1 text-xs font-semibold text-[#204a5b]">{row.event} · {row.reported_place||"Location not resolved"} · {row.reported_date||"Date unknown"}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#5b7380]"><span>{row.reported_count??"Unquantified"} reported</span><span>· {row.source_category.replaceAll("_"," ")}</span><span>· {row.proximity.replaceAll("_"," ")}</span></div>
        <details className="mt-2 rounded bg-[#f4f7f8] px-3 py-2 text-xs text-[#345668]"><summary className="cursor-pointer font-semibold">Inspect sanitized submitted text{row.source_type==="link"?" (URL reference only)":row.source_type==="photo"?" (caption only)":""}</summary><pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">{row.redacted_text}</pre></details>
        {row.has_photo&&<details className="mt-2 rounded border border-[#d6e4e9] bg-[#f4f7f8] p-2 text-xs"><summary className="cursor-pointer font-semibold text-[#214f64]">Inspect private synthetic photo</summary><PrivatePhoto id={row.id}/></details>}
        {row.status==="pending_review"&&<div className="mt-3 space-y-2"><textarea value={notes[row.id]||""} maxLength={500} placeholder="Analyst rationale (optional, no personal identifiers)" onChange={e=>setNotes(s=>({...s,[row.id]:e.target.value}))} className="w-full rounded border border-[#c9dce2] p-2 text-xs" rows={2}/>
          <div className="flex flex-wrap gap-2">{([{v:"accepted_for_analysis",t:"Accept for analysis"},{v:"needs_more_evidence",t:"Request corroboration"},{v:"rejected",t:"Reject"}] as {v:Decision;t:string}[]).map(b=><button type="button" key={b.v} disabled={busy} onClick={()=>void review(row,b.v)} className="rounded border border-[#a7c5d0] bg-[#eaf5f7] px-3 py-2 text-xs font-semibold text-[#0b4a6f] disabled:opacity-50">{b.t}</button>)}</div>
        </div>}
        {row.reviewer_note&&<p className="mt-2 text-xs text-[#486a77]">Analyst note: {row.reviewer_note}</p>}
      </article>)}
    </div>}
  </section>;
}

function PrivatePhoto({id}:{id:string}){
  const [url,setUrl]=useState("");
  const [error,setError]=useState("");
  useEffect(()=>{
    let cancelled=false;
    let objectUrl="";
    void sourceEvidenceApi.moderatorPhoto(id).then(blob=>{
      if(cancelled)return;
      objectUrl=URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"Could not load private image");});
    return ()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[id]);
  if(error)return <p role="alert" className="mt-2 text-red-700">{error}</p>;
  if(!url)return <p className="mt-2 text-[#557686]">Loading protected photo…</p>;
  return <div className="mt-2 space-y-2"><img src={url} alt="Synthetic source submitted for private analyst review" className="max-h-60 max-w-full rounded border object-contain"/><p className="text-[11px] text-[#647b88]">Visible content is not automatically redacted or verified. Review manually before making any decision.</p></div>;
}
