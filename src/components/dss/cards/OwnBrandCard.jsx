import { ComposedChart, Area, Line, BarChart, Bar, Cell, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useCompradores, useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function OwnBrandCard({ delay }) {
  const { data: marca = [] } = useCompradores();
  const { data: daily = [] } = useDailyRevenue();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  // Total del negocio por mes
  const totalByMonth = {};
  for (const r of daily) {
    const k = r.year * 12 + r.month;
    if (k > cutoff) continue;
    totalByMonth[k] = (totalByMonth[k] || 0) + (r.revenue || 0);
  }
  const rows = [...marca].filter(m => (m.year * 12 + m.month) <= cutoff)
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map(m => {
      const k = m.year * 12 + m.month;
      const total = totalByMonth[k] || 0;
      const rev = m.revenue || 0;
      return { name: `${M[m.month]} ${String(m.year).slice(2)}`, rev, pct: total ? (rev / total) * 100 : 0 };
    });
  const hasData = rows.length >= 2;
  const last = rows[rows.length - 1];
  const first = rows[0];
  const trend = hasData ? last.pct - first.pct : 0;

  // ── Vista B — crecimiento mensual (MoM %) del revenue de marca propia: muestra la
  // aceleración/desaceleración que no se ve en el nivel (€) ni en el peso (%). Mismo periodo. ──
  const growth = rows.map((r, i) => ({
    name: r.name,
    g: i > 0 && rows[i - 1].rev ? ((r.rev - rows[i - 1].rev) / rows[i - 1].rev) * 100 : null,
  })).filter(r => r.g !== null);
  const hasGrowth = growth.length >= 2;
  const altView = hasGrowth ? (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={growth} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(growth.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
          <Tooltip formatter={(v) => [`${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(1)}%`, "Crecimiento MoM"]} labelStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="hsl(220,13%,75%)" />
          <Bar dataKey="g" radius={[3, 3, 0, 0]} maxBarSize={30}>
            {growth.map((r, i) => <Cell key={i} fill={r.g >= 0 ? "hsl(16,79%,57%)" : "hsl(220,13%,65%)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Cómo va la marca propia y su peso sobre el total?"
      answer={hasData ? `${last.pct.toFixed(1)}% del revenue` : "Sin datos"}
      answerTone={hasData ? (trend >= 0 ? "good" : "warn") : "neutral"}
      context={hasData ? `${M[last.month]} ${last.year} · ${fmtCurrency(last.rev)} de marca propia · tendencia ${trend >= 0 ? "+" : ""}${trend.toFixed(1)} pts` : undefined}
      maturity="amber"
      actions={[
        { verb: "escalar", rationale: hasData && trend >= 0 ? "La marca propia gana peso: refuerza la apuesta si el margen acompaña." : "Peso estancado o a la baja: revisa surtido y promoción de marca propia." },
        { verb: "mantener", rationale: "Decisión estructural: evalúala en ventana trimestral, no mensual." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "€ y peso", b: "Crecimiento" }}
      note="Revenue de marca propia (Connectif · compradores) sobre total del negocio (daily_revenue). Histórico corto (11 meses). Vista 'Crecimiento' = variación mensual (MoM %) del revenue de marca propia."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 5, right: 40, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `€${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 8, fill: "hsl(186,32%,26%)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v.toFixed(0)}%`} />
              <Tooltip formatter={(v, n) => [n === "% sobre total" ? `${Number(v).toFixed(1)}%` : fmtCurrency(v), n]} labelStyle={{ fontSize: 11 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              <Area yAxisId="l" type="monotone" dataKey="rev" name="Revenue marca" stroke="hsl(30,72%,66%)" fill="hsl(16,79%,57%)" fillOpacity={0.12} strokeWidth={2.2} dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="pct" name="% sobre total" stroke="hsl(30,72%,66%)" strokeWidth={1.8} dot={false} strokeDasharray="5 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
