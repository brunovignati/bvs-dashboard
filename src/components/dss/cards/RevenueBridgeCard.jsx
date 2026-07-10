/**
 * RevenueBridgeCard — ¿qué palanca movió el revenue? (variance bridge / waterfall)
 * Descompone el cambio de revenue (mes activo vs anterior, meses completos) en:
 *   ΔRev = (Q_t − Q_{t-1})·P_{t-1}   [volumen: nº de pedidos]
 *        + (P_t − P_{t-1})·Q_t       [precio: ticket medio]
 *
 * Visualización: waterfall que "camina" desde 0 sumando Volumen y Ticket hasta el
 * Δ neto — el estándar de FP&A para leer una variación de un vistazo. Conectores +
 * etiquetas de valor. Fuente: daily_revenue (negocio total), coherente con evolución.
 */
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";
import { CHART_H, PRIMARY, NEUTRAL } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const TOTAL_COLOR = "hsl(221,45%,30%)";        // total (neto) — azul oscuro de la escala
const AXIS_TXT = "hsl(220,10%,50%)";
const signed = (v) => `${v >= 0 ? "+" : ""}${fmtCurrency(v)}`;

// ── Waterfall en SVG (control total de barras, conectores y etiquetas) ──
function Waterfall({ volEffect, priceEffect, deltaRev }) {
  const steps = [
    { label: "Volumen", kind: "delta", val: volEffect },
    { label: "Ticket", kind: "delta", val: priceEffect },
    { label: "Δ neto", kind: "total", val: deltaRev },
  ];
  let run = 0;
  const geom = steps.map(s => {
    if (s.kind === "delta") { const start = run; const end = run + s.val; run = end; return { ...s, start, end }; }
    return { ...s, start: 0, end: s.val };
  });
  const vals = [0, ...geom.flatMap(g => [g.start, g.end])];
  let minV = Math.min(...vals), maxV = Math.max(...vals);
  if (minV > 0) minV = 0; if (maxV < 0) maxV = 0;
  const span = (maxV - minV) || 1;
  const domMin = minV - span * 0.14, domMax = maxV + span * 0.16;

  const W = 720, H = 250, top = 20, bottom = 210, padX = 16;
  const colW = (W - padX * 2) / geom.length;
  const barW = Math.min(130, colW * 0.56);
  const cx = (i) => padX + colW * i + colW / 2;
  const y = (v) => bottom - ((v - domMin) / (domMax - domMin)) * (bottom - top);

  const zeroY = y(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* línea base en cero */}
      <line x1={padX} y1={zeroY} x2={W - padX} y2={zeroY} stroke="hsl(220,13%,86%)" strokeWidth="1" />
      {/* conectores entre pasos (enlazan niveles acumulados) */}
      {geom.slice(0, -1).map((g, i) => {
        const yc = y(i === 0 ? g.end : g.end);        // nivel al final del paso
        return <line key={`c${i}`} x1={cx(i) + barW / 2} y1={yc} x2={cx(i + 1) - barW / 2} y2={yc}
          stroke="hsl(220,13%,72%)" strokeWidth="1.5" strokeDasharray="4 3" />;
      })}
      {/* barras */}
      {geom.map((g, i) => {
        const yA = y(g.start), yB = y(g.end);
        const ry = Math.min(yA, yB), rh = Math.max(2, Math.abs(yA - yB));
        const color = g.kind === "total" ? TOTAL_COLOR : (g.val >= 0 ? PRIMARY : NEUTRAL);
        const labelY = ry - 8;
        return (
          <g key={i}>
            <rect x={cx(i) - barW / 2} y={ry} width={barW} height={rh} rx="4" fill={color} />
            <text x={cx(i)} y={labelY} textAnchor="middle" fontSize="14" fontWeight="700" fill="hsl(220,15%,25%)">
              {g.kind === "total" ? fmtCurrency(g.val) : signed(g.val)}
            </text>
            <text x={cx(i)} y={bottom + 22} textAnchor="middle" fontSize="12" fill={AXIS_TXT}>
              {g.label}
            </text>
          </g>
        );
      })}
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

  let deltaRev = 0, volEffect = 0, priceEffect = 0, momPct, driver = "volumen";
  if (hasData) {
    const Qp = prev.purchases || 0, Qc = cur.purchases || 0;
    const Pp = Qp ? prev.revenue / Qp : 0, Pc = Qc ? cur.revenue / Qc : 0;
    volEffect = (Qc - Qp) * Pp;
    priceEffect = (Pc - Pp) * Qc;
    deltaRev = cur.revenue - prev.revenue;
    momPct = prev.revenue ? (deltaRev / prev.revenue) * 100 : undefined;
    driver = Math.abs(volEffect) >= Math.abs(priceEffect) ? "volumen" : "ticket";
  }
  const periodLbl = hasData ? `${M[cur.month]} ${cur.year} vs ${M[prev.month]} ${prev.year}` : "";
  const dirWord = deltaRev >= 0 ? "subió" : "bajó";
  const leverWord = driver === "volumen"
    ? (volEffect >= 0 ? "más pedidos (volumen)" : "menos pedidos (volumen)")
    : (priceEffect >= 0 ? "un ticket medio más alto" : "un ticket medio más bajo");

  return (
    <EvidenceCard
      question="¿Qué palanca movió el revenue: volumen o ticket?"
      kpis={hasData ? [
        { value: signed(deltaRev), label: `Δ revenue · ${periodLbl}`, delta: momPct },
        { value: signed(volEffect), label: "Efecto volumen (pedidos)" },
        { value: signed(priceEffect), label: "Efecto ticket (precio)" },
      ] : undefined}
      answer={!hasData ? "Sin datos suficientes" : undefined}
      maturity="green"
      insight={hasData
        ? `El revenue ${dirWord} ${fmtCurrency(Math.abs(deltaRev))} frente al mes anterior, explicado sobre todo por ${leverWord}.`
        : undefined}
      actions={[
        { verb: "reasignar", rationale: driver === "volumen"
          ? "El cambio viene del nº de pedidos: actúa sobre captación y frecuencia de compra."
          : "El cambio viene del ticket medio: actúa sobre cross-sell, bundles y precio." },
      ]}
      delay={delay}
      note="Waterfall de contribución sobre negocio total (Connectif · daily_revenue). ΔRev = Δpedidos·ticket_ant + Δticket·pedidos_actual. Meses completos."
    >
      {hasData && (
        <div className={CHART_H}>
          <Waterfall volEffect={volEffect} priceEffect={priceEffect} deltaRev={deltaRev} />
        </div>
      )}
    </EvidenceCard>
  );
}
