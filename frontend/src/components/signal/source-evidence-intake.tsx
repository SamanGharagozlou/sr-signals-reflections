import { useState } from "react";
import { CheckCircle2, ChevronDown, Mail } from "lucide-react";
import { sourceEvidenceApi, type EvidencePreview, type EvidenceRecord, type EvidenceSource, type Proximity, type SourceCategory } from "@/lib/source-evidence-api";
import { MyEvidenceFollowups } from "./source-evidence-followups";

const EXAMPLE = `From: [removed]\nSubject: Fwd: Adré crossing\nOur team counted about 1,200 new arrivals on Tuesday. Most head to Iriba; border sites are full.\nCall me on [removed]`;
const EXAMPLE_LINK = "https://example.org/synthetic-chad-displacement-report";
const sources: {id: EvidenceSource; title: string}[] = [
  {id:"email",title:"Forward an email"}, {id:"link",title:"Paste a link"},
  {id:"photo",title:"Upload a photo"}, {id:"note",title:"Write a note"},
];
const steps = ["Received", "Personal details confirmed removed", "Linked to selected risk", "Checked by an analyst", "Accepted for analysis"];
const MAX_RAW_PHOTO = 8 * 1024 * 1024;
const MAX_STORED_PHOTO = 1024 * 1024;

