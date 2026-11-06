import { ArrowUpRight, Activity, Database, Info } from "lucide-react";
import { api, useApi } from "@/lib/api/client";
import type { InformCrisisObservation } from "@/lib/api/types";

function CrisisRow({ c }: { c: InformCrisisObservation }) {
  return <div className="rounded-lg border border-[#d4e4e9] bg-white p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold tracking-wide text-[#00738C]">{c.crisis_id} · {c.level}</span>
      <span className="text-[10px] text-[#667985]">{c.last_updated}</span>
    </div>
    <p className="mt-1 text-[13px] font-bold leading-snug text-[#0B4A6F]">{c.crisis_name}</p>
    <div className="mt-2 flex flex-wrap items-baseline gap-2">
      <strong className="text-2xl tracking-tight text-[#00738C]">{c.score.toFixed(1)} <small className="text-sm font-medium">/ 10</small></strong>
      <span className="text-[11px] text-[#596f7c]">{c.trend} · {c.reliability} reliability</span>
    </div>
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {([['Impact',c.dimensions.impact],['People',c.dimensions.conditions],['Complexity',c.dimensions.complexity]] as const).map(([label,v])=>
        <div key={label} className="rounded-md bg-[#f0f6f8] px-2 py-1.5">
          <span className="block text-[10px] text-[#5b7685]">{label}</span>
          <strong className="text-[12px] text-[#234b60]">{v.toFixed(1)}</strong>
        </div>)}
    </div>
    {c.subnational_areas.length>0 && <p className="mt-2 text-[10px] text-[#526c78]">Geographic coverage: {c.subnational_areas.join(", ")}</p>}
  </div>;
}

export function InformCrisisContext({country}:{country:string}) {
  const q=useApi(()=>api.getInformCountryCrisisContext(country));
  return <section aria-label="Official crisis severity context" className="mt-4 rounded-xl border border-[#cbdde5] bg-[#edf5f7] p-4">
    <div className="flex items-center gap-2 text-[#0B4A6F]"><Activity size={18} aria-hidden/><h3 className="text-[15px] font-bold">Observed crisis severity in {country}</h3></div>
    <p className="mt-1 text-[11px] leading-relaxed text-[#516c7d]">Official INFORM Severity, September 2026. Multiple crises can coexist in one country.</p>
    {q.status==="loading" && <p className="mt-3 text-xs text-[#617889]">Loading official crisis context…</p>}
    {q.status==="error" && <p className="mt-3 text-xs text-[#9b3645]">Severity context request failed. No score inferred.</p>}
    {q.status==="ok" && !q.data.available && <p className="mt-3 flex items-center gap-2 text-xs text-[#526c7d]"><Database size={14}/>{q.data.reason || "Source not connected"}</p>}
    {q.status==="ok" && q.data.available && <>
      <div className="mt-3 space-y-2">{q.data.crises.map(c=><CrisisRow c={c} key={c.crisis_id}/>)}</div>
      {q.data.crises.length===0 && <p className="mt-3 text-xs text-[#526c7d]">No crisis entry for this country in the imported release.</p>}
      <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-[#546c7a]"><Info size={15} className="shrink-0" aria-hidden />{q.data.note}</p>
      <a className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#00738C] underline" href={q.data.source_url} rel="noopener noreferrer" target="_blank">Official INFORM data · {q.data.release}<ArrowUpRight size={13} aria-hidden/></a>
    </>}
  </section>;
}
