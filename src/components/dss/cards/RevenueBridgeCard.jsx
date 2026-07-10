/**
 * RevenueBridgeCard — comportamiento de revenue, pedidos y ticket en el tiempo.
 * "Small multiples": tres mini-series apiladas, cada una en su ESCALA REAL y con el
 * mismo eje de tiempo. Conectado al Comparador de Periodos: las cifras y variaciones
 * son el período ACTIVO vs el de REFERENCIA, y el histórico termina en el activo.
 * Con tooltip al pasar el cursor (cifras de las tres series en ese mes).
 * Fuente: daily_revenue (negocio total). Revenue = pedidos × ticket.
 */
import { useState } from "react";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { SERIES, PRIMARY } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const REV_COLOR = "hsl(221,45%,30%)";
const pct = (v) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`);

function SmallMultiples({ labels, series }) {
  const [hi, setHi] = useState(null);
  const W = 760, H = 240, plotL = 168, plotR = W - 16;
  const n = labels.length;
  const rowH = (H - 20) / series.length;
  const x = (i) => (n <= 1 ? plotL : plotL + (i / (n - 1)) * (plotR - plotL));
  const step = n > 1 ? (plotR - plotL) / (n - 1) : (plotR - plotL);

  const geo = series.map((s, r) => {
    const top = 4 + rowH * r, aTop = top + 16, aBot = top + rowH - 14;
    const min = Math.min(...s.values), max = Math.max(...s.values), span = (max - min) || 1;
    return { top, aTop, aBot, y: (v) => aBot - ((v - min) / span) * (aBot - aTop) };
  });

  const bw = 184, bh = 88;
  let bx = 0;
  if (hi != null) { bx = x(hi) + 14; if (bx + bw > W) bx = x(hi) - bw - 14; }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
      onMouseLeave={() => setHi(null)}>
      {series.map((s, r) => {
        const g = geo[r];
        const pts = s.values.map((v, i) => `${x(i)},${g.y(v)}`).join(" ");
        return (
          <g key={r}>
            <text x={10} y={g.top + 22} fontSize="13" fontWeight="600" fill="hsl(220,15%,25%)">{s.name}</text>
            <text x={10} y={g.top + 44} fontSize="19" fontWeight="700" fill={s.color}>{s.fmt(s.values[s.values.length - 1])}</text>
            <text x={112} y={g.top + 44} fontSize="12" fontWeight="600" fill={s.delta == null ? "hsl(220,10%,55%)" : s.delta >= 0 ? PRIMARY : "hsl(220,10%,55%)"}>{pct(s.delta)}</text>
            <line x1={plotL} y1={g.aBot} x2={plotR} y2={g.aBot} stroke="hsl(220,13%,90%)" strokeWidth="1" />
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(n - 1)} cy={g.y(s.values[s.values.length - 1])} r="3.5" fill={s.color} />
          </g>
        );
      })}

      {/* eje de tiempo */}
      {[0, Math.floor((n - 1) / 2), n - 1].map((i, k) => (
        <text key={k} x={x(i)} y={H - 2} fontSize="11" fill="hsl(220,10%,50%)"
          textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}>{labels[i]}</text>
      ))}

      {/* guía + marcadores + tooltip en hover */}
      {hi != null && (
        <g pointerEvents="none">
          <line x1={x(hi)} y1={4} x2={x(hi)} y2={H - 16} stroke="hsl(220,13%,70%)" strokeWidth="1" strokeDasharray="3 3" />
          {series.map((s, r) => <circle key={r} cx={x(hi)} cy={geo[r].y(s.values[hi])} r="4" fill={s.color} stroke="#fff" strokeWidth="1.5" />)}
          <rect x={bx} y={6} width={bw} height={bh} rx="8" fill="#fff" stroke="hsl(220,13%,84%)" strokeWidth="1" />
          <text x={bx + 12} y={26} fontSize="12" fontWeight="700" fill="hsl(220,15%,25%)">{labels[hi]}</text>
          {series.map((s, r) => (
            <text key={r} x={bx + 12} y={46 + r * 18} fontSize="12" fill="hsl(220,15%,30%)">
              <tspan fill={s.color} fontWeight="700">■ </tspan>{s.name}: <tspan fontWeight="700">{s.fmt(s.values[hi])}</tspan>
            </text>
          ))}
        </g>
      )}

      {/* zonas invisibles para hover (una por mes) */}
      {labels.map((_, i) => (
        <rect key={i} x={x(i) - step / 2} y={0} width={step} height={H} fill="transparent"
          onMouseEnter={() => setHi(i)} />
      ))}
    </svg>
  );
}

export default function RevenueBridgeCard({ delay }) {
  const { data = [] } = useDailyRevenue();
  const { periodA, periodB } = useComparison();

  const byM = {};
  for (const r of data) {
    const k = r.year * 12 + r.month;
    if (!byM[k]) byM[k] = { k, year: r.year, month: r.month, revenue: 0, purchases: 0 };
    byM[k].revenue += r.revenue || 0;
    byM[k].purchases += r.purchases || 0;
  }
  const all = Object.values(byM).sort((a, b) => a.k - b.k);
  const ticketOf = (m) => (m && m.purchases ? m.revenue / m.purchases : 0);

  let idx = all.findIndex(m => m.year === periodB.year && m.month === periodB.month);
  if (idx < 0) idx = all.length - 1;                       // activo no disponible → último
  const cur = all[idx];
  const ref = all.find(m => m.year === periodA.year && m.month === periodA.month) || null;
  const window = all.slice(Math.max(0, idx - 14), idx + 1);
  const hasData = window.length >= 3 && !!cur;

  const Qc = cur?.purchases || 0, Pc = ticketOf(cur);
  const d = (c, r) => (r ? ((c - r) / r) * 100 : null);
  const revD = ref ? d(cur.revenue, ref.revenue) : null;
  const ordersD = ref ? d(Qc, ref.purchases) : null;
  const ticketD = ref ? d(Pc, ticketOf(ref)) : null;
  const dominant = Math.abs(ordersD ?? 0) >= Math.abs(ticketD ?? 0) ? "pedidos" : "ticket";

  const curLbl = cur ? `${M[cur.month]} ${cur.year}` : "";
  const refLbl = ref ? `${M[ref.month]} ${ref.year}` : "período de referencia";
  const labels = window.map(m => `${M[m.month]} ${String(m.year).slice(2)}`);
  const series = [
    { name: "Revenue", values: window.map(m => m.revenue), color: REV_COLOR, fmt: fmtCurrency, delta: revD },
    { name: "Nº de pedidos", values: window.map(m => m.purchases), color: SERIES[0], fmt: fmtNumber, delta: ordersD },
    { name: "Ticket medio", values: window.map(ticketOf), color: SERIES[2], fmt: (v) => `€${v.toFixed(0)}`, delta: ticketD },
  ];

  return (
    <EvidenceCard
      question="¿Cómo se comportan revenue, pedidos y ticket en el tiempo?"
      kpis={hasData ? [
        { value: fmtCurrency(cur.revenue), label: `Revenue · ${curLbl}`, delta: revD },
        { value: fmtNumber(Qc), label: "Nº de pedidos", delta: ordersD },
        { value: `€${Pc.toFixed(0)}`, label: "Ticket medio", delta: ticketD },
      ] : undefined}
      answer={!hasData ? "Sin datos suficientes" : undefined}
      maturity="green"
      insight={hasData
        ? (ref
          ? `${curLbl} vs ${refLbl}: revenue ${pct(revD)}, con pedidos ${pct(ordersD)} y ticket medio ${pct(ticketD)}. Lo sostienen sobre todo los ${dominant}.`
          : `Sin período de referencia comparable; se muestra la evolución hasta ${curLbl}.`)
        : undefined}
      actions={[
        { verb: "reasignar", rationale: dominant === "pedidos"
          ? "El motor es el nº de pedidos: prioriza captación y frecuencia de compra."
          : "El motor es el ticket medio: prioriza cross-sell, bundles y precio." },
      ]}
      delay={delay}
      note="Tres variables en su escala real, mismo eje de tiempo. Cifras y variaciones = período activo vs referencia del Comparador. Fuente: Connectif · daily_revenue (negocio total)."
    >
      {hasData && (
        <div className="h-72">
          <SmallMultiples labels={labels} series={series} />
        </div>
      )}
    </EvidenceCard>
  );
}
