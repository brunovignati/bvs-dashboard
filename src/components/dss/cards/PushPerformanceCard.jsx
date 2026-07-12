/**
 * PushPerformanceCard (Marketing) — ¿qué campañas push rinden y cuáles no?
 * Tabla ordenable por workflow con conversión ± IC 95% (Wilson) y sparkline de
 * tendencia mensual. Más operativa que la burbuja para decidir qué escalar/detener,
 * y rompe la redundancia visual con el scatter de email.
 */
import { useState } from "react";
import EvidenceCard from "../EvidenceCard";
import { usePushCampaigns } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { latestMonthRows, wilson } from "@/lib/dss/dssUtils";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

function Spark({ values }) {
  if (!values || values.length < 2) return <span className="text-[10px] text-muted-foreground/50">—</span>;
  const w = 60, h = 16, max = Math.max(...values), min = Math.min(...values), rng = (max - min) || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / rng) * h}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={up ? "hsl(199,89%,48%)" : "hsl(220,13%,60%)"} strokeWidth="1.5" />
    </svg>
  );
}

export default function PushPerformanceCard({ delay }) {
  const { data = [] } = usePushCampaigns();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const [sort, setSort] = useState({ key: "revenue", dir: -1 });

  const all = data.filter(r => r.workflow && r.sent > 0 && (r.year * 12 + r.month) <= cutoff);
  const withVol = all.filter(r => r.sent > 50);
  const latest = latestMonthRows(withVol, cutoff);
  const scope = latest.length >= 5 ? latest : withVol;
  const periodNote = latest.length >= 5 ? "último mes" : "histórico";

  // Historia mensual de conversión por workflow (sparkline)
  const hist = {};
  for (const r of all) {
    (hist[r.workflow] ||= []).push({ ym: r.year * 12 + r.month, conv: r.sent > 0 ? ((r.purchases || 0) / r.sent) * 100 : 0 });
  }
  for (const k in hist) hist[k] = hist[k].sort((a, b) => a.ym - b.ym).map(d => d.conv);

  // Agregado del período por workflow
  const agg = {};
  for (const c of scope) {
    const w = (agg[c.workflow] ||= { name: c.workflow, sent: 0, purchases: 0, revenue: 0 });
    w.sent += c.sent || 0; w.purchases += c.purchases || 0; w.revenue += c.revenue || 0;
  }
  let list = Object.values(agg).map(w => {
    const ci = wilson(w.purchases, w.sent);
    return { ...w, conv: ci.mid, convHalf: ci.half, spark: hist[w.name] || [] };
  });
  const hasData = list.length >= 3;
  const avgConv = list.length ? list.reduce((s, p) => s + p.conv, 0) / list.length : 0;
  const byRev = [...list].sort((a, b) => b.revenue - a.revenue);
  const top = byRev.slice(0, 3);
  const weak = list.filter(p => p.sent > 300 && p.conv < 0.3).slice(0, 3);

  list = [...list].sort((a, b) => (a[sort.key] < b[sort.key] ? 1 : a[sort.key] > b[sort.key] ? -1 : 0) * sort.dir);
  const th = (key, label, align = "text-right") => (
    <th className={`${align} font-semibold text-muted-foreground cursor-pointer select-none py-1 px-2 whitespace-nowrap`}
      onClick={() => setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }))}>
      {label}{sort.key === key ? (sort.dir < 0 ? " ↓" : " ↑") : ""}
    </th>
  );

  return (
    <EvidenceCard
      question="¿Qué campañas push rinden y cuáles no?"
      answer={hasData && top[0] ? `Top: ${top[0].name}` : "Sin campañas suficientes"}
      answerTone={hasData ? "good" : "neutral"}
      context={hasData ? `${list.length} campañas (${periodNote}) · conversión media ${avgConv.toFixed(2)}%` : undefined}
      maturity="green"
      actions={hasData ? [
        { verb: "escalar", rationale: top.length ? `Mayor revenue: ${top.map(t => t.name).slice(0, 2).join(", ")}.` : "Refuerza las de mayor revenue y conversión." },
        { verb: "detener", rationale: weak.length ? `Volumen alto y conversión <0,3%: ${weak.map(w => w.name).slice(0, 2).join(", ")}.` : "Retira las de conversión persistentemente baja." },
      ] : [{ verb: "investigar", rationale: "Aún no hay suficientes campañas push con volumen." }]}
      delay={delay}
      note="Conversión = compras / envíos por workflow push · ± = IC 95% de Wilson · sparkline = tendencia mensual (Connectif · push_campaigns)."
    >
      {hasData && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {th("name", "Workflow", "text-left")}
                {th("sent", "Envíos")}
                {th("conv", "Conv. ±IC")}
                {th("revenue", "Revenue")}
                <th className="text-right font-semibold text-muted-foreground py-1 px-2">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="text-left py-1.5 px-2 max-w-[9rem] truncate" title={w.name}>{w.name}</td>
                  <td className="text-right font-mono px-2">{fmtNumber(w.sent)}</td>
                  <td className="text-right font-mono px-2 whitespace-nowrap">
                    {w.conv.toFixed(2)}% <span className="text-muted-foreground/60">±{w.convHalf.toFixed(2)}</span>
                  </td>
                  <td className="text-right font-mono px-2">{fmtCurrency(w.revenue)}</td>
                  <td className="px-2"><div className="flex justify-end"><Spark values={w.spark} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </EvidenceCard>
  );
}
