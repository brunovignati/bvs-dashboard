/**
 * WebContentTrendCard (Marketing) — evolución de la captación por contenido web.
 * Usa daily_sticky (opens/clicks/buyers/revenue por pieza y día). Complementa a
 * WebStickyCard, que es un ranking-snapshot: aquí se ve la TENDENCIA diaria del
 * contenido web (topbars/stickies) — clics de captación y revenue asociado.
 * Respeta el comparador (corta al final del período principal).
 */
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useStickyDiario } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function WebContentTrendCard({ delay }) {
  // Lee la vista de agregación por día (~745 filas) en vez de daily_sticky (24k).
  const { data = [] } = useStickyDiario();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  // Agrega por día (todas las piezas): clics de captación + revenue.
  const byDay = {};
  for (const r of data) {
    if (r.year * 12 + r.month > cutoff) continue;
    const k = r.year * 10000 + r.month * 100 + (r.day || 0);
    const d = (byDay[k] ||= { k, r, clicks: 0, revenue: 0, buyers: 0 });
    d.clicks += r.clicks || 0; d.revenue += r.revenue || 0; d.buyers += r.buyers || 0;
  }
  const rows = Object.values(byDay).sort((a, b) => a.k - b.k)
    .map(d => ({ name: `${d.r.day} ${M[d.r.month]}`, clicks: d.clicks, revenue: d.revenue, buyers: d.buyers }))
    .slice(-60);
  const hasData = rows.length >= 5 && rows.some(r => r.clicks > 0 || r.revenue > 0);

  if (!hasData) {
    return (
      <EvidenceCard question="¿Cómo evoluciona la captación por contenido web?" answer="Sin datos suficientes"
        answerTone="neutral" maturity="amber" delay={delay}
        actions={[{ verb: "investigar", rationale: "Faltan días de contenido web (daily_sticky) en el período." }]}
        note="Fuente: Connectif · daily_sticky." />
    );
  }

  const totClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totRev = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <EvidenceCard
      question="¿Cómo evoluciona la captación por contenido web?"
      answer={`${fmtNumber(totClicks)} clics · ${fmtCurrency(totRev)} en el período`}
      answerTone="neutral"
      context="Actividad diaria de topbars/stickies (clics de captación y revenue asociado). Complementa el ranking de WebSticky con la tendencia temporal."
      maturity="green"
      actions={[
        { verb: "escalar", rationale: "Si los clics de captación suben pero el revenue no, ajusta la oferta del contenido, no su visibilidad." },
        { verb: "investigar", rationale: "Caídas bruscas suelen indicar que una pieza se pausó o cambió; crúzalo con el ranking de WebSticky." },
      ]}
      delay={delay}
      note="Fuente: Connectif · daily_sticky (agregado por día de todas las piezas). Clics = interacciones de captación; revenue = venta asociada."
    >
      <div className={CHART_H}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(rows.length / 8))} />
            <YAxis yAxisId="clicks" {...AXIS} tickFormatter={v => fmtNumber(v)} />
            <YAxis yAxisId="rev" orientation="right" {...AXIS} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} />
            <Tooltip {...TIP} formatter={(v, n) => n === "Revenue" ? [fmtCurrency(v), n] : [fmtNumber(v), n]} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="clicks" dataKey="clicks" name="Clics captación" fill="hsl(218,33%,70%)" radius={[2, 2, 0, 0]} maxBarSize={14} />
            <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(221,83%,53%)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
