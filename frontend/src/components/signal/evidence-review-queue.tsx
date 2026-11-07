/** Moderator-only source-field triage. This is NOT verification of ACAPS assessments. */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardCheck, Database, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, useApi } from "@/lib/api/client";
import type { EvidenceQualityFlag, EvidenceReviewItem } from "@/lib/api/types";

function FlagRow({ riskId, flag, refresh }: { riskId: string; flag: EvidenceQualityFlag; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const update = async () => {
    setBusy(true);
    try {
      await api.triageEvidenceFlag({
        risk_id: riskId, rule_code: flag.code, fingerprint: flag.fingerprint,
        disposition: flag.triaged ? "open" : "triaged",
      });
      toast.success(flag.triaged ? "Flag reopened for review" : "Flag marked as triaged — evidence not verified");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return <li className={`rounded-lg border p-3 ${flag.triaged ? "border-[#d6e4e8] bg-[#f3f7f8]" : "border-[#d5e1e6] bg-white"}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {flag.triaged ? <CheckCircle2 size={14} className="shrink-0 text-[#2E7D4F]" aria-hidden /> : <AlertTriangle size={14} className="shrink-0 text-[#B4570B]" aria-hidden />}
          <h4 className="text-[13px] font-semibold text-[#123b52]">{flag.label}</h4>
          {flag.triaged && <span className="rounded bg-[#dfeee4] px-1.5 py-0.5 text-[10px] font-medium text-[#27683f]">Triaged</span>}
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-[#526a77]">{flag.reason}</p>
        <p className="mt-1 text-[12px] text-[#29475b]"><strong>Suggested check:</strong> {flag.suggested_review}</p>
        <p className="mt-1 text-[10px] text-[#647b86]">Source field: {flag.source_field}{flag.triaged_at ? ` · triaged ${flag.triaged_at.slice(0,10)}` : ""}</p>
      </div>
      <Button size="sm" variant="outline" disabled={busy} onClick={update}
        className="shrink-0 border-[#c7dce5] text-[#0B4A6F] hover:bg-[#e9f4f7]">
        {busy ? "Saving…" : flag.triaged ? "Reopen" : "Mark triaged"}
      </Button>
    </div>
  </li>;
}

function RecordCard({ item, refresh }: { item: EvidenceReviewItem; refresh: () => void }) {
  return <article className="rounded-xl border border-[#d6e3e9] bg-[#f8fafb] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="text-[#00738C]">{item.risk_id}</span>
          <span className="rounded bg-[#e3edf1] px-2 py-0.5 text-[#4c6777]">{item.country}</span>
          <span className="text-[#627985]">{item.status}</span>
          {item.priority === "review-first" && <span className="rounded bg-[#fff0dc] px-2 py-0.5 text-[#9c4c0d]">Review first</span>}
        </div>
        <h3 className="mt-2 text-sm font-semibold leading-snug text-[#143e54]">{item.title}</h3>
      </div>
      <span className="text-[11px] font-medium text-[#607986]">{item.open_flags} open / {item.flags.length} flags</span>
    </div>
    <ul className="mt-3 space-y-2">{item.flags.map(flag =>
      <FlagRow key={`${item.risk_id}-${flag.code}`} riskId={item.risk_id} flag={flag} refresh={refresh}/>)}
    </ul>
  </article>;
}

export function EvidenceReviewQueue() {
  const q = useApi(() => api.getEvidenceReviewQueue());
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [scope, setScope] = useState("open");
  const [expanded, setExpanded] = useState(false);
  const rows = q.status === "ok" ? q.data.items : [];
  const filtered = useMemo(() => rows.filter(item => {
    const matchesText = [item.risk_id, item.country, item.title, item.status, ...item.flags.map(f => f.label)]
      .some(x => x.toLowerCase().includes(search.toLowerCase().trim()));
    return matchesText && (priority === "all" || item.priority === priority)
      && (scope !== "open" || item.open_flags > 0);
  }), [rows, search, priority, scope]);
  const visible = expanded ? filtered : filtered.slice(0, 5);
  return <section className="overflow-hidden rounded-xl border border-[#d2e0e5] bg-white shadow-sm" aria-label="Evidence quality and analyst review queue">
    <div className="bg-[#0B4A6F] px-5 py-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9FD3E2]">SIGNAL / MODERATOR QUALITY CONTROL</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold"><ClipboardCheck size={20} aria-hidden/>Evidence review queue</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#d6e9ef]">Source-field completeness prompts for analyst triage. This does not validate evidence, change ACAPS risk ratings, or trigger expert invitations.</p>
        </div>
        {q.status === "ok" && <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-right">
          <span className="block text-xl font-semibold">{q.data.summary.open_flags}</span>
          <span className="text-[10px] uppercase tracking-wide text-[#cce5ed]">Open flags</span>
        </div>}
      </div>
    </div>
    <div className="space-y-4 p-5">
      {q.status === "loading" && <p className="text-sm text-[#607480]">Checking source fields…</p>}
      {q.status === "error" && <div role="alert" className="space-y-2 text-sm text-[#9d3834]"><p>{q.error.message}</p>
        <Button variant="outline" onClick={q.refresh}>Retry</Button></div>}
      {q.status === "ok" && !q.data.available && <div className="flex items-start gap-2 rounded-lg bg-[#f2f6f7] p-4 text-sm text-[#526e7c]"><Database size={17} className="mt-0.5 shrink-0"/>{q.data.reason || "Full Risk Radar data not loaded."}</div>}
      {q.status === "ok" && q.data.available && <>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            ["Source records", q.data.total_records],
            ["Flagged records", q.data.summary.flagged_records],
            ["Review-first records", q.data.summary.review_first_records],
            ["Triaged flags", q.data.summary.triaged_flags],
          ].map(([title,value])=><div className="rounded-lg bg-[#eff5f7] px-3 py-3" key={title}>
            <strong className="block text-xl text-[#0B4A6F]">{value}</strong><span className="text-[11px] text-[#526e7b]">{title}</span></div>)}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#627984]"><ShieldCheck size={15}/>
          <span>{q.data.source} · No inferred probability, no automatic approval.</span>
          <Button variant="ghost" size="sm" onClick={q.refresh} className="ml-auto text-[#00738C]"><RefreshCw size={14}/>Refresh</Button>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[#d5e1e5] px-3 text-[#526b79]"><Search size={16}/><span className="sr-only">Find an assessment</span>
            <input className="w-full bg-transparent text-sm text-[#173f53] outline-none" value={search} onChange={e=>{setSearch(e.target.value);setExpanded(false);}} placeholder="Search country, risk, ID or flag…"/></label>
          <label className="flex items-center gap-2 text-xs text-[#5b7480]">Priority
            <select className="rounded-lg border border-[#d5e1e5] bg-white px-2 py-2 text-sm text-[#23495a]" value={priority} onChange={e=>{setPriority(e.target.value);setExpanded(false);}}>
              <option value="all">All</option><option value="review-first">Review first</option><option value="review">Other review</option>
            </select></label>
          <label className="flex items-center gap-2 text-xs text-[#5b7480]">Status
            <select className="rounded-lg border border-[#d5e1e5] bg-white px-2 py-2 text-sm text-[#23495a]" value={scope} onChange={e=>{setScope(e.target.value);setExpanded(false);}}>
              <option value="open">Has open flags</option><option value="all">Include triaged</option>
            </select></label>
        </div>
        <p className="text-[11px] text-[#647b88]">Showing {visible.length} of {filtered.length} matching flagged source records. Open flags indicate possible *data-entry or export gaps*, not proven inaccuracies.</p>
        <div className="space-y-3">{visible.map(item=><RecordCard key={item.risk_id} item={item} refresh={q.refresh}/>)}</div>
        {filtered.length === 0 && <p className="rounded-lg bg-[#f1f5f6] p-4 text-sm text-[#647986]">No records match these filters. This does not establish that the underlying evidence is complete.</p>}
        {!expanded && filtered.length>5 && <Button variant="outline" className="w-full" onClick={()=>setExpanded(true)}>Show all {filtered.length} matching records</Button>}
        {expanded && filtered.length>5 && <Button variant="ghost" className="w-full" onClick={()=>setExpanded(false)}>Show fewer</Button>}
        <p className="rounded-lg border border-[#dce6e9] bg-[#f6f9fa] p-3 text-[11px] leading-relaxed text-[#607884]">{q.data.methodology} Marking a flag as triaged records a human review step only; it does not claim correction or independent evidence verification. Decisions are stored in local demo SQLite and reopened if the flagged source field changes.</p>
        <Link className="inline-flex items-center gap-1 text-xs font-semibold text-[#00738C] underline" to="/risk-index">Browse original risk records <ArrowUpRight size={14}/></Link>
      </>}
    </div>
  </section>;
}
