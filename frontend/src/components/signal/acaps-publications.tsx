import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, FileText, Info, Search } from "lucide-react";
import { ACAPS_ARCHIVE_URL, ACAPS_COUNTRIES, ARCHIVE_CHECKED_ON, filterAcapsPublications } from "@/lib/acaps-archive-model";

export function AcapsPublications() {
  const [country, setCountry] = useState("All countries");
  const [query, setQuery] = useState("");
  const publications = useMemo(()=>filterAcapsPublications(country,query),[country,query]);
  return <section className="sr-16a" aria-label="ACAPS publication archive snapshot">
    <div className="sr-16a-heading"><div><p className="sr-16a-eyebrow">SHARE / SOURCE DISCOVERY</p><h1>ACAPS <span>PUBLICATIONS</span></h1><p>Genuine ACAPS analysis products, separate from the fictional Crisis Agenda.</p></div>
      <a href={ACAPS_ARCHIVE_URL} target="_blank" rel="noopener noreferrer">Browse complete live archive <ArrowUpRight size={16} aria-hidden="true"/></a></div>
    <div className="sr-16a-notice" role="note"><Info size={18} aria-hidden="true"/><div><strong>Curated source snapshot — checked {ARCHIVE_CHECKED_ON}.</strong> These titles and publication dates were checked against the ACAPS archive. This is <b>not an automatically refreshed feed</b>. For the newest report use the live archive link. PDF URLs for Afghanistan and Colombia were provided by the team; their individual PDF downloads should be checked in the browser.</div></div>
    <div className="sr-16a-controls"><label><span>Country</span><select value={country} onChange={e=>setCountry(e.target.value)}><option>All countries</option>{ACAPS_COUNTRIES.map(c=><option key={c}>{c}</option>)}</select></label>
      <label><span>Search reports</span><div className="sr-16a-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. flood, Ukraine, protection" maxLength={160}/></div></label></div>
    <div className="sr-16a-count">{publications.length} report{publications.length===1?"":"s"} displayed · latest recorded report first</div>
    <div className="sr-16a-reports">{publications.map(r=><article key={r.id} className="sr-16a-report">
      <div className="sr-16a-country"><BookOpen size={18} aria-hidden="true"/><a href={r.reportUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ACAPS source for ${r.country}: ${r.title}`}>{r.country} <ArrowUpRight size={14} aria-hidden="true"/></a><span>{r.publishedOn}</span></div>
      <h2><a href={r.reportUrl} target="_blank" rel="noopener noreferrer">{r.title}</a></h2>
      <p>{r.summary}</p>
      <div className="sr-16a-meta"><span>{r.topic}</span><a href={r.reportUrl} target="_blank" rel="noopener noreferrer"><FileText size={15} aria-hidden="true"/>{r.linkType==="pdf"?"Open report PDF":r.linkType==="report-page"?"Open ACAPS report page":"Find report on country page"} <ArrowUpRight size={14}/></a></div>
    </article>)}</div>
    {publications.length===0&&<p className="sr-16a-empty">No source records match these filters.</p>}
    <p className="sr-16a-foot">Source: ACAPS analysis products archive. Copyright and report contents remain with ACAPS. This index stores concise metadata and links only; source reports are not copied, and these records are not forecast inputs.</p>
  </section>;
}
