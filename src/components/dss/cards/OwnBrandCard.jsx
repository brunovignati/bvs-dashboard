import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useCompradores, useDailyRevenue } from "@/lib/useEntities";
import { fmtCurrency } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function OwnBrandCard({ delay }) {
  const { data: marca = [] } = useCompradores();
  const { data: daily = [] } = useDailyRevenue();

  // Total del negocio por mes
  const totalByMonth = {};
  for (const r of daily) {
    const k = r.year * 12 + r.month;
    totalByMonth[k] = (totalByMonth[k] || 0) + (r.revenue || 0);
  }
  const rows = [...marca].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
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

  return (
    <EvidenceCard
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
      note="Revenue de marca propia (Connectif · compradores) sobre total del negocio (daily_revenue). Histórico corto (11 meses)."
    >
      {hasData && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 5, right: 40, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160,84%,39%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `€${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 8, fill: "hsl(160,84%,30%)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v.toFixed(0)}%`} />
              <Tooltip formatter={(v, n) => [n === "% sobre total" ? `${Number(v).toFixed(1)}%` : fmtCurrency(v), n]} labelStyle={{ fontSize: 11 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              <Area yAxisId="l" type="monotone" dataKey="rev" name="Revenue marca" stroke="hsl(160,84%,39%)" fill="url(#brandGrad)" strokeWidth={2.2} dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="pct" name="% sobre total" stroke="hsl(262,83%,58%)" strokeWidth={1.8} dot={false} strokeDasharray="5 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
