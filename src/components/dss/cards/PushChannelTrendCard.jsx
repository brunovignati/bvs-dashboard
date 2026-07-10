/**
 * PushChannelTrendCard (Marketing) — el push como CANAL, mensual.
 * Combina rendimiento_push (envíos + compras atribuidas) y ventas_push (revenue) para
 * ver cuánto aporta el push cada mes y con qué eficiencia. Distinto de PushPerformance
 * (que compara workflows en el período actual): aquí es la evolución del canal completo.
 */
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useRendimientoPush, useVentasPush } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function PushChannelTrendCard({ delay }) {
  const { data: rend = [] } = useRendimientoPush();
  const { data: ventas = [] } = useVentasPush();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const byM = {};
  for (const r of rend) { const k = r.year * 12 + r.month; if (k > cutoff) continue; (byM[k] ||= { k, year: r.year, month: r.month }).sent = (byM[k].sent || 0) + (r.sent || 0); byM[k].pur = (byM[k].pur || 0) + (r.purchasesAttr || 0); }
  for (const r of ventas) { const k = r.year * 12 + r.month; if (k > cutoff) continue; (byM[k] ||= { k, year: r.year, month: r.month }).revenue = (byM[k].revenue || 0) + (r.revenue || 0); }

  const rows = Object.values(byM).sort((a, b) => a.k - b.k).map(m => ({
    name: `${M[m.month]} ${String(m.year).slice(2)}`,
    revenue: m.revenue || 0,
    conv: m.sent > 0 ? (m.pur / m.sent) * 100 : 0,
  })).slice(-18);
  const hasData = rows.length >= 3 && rows.some(r => r.revenue > 0);

  if (!hasData) {
    return (
      <EvidenceCard question="¿Cuánto aporta el push como canal y cómo evoluciona?" answer="Sin datos suficientes"
        answerTone="neutral" maturity="amber" delay={delay}
        actions={[{ verb: "investigar", rationale: "Faltan meses de rendimiento/ventas de push." }]}
        note="Fuente: Connectif · rendimiento_push + ventas_push." />
    );
  }

  const last = rows[rows.length - 1];
  const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
  const revTrend = prev && prev.revenue > 0 ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : null;

  return (
    <EvidenceCard
      question="¿Cuánto aporta el push como canal y cómo evoluciona?"
      answer={`${fmtCurrency(last.revenue)}/mes · conversión ${last.conv.toFixed(2)}%`}
      answerTone="neutral"
      context={`Revenue atribuido al push por mes${revTrend != null ? ` · ${revTrend >= 0 ? "+" : ""}${revTrend.toFixed(0)}% vs mes anterior` : ""}. La línea es la conversión (compras / envíos).`}
      maturity="green"
      actions={[
        { verb: "escalar", rationale: "Si la conversión se mantiene al subir envíos, hay margen para más push." },
        { verb: "investigar", rationale: "Si el revenue cae con envíos estables, revisa segmentación y relevancia de las notificaciones." },
      ]}
      delay={delay}
      note="Fuente: Connectif · rendimiento_push (envíos, compras atribuidas) + ventas_push (revenue). Conversión = compras atribuidas / envíos."
    >
      <div className={CHART_H}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(rows.length / 8))} />
            <YAxis yAxisId="rev" {...AXIS} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} />
            <YAxis yAxisId="conv" orientation="right" {...AXIS} tickFormatter={v => `${v.toFixed(1)}%`} />
            <Tooltip {...TIP} formatter={(v, n) => n === "Conversión" ? [`${Number(v).toFixed(2)}%`, n] : [fmtCurrency(v), n]} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill="hsl(221,83%,53%)" radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Line yAxisId="conv" type="monotone" dataKey="conv" name="Conversión" stroke="hsl(220,9%,45%)" strokeWidth={1.8} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
