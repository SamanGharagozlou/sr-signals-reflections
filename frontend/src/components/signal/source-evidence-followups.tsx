import { useEffect, useState } from "react";
import { sourceEvidenceApi, type EvidenceFollowup, type EvidenceRecord } from "@/lib/source-evidence-api";

const statusText: Record<EvidenceRecord["status"], string> = {
  pending_review: "Awaiting analyst",
  accepted_for_analysis: "Accepted for analysis",
  needs_more_evidence: "Clarification requested",
  rejected: "Rejected",
};

/** Expert-owned clarification inbox. The original evidence cannot be overwritten. */
export function MyEvidenceFollowups({refreshAfterSave}:{refreshAfterSave:string|null}) {
  const [items,setItems]=useState<EvidenceRecord[]>([]);
  const [messages,setMessages]=useState<Record<string,string>>({});
  const [confirmations,setConfirmations]=useState<Record<string,boolean>>({});
  const [history,setHistory]=useState<Record<string,EvidenceFollowup[]>>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const refresh=async()=>{
    setBusy(true);setError("");
    try{
      const result=await sourceEvidenceApi.mine();
      setItems(result.items);
      const h:Record<string,EvidenceFollowup[]> = {};
      for(const item of result.items) {
        if(item.status==="needs_more_evidence" || item.version>1) {
          h[item.id]=(await sourceEvidenceApi.ownFollowups(item.id)).items;
        }
      }
      setHistory(h);
    }catch(e){setError(e instanceof Error?e.message:"Could not load your evidence history");}
    finally{setBusy(false);}
  };
  useEffect(()=>{void refresh();},[refreshAfterSave]);
  const submit=async(record:EvidenceRecord)=>{
    if(!confirmations[record.id] || (messages[record.id]||"").trim().length<15)return;
    setBusy(true);setError("");setConfirmation("");
    try{
      await sourceEvidenceApi.followup(record.id,messages[record.id],record.version);
      setConfirmation(`${record.id}: clarification submitted for analyst re-review.`);
      setMessages(previous=>({...previous,[record.id]:""}));
      setConfirmations(previous=>({...previous,[record.id]:false}));
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Follow-up failed. Refresh and retry.");setBusy(false);}
  };
  return <section className="mb-5 overflow-hidden rounded-xl border border-[#cddfe5] bg-white shadow-sm" aria-label="My evidence history and clarifications">
    <details>
      <summary className="cursor-pointer bg-[#0e4a68] px-4 py-3 text-sm font-semibold text-white">Reflect on source evidence · My evidence ({items.length})</summary>
      <div className="space-y-3 p-4">
        <p className="text-xs text-[#526977]">Analyst feedback is private. When clarification is requested, send an additional fictional note; your original evidence stays unchanged.</p>
        <button type="button" onClick={()=>void refresh()} disabled={busy} className="text-xs font-semibold text-[#047e96] underline">Refresh evidence status</button>
        {error&&<p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-800">{error}</p>}
        {confirmation&&<p role="status" className="rounded bg-green-50 p-2 text-xs text-green-800">{confirmation}</p>}
        {items.length===0&&<p className="text-xs text-[#526977]">No sources submitted with this expert account.</p>}
        {items.map(row=><div key={row.id} className="space-y-2 rounded border border-[#d7e4e9] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#14485c]">{row.id} · {row.risk_id}</strong><span className="rounded bg-[#eaf3f6] px-2 py-1 text-xs">{statusText[row.status]}</span></div>
          <p className="text-xs text-[#526977]">{row.event} · {row.reported_place||"Location unknown"}</p>
          {row.reviewer_note&&<p className="rounded bg-[#f2f6f8] p-2 text-xs"><strong>Analyst feedback:</strong> {row.reviewer_note}</p>}
          {history[row.id]?.length>0&&<details className="text-xs"><summary className="cursor-pointer font-semibold text-[#16607b]">Earlier clarifications ({history[row.id].length})</summary>
            <div className="mt-2 space-y-2">{history[row.id].map(f=><div key={f.id} className="rounded bg-[#f5f8f9] p-2"><span className="font-medium">Sent {f.created_at}</span><p className="mt-1 whitespace-pre-wrap break-words">{f.redacted_message}</p></div>)}</div>
          </details>}
          {row.status==="needs_more_evidence"&&<div className="space-y-2 border-t pt-2">
            <label className="block text-xs font-semibold text-[#14506b]">Your clarification (fictional only)
              <textarea maxLength={1200} rows={3} value={messages[row.id]||""} onChange={e=>setMessages(s=>({...s,[row.id]:e.target.value}))}
                className="mt-1 w-full rounded border border-[#c8dbe1] p-2 font-normal" placeholder="Clarify the date, location or counting method requested by the analyst. Do not include real personal details."/>
            </label>
            <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={!!confirmations[row.id]} onChange={e=>setConfirmations(s=>({...s,[row.id]:e.target.checked}))}/> This clarification is fictional and contains no personal identifiers.</label>
            <button type="button" disabled={busy||!confirmations[row.id]||(messages[row.id]||"").trim().length<15} onClick={()=>void submit(row)}
              className="rounded bg-[#078ea6] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Submit clarification for re-review</button>
          </div>}
        </div>)}
      </div>
    </details>
  </section>;
}

/** Protected analyst record of appended clarifications; details stay outside Share. */
export function ReviewerFollowups({evidenceId,version}:{evidenceId:string;version:number}) {
  const [items,setItems]=useState<EvidenceFollowup[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{
    let cancelled=false;
    void sourceEvidenceApi.moderatorFollowups(evidenceId).then(response=>{
      if(!cancelled)setItems(response.items);
    }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"Clarification history unavailable");});
    return ()=>{cancelled=true;};
  },[evidenceId,version]);
  if(error)return <p className="mt-2 text-xs text-red-800">{error}</p>;
  if(!items.length)return null;
  return <details className="mt-2 rounded border border-[#c8dee6] bg-[#edf6f8] p-2 text-xs">
    <summary className="cursor-pointer font-semibold text-[#114f66]">Contributor follow-ups ({items.length})</summary>
    <div className="mt-2 space-y-2">{items.map(item=><div key={item.id} className="rounded bg-white p-2">
      <p className="font-semibold text-[#14516b]">Clarification submitted {item.created_at}</p>
      <p className="mt-1 whitespace-pre-wrap break-words">{item.redacted_message}</p>
      <p className="mt-1 text-[#607984]">Previous analyst request: {item.request_note}</p>
    </div>)}</div>
  </details>;
}
