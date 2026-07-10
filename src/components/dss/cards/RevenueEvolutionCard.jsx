import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { fmtCurrency } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP, PRIMARY, AREA_FILL_OPACITY } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function RevenueEvolutionCard({ delay }) {
  const { data = [] } = useDailyRevenue();

  // Agregar revenue total del negocio por mes
  const byMonth = {};
  for (const r of data) {
    const k = r.year * 12 + r.month;
    if (!byMonth[k]) byMonth[k] = { k, year: r.year, month: r.month, revenue: 0, orders: 0 };
    byMonth[k].revenue += r.revenue || 0;
    byMonth[k].orders += r.purchases || 0;
  }
  const months = Object.values(byMonth).sort((a, b) => a.k - b.k)
    .map(m => ({ ...m, name: `${M[m.month]} ${String(m.year).slice(2)}`, ticket: m.orders ? m.revenue / m.orders : 0 }));
  const hasData = months.length >= 2;

  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const yoy = months.find(m => last && m.year === last.year - 1 && m.month === last.month);
  const mom = last && prev && prev.revenue ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : null;
  const yoyPct = last && yoy && yoy.revenue ? ((last.revenue - yoy.revenue) / yoy.revenue) * 100 : null;

  const chart = months.slice(-18);

  return (
    <EvidenceCard
      question="¿Cómo evoluciona el revenue y qué lo impulsa?"
      kpis={hasData ? [
        { value: fmtCurrency(last.revenue), label: `Revenue ${M[last.month]} ${last.year}`, delta: mom == null ? undefined : mom },
        { value: `€${last.ticket.toFixed(0)}`, label: "Ticket medio" },
        { value: yoyPct == null ? "—" : `${yoyPct >= 0 ? "+" : ""}${yoyPct.toFixed(0)}%`, label: "vs. año anterior" },
      ] : undefined}
      answer={!hasData ? "Sin datos" : undefined}
      maturity="green"
      insight={hasData ? (mom != null && mom < 0
        ? "El revenue cae respecto al mes anterior: revisa si arrastra el nº de pedidos o el ticket medio."
        : "Revenue en crecimiento sostenido; observa si lo impulsa el volumen o el ticket para saber qué reforzar.") : undefined}
      actions={[
        { verb: "reasignar", rationale: mom != null && mom < 0 ? "Revisa qué palanca lo arrastra (canal, ticket o pedidos) y actúa sobre ella." : "Mantén la asignación que funciona y trabaja la palanca más débil." },
      ]}
      delay={delay}
      note="Revenue total del negocio agregado por mes (Connectif · daily_revenue). Ticket = revenue / pedidos."
    >
      {hasData && (
        <div className={CHART_H}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="name" {...AXIS} interval={Math.max(1, Math.floor(chart.length / 9))} />
              <YAxis {...AXIS} tickFormatter={v => `€${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [fmtCurrency(v), "Revenue"]} {...TIP} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke={PRIMARY} fill={PRIMARY} fillOpacity={AREA_FILL_OPACITY} strokeWidth={2.2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
