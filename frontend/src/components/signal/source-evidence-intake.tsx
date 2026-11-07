import { useState } from "react";
import { CheckCircle2, ChevronDown, Mail } from "lucide-react";
import { sourceEvidenceApi, type EvidencePreview, type EvidenceRecord, type EvidenceSource, type Proximity, type SourceCategory } from "@/lib/source-evidence-api";

const EXAMPLE = `From: [removed]\nSubject: Fwd: Adré crossing\nOur team counted about 1,200 new arrivals on Tuesday. Most head to Iriba; border sites are full.\nCall me on [removed]`;
const sources: {id: EvidenceSource | "link" | "photo"; title: string}[] = [
  {id:"email",title:"Forward an email"}, {id:"link",title:"Paste a link"},
  {id:"photo",title:"Upload a photo"}, {id:"note",title:"Write a note"},
];
const steps = ["Received", "Personal details confirmed removed", "Linked to selected risk", "Checked by an analyst", "Accepted for analysis"];

export function SourceEvidenceIntake() {
  const [type,setType]=useState<EvidenceSource>("email");
  const [text,setText]=useState(EXAMPLE);
  const [preview,setPreview]=useState<EvidencePreview|null>(null);
  const [saved,setSaved]=useState<EvidenceRecord|null>(null);
  const [risk,setRisk]=useState("R1043");
  const [place,setPlace]=useState("");
  const [date,setDate]=useState("");
  const [count,setCount]=useState("");
  const [event,setEvent]=useState("");
  const [category,setCategory]=useState<SourceCategory>("field_observation");
  const [proximity,setProximity]=useState<Proximity>("trusted_secondhand");
  const [synthetic,setSynthetic]=useState(false);
  const [noPii,setNoPii]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const extract=async()=>{
    setBusy(true);setError("");
    try {
      const result=await sourceEvidenceApi.preview({source_type:type,source_text:text});
      setPreview(result);setRisk(result.suggested_risk_id ?? "R1043");setPlace(result.reported_place);
      setDate(result.reported_date);setCount(result.reported_count?.toString() ?? "");setEvent(result.event);
      setNoPii(false);setSynthetic(false);
    } catch (e){setError(e instanceof Error?e.message:"Extraction preview failed");}
    finally{setBusy(false);}
  };
  const save=async()=>{
    if(!preview || !synthetic || !noPii)return;
    setBusy(true);setError("");
    try{
      const response=await sourceEvidenceApi.submit({source_type:type,source_text:preview.sanitized_preview,
        risk_id:risk,reported_place:place,reported_date:date,reported_count:count.trim()?Number(count):null,
        event,source_category:category,proximity,confirmed_synthetic:true,confirmed_no_pii:true});
      setSaved(response.item);
    } catch(e){setError(e instanceof Error?e.message:"Could not save the source");}
    finally{setBusy(false);}
  };
  return <section className="mb-5 overflow-hidden rounded-xl border border-[#cddfe5] bg-white shadow-sm" aria-label="Add synthetic source to evidence log">
    <details open={false}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#0e4a68] px-4 py-3 text-white [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-semibold"><Mail size={18}/> Add a source <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium uppercase">Synthetic demo</span></span><ChevronDown size={18}/>
      </summary>
      <div className="space-y-4 p-4">
        <p className="text-xs leading-relaxed text-[#526977]">Paste a fictional, pre-redacted email or write a fictional observation. No real names, numbers, contact details or field reports. Source review is separate from the expert forecast.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sources.map(s=><button type="button" key={s.id} disabled={s.id==="link"||s.id==="photo"}
            className={`rounded border px-2 py-2 text-xs ${type===s.id?"border-[#0b4a6f] bg-[#0b4a6f] text-white":"border-[#c6d5db] bg-white text-[#17445a]"} disabled:cursor-not-allowed disabled:opacity-40`}
            title={s.id==="link"||s.id==="photo"?"Not supported in synthetic demonstration":undefined}
            onClick={()=>{if(s.id==="email"||s.id==="note"){setType(s.id);setText(s.id==="email"?EXAMPLE:"");setPreview(null);setSaved(null);}}}>{s.title}</button>)}
        </div>
        <textarea aria-label="Synthetic source text" className="min-h-28 w-full rounded border border-[#c8d9df] bg-[#f5f7f8] p-3 font-mono text-xs text-[#1c4052]"
          maxLength={2200} value={text} onChange={e=>{setText(e.target.value);setPreview(null);setSaved(null);}}/>
        {!preview&&!saved&&<button type="button" className="w-full rounded bg-[#078ea6] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={busy||text.trim().length<10} onClick={extract}>{busy?"Extracting…":"EXTRACT & REVIEW"}</button>}
        {preview&&!saved&&<div className="space-y-3 border-t border-[#dce5e9] pt-3">
          <div className="rounded bg-[#e8f5f8] px-3 py-2 text-xs text-[#235063]"><strong>Suggested risk — confirm</strong><div>R1043 · Eastern Chad displacement (not a validated match probability)</div></div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Reported date" value={date} onChange={setDate} placeholder="Unknown"/>
            <Field label="Reported place" value={place} onChange={setPlace} placeholder="Unknown"/>
            <Field label="Number reported" value={count} onChange={setCount} placeholder="If stated" type="number"/>
          </div>
          <Field label="Reported event" value={event} onChange={setEvent}/>
          <label className="block text-xs font-medium text-[#1a495c]">Source category
            <select value={category} onChange={e=>setCategory(e.target.value as SourceCategory)} className="mt-1 w-full rounded border border-[#cddbe1] bg-white p-2 text-sm">
              <option value="field_observation">Field observation</option><option value="ngo_report">NGO report</option><option value="news_media">News/media</option><option value="other">Other</option>
            </select>
          </label>
          <div className="text-xs font-semibold text-[#1a495c]">How do you know this? <span className="font-normal text-[#5c7783]">(Source proximity, not a truth score)</span></div>
          <div className="grid grid-cols-3 gap-1">{([{id:"firsthand",label:"I saw it"},{id:"trusted_secondhand",label:"Someone I trust"},{id:"media",label:"Media"}] as {id:Proximity;label:string}[]).map(p=><button type="button" key={p.id} className={`rounded border p-2 text-[11px] ${p.id===proximity?"bg-[#0d4a68] text-white":"bg-white text-[#0d4a68]"}`} onClick={()=>setProximity(p.id)}>{p.label}</button>)}</div>
          <label className="flex items-start gap-2 text-xs text-[#355b6b]"><input type="checkbox" checked={synthetic} onChange={e=>setSynthetic(e.target.checked)}/> I confirm this is entirely fictional demo material.</label>
          <label className="flex items-start gap-2 text-xs text-[#355b6b]"><input type="checkbox" checked={noPii} onChange={e=>setNoPii(e.target.checked)}/> I reviewed the entire sanitized text and removed personal identifiers.</label>
          <p className="text-[11px] text-[#6f5b2e]">Extraction is heuristic; dates, locations, redaction and source claims require human review. Only the sanitized text is saved.</p>
          <button type="button" onClick={save} disabled={busy||!synthetic||!noPii||!event.trim()||!risk.trim()||!!count.trim()&&(!Number.isInteger(Number(count))||Number(count)<0)} className="w-full rounded bg-[#0e4a68] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving…":"SAVE TO EVIDENCE LOG"}</button>
        </div>}
        {saved&&<div role="status" className="space-y-2"><div className="flex items-center gap-2 text-sm font-bold text-[#29744b]"><CheckCircle2 size={18}/> Saved as {saved.id}</div>
          {steps.map((label,i)=>{const done=i<3||(i===3&&saved.status!=="pending_review")||(i===4&&saved.status==="accepted_for_analysis");return <div key={label} className="flex gap-2 border-b border-[#e3eaed] py-2 text-xs"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${done?"bg-[#2b7d55] text-white":"bg-white text-[#7c9097]"}`}>{i+1}</span><span>{label}</span></div>;})}
          <p className="text-xs text-[#5b7480]">Pending analyst decision. Not yet verified or used to calibrate the spillover simulator.</p>
          <button type="button" className="text-xs font-semibold text-[#07859b] underline" onClick={()=>{setSaved(null);setPreview(null);setText(type==="email"?EXAMPLE:"");setNoPii(false);setSynthetic(false);}}>Add another fictional source</button>
        </div>}
        {error&&<p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-800">{error}</p>}
      </div>
    </details>
  </section>;
}
function Field({label,value,onChange,placeholder,type="text"}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;type?:string}){
  return <label className="block text-[11px] font-semibold text-[#194b61]">{label}<input type={type} min={type==="number"?0:undefined} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded border border-[#cddbe1] bg-white px-2 py-2 text-sm font-normal text-[#173e53]"/></label>;
}
