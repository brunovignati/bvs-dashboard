/**
 * RevenueBridgeCard — ¿qué mueve el revenue: más pedidos o mayor ticket?
 * Revenue = nº de pedidos × ticket medio. En vez de una descomposición en euros
 * (concepto de analista), mostramos cómo se movió cada MOTOR en % — intuitivo:
 * "+7% de pedidos pero −4% de ticket → revenue +2.5%". Compara meses completos.
 */
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { CHART_H, PRIMARY, NEUTRAL } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const AXIS_TXT = "hsl(220,10%,50%)";
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

// Dos barras divergentes: % de cambio de cada motor (pedidos y ticket).
function DriverBars({ ordersPct, ticketPct, revPct }) {
  const rows = [
    { name: "Nº de pedidos", v: ordersPct },
    { name: "Ticket medio", v: ticketPct },
  ];
  const maxAbs = Math.max(Math.abs(ordersPct), Math.abs(ticketPct), Math.abs(revPct), 1);
  const W = 720, H = 220;
  const plotL = 150, plotR = 620, center = (plotL + plotR) / 2, half = (plotR - plotL) / 2;
  const x = (v) => center + (v / (maxAbs * 1.2)) * half;
  const rowY = [40, 108], barH = 40;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* línea cero */}
      <line x1={center} y1={26} x2={center} y2={168} stroke="hsl(220,13%,80%)" strokeWidth="1.5" />
      {rows.map((r, i) => {
        const y = rowY[i];
        const up = r.v >= 0;
        const bx = up ? center : x(r.v);
        const bw = Math.max(2, Math.abs(x(r.v) - center));
        return (
          <g key={i}>
            <text x={16} y={y + barH / 2 + 5} fontSize="15" fontWeight="600" fill="hsl(220,15%,25%)">{r.name}</text>
            <rect x={bx} y={y} width={bw} height={barH} rx="4" fill={up ? PRIMARY : NEUTRAL} />
            <text x={up ? x(r.v) + 10 : x(r.v) - 10} y={y + barH / 2 + 5} textAnchor={up ? "start" : "end"}
              fontSize="15" fontWeight="700" fill="hsl(220,15%,25%)">{pct(r.v)}</text>
          </g>
        );
      })}
      {/* resultado */}
      <line x1={16} y1={182} x2={W - 16} y2={182} stroke="hsl(220,13%,90%)" strokeWidth="1" />
      <text x={16} y={205} fontSize="15" fill={AXIS_TXT}>
        <tspan fontWeight="600" fill="hsl(220,15%,25%)">= Revenue </tspan>
        <tspan fontWeight="700" fill={revPct >= 0 ? PRIMARY : NEUTRAL}>{pct(revPct)}</tspan>
      </text>
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
  const months = Object.values(byM).sort((a, b) => a.k - b.k);
  let idx = months.findIndex(m => m.year === periodEnd.year && m.month === periodEnd.month);
  if (idx < 1) idx = months.length - 1;
  const cur = months[idx];
  const prev = idx > 0 ? months[idx - 1] : null;
  const hasData = !!(cur && prev);

  let deltaRev = 0, revPct = 0, ordersPct = 0, ticketPct = 0, Qc = 0, Pc = 0, driver = "pedidos";
  if (hasData) {
    const Qp = prev.purchases || 0; Qc = cur.purchases || 0;
    const Pp = Qp ? prev.revenue / Qp : 0; Pc = Qc ? cur.revenue / Qc : 0;
    deltaRev = cur.revenue - prev.revenue;
    revPct = prev.revenue ? (deltaRev / prev.revenue) * 100 : 0;
    ordersPct = Qp ? ((Qc - Qp) / Qp) * 100 : 0;
    ticketPct = Pp ? ((Pc - Pp) / Pp) * 100 : 0;
    driver = Math.abs(ordersPct) >= Math.abs(ticketPct) ? "pedidos" : "ticket";
  }
  const periodLbl = hasData ? `${M[cur.month]} ${cur.year} vs ${M[prev.month]} ${prev.year}` : "";
  const insight = hasData
    ? `${ordersPct >= 0 ? "Más" : "Menos"} pedidos (${pct(ordersPct)}) ${((ordersPct >= 0) !== (ticketPct >= 0)) ? "junto a" : "y"} un ticket medio ${ticketPct >= 0 ? "más alto" : "más bajo"} (${pct(ticketPct)}) dejan el revenue en ${pct(revPct)} frente al mes anterior.`
    : undefined;

  return (
    <EvidenceCard
      question="¿Qué mueve el revenue: más pedidos o mayor ticket?"
      kpis={hasData ? [
        { value: `${deltaRev >= 0 ? "+" : ""}${fmtCurrency(deltaRev)}`, label: `Δ revenue · ${periodLbl}`, delta: revPct },
        { value: fmtNumber(Qc), label: "Nº de pedidos", delta: ordersPct },
        { value: `€${Pc.toFixed(0)}`, label: "Ticket medio", delta: ticketPct },
      ] : undefined}
      answer={!hasData ? "Sin datos suficientes" : undefined}
      maturity="green"
      insight={insight}
      actions={[
        { verb: "reasignar", rationale: driver === "pedidos"
          ? "El revenue lo mueve el nº de pedidos: actúa sobre captación y frecuencia de compra."
          : "El revenue lo mueve el ticket medio: actúa sobre cross-sell, bundles y precio." },
      ]}
      delay={delay}
      note="Revenue = nº de pedidos × ticket medio (negocio total · Connectif · daily_revenue). % de cambio de cada motor entre meses completos."
    >
      {hasData && (
        <div className={CHART_H}>
          <DriverBars ordersPct={ordersPct} ticketPct={ticketPct} revPct={revPct} />
        </div>
      )}
    </EvidenceCard>
  );
}
