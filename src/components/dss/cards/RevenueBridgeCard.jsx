/**
 * RevenueBridgeCard — comportamiento de las tres variables del revenue en el tiempo.
 * Revenue = nº de pedidos × ticket medio. Como tienen unidades distintas, se muestran
 * en "small multiples": tres mini-series apiladas, cada una con su ESCALA REAL y el
 * mismo eje de tiempo. Se compara su forma de un vistazo, sin índices ni base 100.
 * Fuente: daily_revenue (negocio total).
 */
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { SERIES, PRIMARY } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const REV_COLOR = "hsl(221,45%,30%)";
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

// Small multiples: una fila por variable, escala propia, eje de tiempo compartido.
function SmallMultiples({ labels, series }) {
  const W = 760, H = 240, gutter = 168, plotL = gutter, plotR = W - 12;
  const n = labels.length;
  const rowH = (H - 20) / series.length;
  const x = (i) => (n <= 1 ? plotL : plotL + (i / (n - 1)) * (plotR - plotL));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {series.map((s, r) => {
        const top = 4 + rowH * r;
        const aTop = top + 16, aBot = top + rowH - 14;
        const min = Math.min(...s.values), max = Math.max(...s.values);
        const span = (max - min) || 1;
        const y = (v) => aBot - ((v - min) / span) * (aBot - aTop);
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        const lastY = y(s.values[s.values.length - 1]);
        const dc = s.delta >= 0 ? PRIMARY : "hsl(220,10%,55%)";
        return (
          <g key={r}>
            {/* etiqueta izquierda: nombre + valor actual + variación */}
            <text x={10} y={top + 22} fontSize="13" fontWeight="600" fill="hsl(220,15%,25%)">{s.name}</text>
            <text x={10} y={top + 44} fontSize="19" fontWeight="700" fill={s.color}>{s.fmt(s.values[s.values.length - 1])}</text>
            <text x={110} y={top + 44} fontSize="12" fontWeight="600" fill={dc}>{pct(s.delta)}</text>
            {/* base de la fila */}
            <line x1={plotL} y1={aBot} x2={plotR} y2={aBot} stroke="hsl(220,13%,90%)" strokeWidth="1" />
            {/* línea de la serie */}
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(n - 1)} cy={lastY} r="3.5" fill={s.color} />
          </g>
        );
      })}
      {/* eje de tiempo compartido (abajo) */}
      {[0, Math.floor((n - 1) / 2), n - 1].map((i, k) => (
        <text key={k} x={x(i)} y={H - 2} fontSize="11" fill="hsl(220,10%,50%)"
          textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}>{labels[i]}</text>
      ))}
    </svg>
  );
}

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
  const window = all.slice(Math.max(0, idx - 14), idx + 1);
  const hasData = window.length >= 3;
  const ticketOf = (m) => (m.purchases ? m.revenue / m.purchases : 0);

  const cur = window[window.length - 1] || {};
  const prev = window[window.length - 2] || {};
  const Qc = cur.purchases || 0, Pc = ticketOf(cur);
  const revMoM = prev.revenue ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : 0;
  const ordersMoM = prev.purchases ? ((Qc - prev.purchases) / prev.purchases) * 100 : 0;
  const ticketMoM = ticketOf(prev) ? ((Pc - ticketOf(prev)) / ticketOf(prev)) * 100 : 0;
  const dominant = Math.abs(ordersMoM) >= Math.abs(ticketMoM) ? "pedidos" : "ticket";
  const rangeLbl = hasData ? `${M[window[0].month]} ${String(window[0].year).slice(2)}–${M[cur.month]} ${String(cur.year).slice(2)}` : "";

  const labels = window.map(m => `${M[m.month]} ${String(m.year).slice(2)}`);
  const series = [
    { name: "Revenue", values: window.map(m => m.revenue), color: REV_COLOR, fmt: fmtCurrency, delta: revMoM },
    { name: "Nº de pedidos", values: window.map(m => m.purchases), color: SERIES[0], fmt: fmtNumber, delta: ordersMoM },
    { name: "Ticket medio", values: window.map(ticketOf), color: SERIES[2], fmt: (v) => `€${v.toFixed(0)}`, delta: ticketMoM },
  ];

  return (
    <EvidenceCard
      question="¿Cómo se comportan revenue, pedidos y ticket en el tiempo?"
      kpis={hasData ? [
        { value: fmtCurrency(cur.revenue), label: "Revenue · último mes", delta: revMoM },
        { value: fmtNumber(Qc), label: "Nº de pedidos", delta: ordersMoM },
        { value: `€${Pc.toFixed(0)}`, label: "Ticket medio", delta: ticketMoM },
      ] : undefined}
      answer={!hasData ? "Sin datos suficientes" : undefined}
      maturity="green"
      insight={hasData
        ? `El revenue lo sostienen sobre todo los ${dominant}: el nº de pedidos ${ordersMoM >= 0 ? "sube" : "baja"} (${pct(ordersMoM)}) y el ticket medio ${ticketMoM >= 0 ? "sube" : "baja"} (${pct(ticketMoM)}) frente al mes anterior.`
        : undefined}
      actions={[
        { verb: "reasignar", rationale: dominant === "pedidos"
          ? "El motor es el nº de pedidos: prioriza captación y frecuencia de compra."
          : "El motor es el ticket medio: prioriza cross-sell, bundles y precio." },
      ]}
      delay={delay}
      note={`Tres variables (${rangeLbl}), cada una en su escala real y con el mismo eje de tiempo. Revenue = pedidos × ticket. Fuente: Connectif · daily_revenue (negocio total).`}
    >
      {hasData && (
        <div className="h-72">
          <SmallMultiples labels={labels} series={series} />
        </div>
      )}
    </EvidenceCard>
  );
}
