/**
 * PushPerformanceCard (Marketing) — ¿qué campañas push rinden y cuáles no?
 * Tabla ordenable por workflow con conversión ± IC 95% (Wilson) y sparkline de
 * tendencia mensual. Más operativa que la burbuja para decidir qué escalar/detener,
 * y rompe la redundancia visual con el scatter de email.
 */
import { useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePushCampaigns } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { latestMonthRows, wilson } from "@/lib/dss/dssUtils";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

const ScatterTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-2.5 shadow-xl max-w-56">
      <p className="text-xs font-semibold mb-1 line-clamp-2">{d.name}</p>
      <p className="text-[11px] text-muted-foreground">Conversión: <span className="font-mono text-orange-600">{d.x.toFixed(2)}%</span></p>
      <p className="text-[11px] text-muted-foreground">Revenue: <span className="font-mono">{fmtCurrency(d.y)}</span></p>
      <p className="text-[11px] text-muted-foreground">Envíos: <span className="font-mono">{fmtNumber(d.sent)}</span></p>
    </div>
  );
};

function Spark({ values }) {
  if (!values || values.length < 2) return <span className="text-[10px] text-muted-foreground/50">—</span>;
  const w = 60, h = 16, max = Math.max(...values), min = Math.min(...values), rng = (max - min) || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / rng) * h}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={up ? "hsl(16,79%,57%)" : "hsl(220,13%,60%)"} strokeWidth="1.5" />
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

  // ── Vista B — dispersión conversión vs revenue (burbuja = envíos): separa las que
  // ENGANCHAN (alta conversión) de las que VENDEN (alto revenue). Mismo scope/periodo. ──
  const scatterData = byRev.map(w => ({ name: w.name, x: w.conv, y: w.revenue, sent: w.sent, z: Math.max(50, Math.min(500, (w.sent || 0) / 40)) }));
  const altView = hasData ? (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 12, bottom: 22, left: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" />
          <XAxis type="number" dataKey="x" name="Conversión" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} tickFormatter={v => `${v.toFixed(1)}%`}
            label={{ value: "Conversión (compras/envíos)", position: "insideBottom", offset: -12, fontSize: 9, fill: "hsl(32,7%,48%)" }} />
          <YAxis type="number" dataKey="y" name="Revenue" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`}
            label={{ value: "Revenue", angle: -90, position: "insideLeft", offset: 16, fontSize: 9, fill: "hsl(32,7%,48%)" }} />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <Tooltip content={<ScatterTip />} />
          {avgConv > 0 && <ReferenceLine x={avgConv} stroke="hsl(220,13%,75%)" strokeDasharray="4 4" />}
          <Scatter data={scatterData}>
            {scatterData.map((p, i) => <Cell key={i} fill={p.x >= avgConv ? "hsl(16,79%,57%)" : "hsl(220,13%,65%)"} fillOpacity={0.8} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  list = [...list].sort((a, b) => (a[sort.key] < b[sort.key] ? 1 : a[sort.key] > b[sort.key] ? -1 : 0) * sort.dir);
  const th = (key, label, align = "text-right") => (
    <th className={`${align} font-semibold text-muted-foreground cursor-pointer select-none py-1 px-2 whitespace-nowrap`}
      onClick={() => setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }))}>
      {label}{sort.key === key ? (sort.dir < 0 ? " ↓" : " ↑") : ""}
    </th>
  );

  return (
    <EvidenceCard sources={["connectif"]}
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
      altView={altView}
      viewLabels={{ a: "Tabla", b: "Dispersión" }}
      note="Conversión = compras / envíos por workflow push · ± = IC 95% de Wilson · sparkline = tendencia mensual (Connectif · push_campaigns). Vista 'Dispersión' = conversión vs revenue (burbuja = envíos): separa las que enganchan de las que venden."
    >
      {hasData && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
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