async function prepareSyntheticImage(file: File): Promise<{base64:string; imageUrl:string}> {
  if (!["image/png", "image/jpeg"].includes(file.type)) throw new Error("Select a PNG or JPEG image only.");
  if (file.size > MAX_RAW_PHOTO) throw new Error("Select an image smaller than 8 MiB.");
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 20_000_000) {
      throw new Error("Image dimensions are unsupported.");
    }
    const scale = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser cannot prepare this synthetic photo.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    // Canvas re-encoding strips original file metadata, including EXIF/GPS.
    const imageUrl = canvas.toDataURL("image/png");
    const base64 = imageUrl.substring("data:image/png;base64,".length);
    if ((base64.length * 3) / 4 > MAX_STORED_PHOTO) {
      throw new Error("Prepared image exceeds 1 MiB. Use a smaller or simpler synthetic photo.");
    }
    return {base64, imageUrl};
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function SourceEvidenceIntake() {
  const [type,setType] = useState<EvidenceSource>("email");
  const [text,setText] = useState(EXAMPLE);
  const [photoData,setPhotoData] = useState<{base64:string;imageUrl:string}|null>(null);
  const [preview,setPreview] = useState<EvidencePreview|null>(null);
  const [saved,setSaved] = useState<EvidenceRecord|null>(null);
  const [risk,setRisk] = useState("R1043");
  const [place,setPlace] = useState("");
  const [date,setDate] = useState("");
  const [count,setCount] = useState("");
  const [event,setEvent] = useState("");
  const [category,setCategory] = useState<SourceCategory>("field_observation");
  const [proximity,setProximity] = useState<Proximity>("trusted_secondhand");
  const [synthetic,setSynthetic] = useState(false);
  const [noPii,setNoPii] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");

  const selectType=(next:EvidenceSource)=>{
    setType(next); setText(next==="email"?EXAMPLE:next==="link"?EXAMPLE_LINK:"");
    setPhotoData(null);setPreview(null);setSaved(null);setError("");
    setSynthetic(false);setNoPii(false);
  };
  const extract=async()=>{
    if (type==="photo" && !photoData) {setError("Choose a fictional PNG or JPEG photo first.");return;}
    setBusy(true);setError("");
    try {
      const result=await sourceEvidenceApi.preview({source_type:type,source_text:text});
      setPreview(result);setRisk(result.suggested_risk_id ?? "R1043");setPlace(result.reported_place);
      setDate(result.reported_date);setCount(result.reported_count?.toString() ?? "");setEvent(result.event);
      setSynthetic(false);setNoPii(false);
    } catch (e){setError(e instanceof Error?e.message:"Extraction preview failed");}
    finally{setBusy(false);}
  };
  const save=async()=>{
    if(!preview || !synthetic || !noPii)return;
    setBusy(true);setError("");
    try{
      const response=await sourceEvidenceApi.submit({
        source_type:type,source_text:preview.sanitized_preview,
        risk_id:risk,reported_place:place,reported_date:date,reported_count:count.trim()?Number(count):null,
        event,source_category:category,proximity,confirmed_synthetic:true,confirmed_no_pii:true,
        ...(type==="photo"&&photoData?{photo_png_base64:photoData.base64}:{}),
      });
      setSaved(response.item);
    } catch(e){setError(e instanceof Error?e.message:"Could not save the source");}
    finally{setBusy(false);}
  };
  return <><section className="mb-5 overflow-hidden rounded-xl border border-[#cddfe5] bg-white shadow-sm" aria-label="Add synthetic source to evidence log">
    <details open={false}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#0e4a68] px-4 py-3 text-white [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-semibold"><Mail size={18}/> Add a source <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium uppercase">Synthetic demo</span></span><ChevronDown size={18}/>
      </summary>
      <div className="space-y-4 p-4">
        <p className="text-xs leading-relaxed text-[#526977]">Use fictional, pre-redacted material only. Link references are not opened. Photos are resized and re-encoded before private storage; no OCR or image interpretation occurs. Source intake is separate from your expert forecast.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sources.map(s=><button type="button" key={s.id} aria-pressed={type===s.id}
            className={`rounded border px-2 py-2 text-xs ${type===s.id?"border-[#0b4a6f] bg-[#0b4a6f] text-white":"border-[#c6d5db] bg-white text-[#17445a]"}`}
            onClick={()=>selectType(s.id)}>{s.title}</button>)}
        </div>
        {type==="link" ? <label className="block text-xs font-semibold text-[#194b61]">Synthetic HTTPS reference
          <input type="url" value={text} maxLength={2200} onChange={e=>{setText(e.target.value);setPreview(null);setSaved(null);}}
            className="mt-2 w-full rounded border border-[#c8d9df] bg-[#f5f7f8] p-3 font-normal text-[#1c4052]" placeholder="https://example.org/synthetic-report" />
          <span className="mt-1 block text-[11px] font-normal text-[#667e88]">Saved as a reference only. The server never visits the URL; tracking parameters and fragments are removed.</span>
        </label> : <>
          {type==="photo"&&<div className="space-y-2 rounded border border-[#d3e2e8] bg-[#f5f8f9] p-3">
            <label className="block text-xs font-semibold text-[#194b61]">Select a fictional image (PNG or JPEG, up to 8 MiB)
              <input type="file" accept="image/png,image/jpeg" className="mt-2 block w-full text-xs" onChange={async e=>{
                const file=e.target.files?.[0]; e.currentTarget.value="";
                setPhotoData(null);setPreview(null);setSaved(null);setError("");
                if(!file)return;
                setBusy(true);
                try{setPhotoData(await prepareSyntheticImage(file));}
                catch(err){setError(err instanceof Error?err.message:"Could not prepare photo");}
                finally{setBusy(false);}
              }}/>
            </label>
            {photoData&&<div className="space-y-1"><img src={photoData.imageUrl} alt="Local synthetic photo preview" className="max-h-44 rounded border border-[#c6d7df] object-contain"/><p className="text-[11px] text-[#486c78]">Photo prepared as metadata-stripped PNG. Confirm the visible image contains no identifying people, signs or details.</p></div>}
          </div>}
          <label className="block text-xs font-semibold text-[#194b61]">{type==="photo"?"Describe what the photo illustrates (synthetic caption)":type==="email"?"Fictional pre-redacted email":"Fictional field note"}
            <textarea aria-label="Synthetic source text" className="mt-2 min-h-28 w-full rounded border border-[#c8d9df] bg-[#f5f7f8] p-3 font-mono text-xs font-normal text-[#1c4052]"
              maxLength={2200} value={text} onChange={e=>{setText(e.target.value);setPreview(null);setSaved(null);}}/>
          </label>
        </>}
        {!preview&&!saved&&<button type="button" className="w-full rounded bg-[#078ea6] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy||text.trim().length<10||(type==="photo"&&!photoData)} onClick={()=>void extract()}>{busy?"Preparing…":"EXTRACT & REVIEW"}</button>}
        {preview&&!saved&&<div className="space-y-3 border-t border-[#dce5e9] pt-3">
          <div className="rounded bg-[#e8f5f8] px-3 py-2 text-xs text-[#235063]"><strong>Suggested risk — confirm</strong><div>{risk} · Eastern Chad displacement (no validated match probability)</div></div>
          <p className="text-xs text-[#627b88]">{preview.notice}</p>
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
          <label className="flex items-start gap-2 text-xs text-[#355b6b]"><input type="checkbox" checked={synthetic} onChange={e=>setSynthetic(e.target.checked)}/> I confirm this is entirely fictional demo material, including any attached photo or link.</label>
          <label className="flex items-start gap-2 text-xs text-[#355b6b]"><input type="checkbox" checked={noPii} onChange={e=>setNoPii(e.target.checked)}/> I reviewed the text, URL path and visible image (if applicable) for personal identifiers.</label>
          <p className="text-[11px] text-[#6f5b2e]">Only synthetic inputs are supported. Basic text redaction cannot identify all PII; no automatic URL verification, photo analysis or risk-model updates occur.</p>
          <button type="button" onClick={()=>void save()} disabled={busy||!synthetic||!noPii||!event.trim()||!risk.trim()||(type==="photo"&&!photoData)||!!count.trim()&&(!Number.isInteger(Number(count))||Number(count)<0)}
            className="w-full rounded bg-[#0e4a68] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving…":"SAVE TO EVIDENCE LOG"}</button>
        </div>}
        {saved&&<div role="status" className="space-y-2"><div className="flex items-center gap-2 text-sm font-bold text-[#29744b]"><CheckCircle2 size={18}/> Saved as {saved.id}</div>
          {steps.map((label,i)=>{const done=i<3||(i===3&&saved.status!=="pending_review")||(i===4&&saved.status==="accepted_for_analysis");return <div key={label} className="flex gap-2 border-b border-[#e3eaed] py-2 text-xs"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${done?"bg-[#2b7d55] text-white":"bg-white text-[#7c9097]"}`}>{i+1}</span><span>{label}</span></div>;})}
          <p className="text-xs text-[#5b7480]">Pending independent analyst decision. No automatic forecasting or publication.</p>
          <button type="button" className="text-xs font-semibold text-[#07859b] underline" onClick={()=>selectType(type)}>Add another fictional source</button>
        </div>}
        {error&&<p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-800">{error}</p>}
      </div>
    </details>
  </section>
  <MyEvidenceFollowups refreshAfterSave={saved?.id ?? null}/>
  </>;
}
function Field({label,value,onChange,placeholder,type="text"}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;type?:string}){
  return <label className="block text-[11px] font-semibold text-[#194b61]">{label}<input type={type} min={type==="number"?0:undefined} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded border border-[#cddbe1] bg-white px-2 py-2 text-sm font-normal text-[#173e53]"/></label>;
}
