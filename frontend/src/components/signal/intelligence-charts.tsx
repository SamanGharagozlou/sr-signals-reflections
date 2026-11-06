import type { ReactNode } from "react";
import type { Distribution, RiskLevel, RiskStatus } from "@/lib/risk-intelligence-model";

export const LEVEL_COLORS: Record<RiskLevel, string> = {
  High: "#ad3450", Medium: "#e8a36c", Low: "#52a4b8", Unrated: "#a9b7c1",
};
export const STATUS_COLORS: Record<RiskStatus, string> = {
  Active: "#00809c", Materialised: "#0b4a6f", "Not materialised": "#79bca8", "Other / missing": "#a9b7c1",
};

/** Accessible descriptive bars. Count and denominator remain visible even with CSS disabled. */
export function CompositionBars<T extends string>({ rows, colors, caption } : {
  rows: Distribution<T>[]; colors: Record<T, string>; caption: string;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return <div className="gt-intel-bars" aria-label={caption}>
    {rows.map(row => <div className="gt-intel-bar-row" key={row.label}>
      <div className="gt-intel-bar-header"><span><i style={{ background: colors[row.label] }}/>{row.label}</span><strong>{row.count} <small>({Math.round(row.share)}%)</small></strong></div>
      <div className="gt-intel-track" role="img" aria-label={`${row.label}: ${row.count} of ${total} records (${Math.round(row.share)} percent)`}>
        <div style={{width: `${row.share}%`, background: colors[row.label]}} />
      </div>
    </div>)}
    <p className="gt-intel-micro">{caption} · {total} records</p>
  </div>;
}

export function IntelligenceCard({ title, eyebrow, icon, children, footnote }: {
  title: string; eyebrow: string; icon?: ReactNode; children: ReactNode; footnote?: string;
}) {
  return <section className="gt-intel-card">
    <div className="gt-intel-card-head"><div><p className="gt-intel-eyebrow">{eyebrow}</p><h2>{title}</h2></div>{icon && <div className="gt-intel-card-icon">{icon}</div>}</div>
    {children}
    {footnote && <p className="gt-intel-card-footnote">{footnote}</p>}
  </section>;
}
