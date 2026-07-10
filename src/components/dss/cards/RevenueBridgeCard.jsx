/**
 * RevenueBridgeCard — ¿cómo evolucionan los dos motores del revenue?
 * Revenue = nº de pedidos × ticket medio. Mostramos ambos motores como líneas en el
 * tiempo, INDEXADOS a base 100 (primer mes del rango) para compararlos pese a tener
 * unidades distintas (pedidos en miles, ticket en €). Se ve de un vistazo cuál sube
 * y cuál baja de forma sostenida. Fuente: daily_revenue (negocio total).
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP, LEGEND, SERIES } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export default function RevenueBridgeCard({ delay }) {
  const { data = [] } = useDailyRevenue();
  const { periodEnd } = useComparison();

  const byM = {};
  for (const r of data) {
    const k = r.year * 12 + r.month;
    if (!byM[k]) byM[k] = { k, year: r.year, month: r.month, revenue: 0, purchases: 0 };
    byM[k].revenue += r.revenue || 0;
    byM[k].purchases += r.purchases || 0;
  }
  const all = Object.values(byM).sort((a, b) => a.k - b.k);
  let idx = all.findIndex(m => m.year === periodEnd.year && m.month === periodEnd.month);
  if (idx < 1) idx = all.length - 1;
  const window = all.slice(Math.max(0, idx - 14), idx + 1);   // trailing 15 meses hasta el activo
  const hasData = window.length >= 3;

  const ticketOf = (m) => (m.purchases ? m.revenue / m.purchases : 0);
  const base = window[0];
  const orders0 = base?.purchases || 1;
  const ticket0 = ticketOf(base) || 1;
  const rows = window.map(m => ({
    name: `${M[m.month]} ${String(m.year).slice(2)}`,
    "Nº de pedidos": (m.purchases / orders0) * 100,
    "Ticket medio": (ticketOf(m) / ticket0) * 100,
  }));

  const cur = window[window.length - 1];
  const prev = window[window.length - 2];
  const Qc = cur?.purchases || 0, Pc = ticketOf(cur);
  const ordersMoM = prev?.purchases ? ((Qc - prev.purchases) / prev.purchases) * 100 : 0;
  const ticketMoM = prev && ticketOf(prev) ? ((Pc - ticketOf(prev)) / ticketOf(prev)) * 100 : 0;
  const revMoM = prev?.revenue ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : 0;
  const deltaRev = cur && prev ? cur.revenue - prev.revenue : 0;

  // tendencia sobre el rango (base 100)
  const ordersTrend = hasData ? (rows[rows.length - 1]["Nº de pedidos"] - 100) : 0;
  const ticketTrend = hasData ? (rows[rows.length - 1]["Ticket medio"] - 100) : 0;
  const dominant = Math.abs(ordersTrend) >= Math.abs(ticketTrend) ? "pedidos" : "ticket";
  const rangeLbl = hasData ? `${rows[0].name}–${rows[rows.length - 1].name}` : "";

  return (
    <EvidenceCard
      question="¿Cómo evolucionan los motores del revenue: pedidos y ticket?"
      kpis={hasData ? [
        { value: `${deltaRev >= 0 ? "+" : ""}${fmtCurrency(deltaRev)}`, label: "Δ revenue · último mes", delta: revMoM },
        { value: fmtNumber(Qc), label: "Nº de pedidos", delta: ordersMoM },
        { value: `€${Pc.toFixed(0)}`, label: "Ticket medio", delta: ticketMoM },
      ] : undefined}
      answer={!hasData ? "Sin datos suficientes" : undefined}
      maturity="green"
      insight={hasData
        ? `Desde ${rows[0].name}, los pedidos ${ordersTrend >= 0 ? "suben" : "bajan"} ${pct(ordersTrend)} y el ticket medio ${ticketTrend >= 0 ? "sube" : "baja"} ${pct(ticketTrend)}: el revenue se sostiene sobre todo por ${dominant}.`
        : undefined}
      actions={[
        { verb: "reasignar", rationale: dominant === "pedidos"
          ? "El motor es el nº de pedidos: prioriza captación y frecuencia de compra."
          : "El motor es el ticket medio: prioriza cross-sell, bundles y precio." },
      ]}
      delay={delay}
      note={`Motores del revenue en base 100 (${rangeLbl}; primer mes = 100) para comparar su evolución. Fuente: Connectif · daily_revenue (negocio total).`}
    >
      {hasData && (
        <div className={CHART_H}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="name" {...AXIS} interval={Math.max(1, Math.floor(rows.length / 8))} />
              <YAxis {...AXIS} tickFormatter={v => v.toFixed(0)} domain={["auto", "auto"]} />
              <ReferenceLine y={100} stroke="hsl(220,13%,80%)" strokeDasharray="4 3" />
              <Tooltip formatter={(v, n) => [`${v.toFixed(0)} (base 100)`, n]} {...TIP} />
              <Legend {...LEGEND} />
              <Line type="monotone" dataKey="Nº de pedidos" stroke={SERIES[0]} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="Ticket medio" stroke={SERIES[2]} strokeWidth={2.4} dot={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
