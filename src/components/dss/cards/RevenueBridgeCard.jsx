/**
 * RevenueBridgeCard — waterfall que descompone el cambio de revenue mes a mes
 * en sus dos palancas: efecto volumen (pedidos) y efecto precio (ticket medio).
 *
 *   Revenue = pedidos × ticket
 *   ΔRev = (Q_t − Q_{t-1})·P_{t-1}   [volumen]
 *        + (P_t − P_{t-1})·Q_t       [precio]
 *
 * Responde "¿qué impulsa el revenue?" de forma causal y accionable — el rol que
 * una matriz de correlación no puede cumplir. Paleta de dos colores: aporta = azul,
 * resta = neutro.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useMonthlyMetrics } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP, SERIES, PRIMARY, NEUTRAL } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const ACCENT = SERIES[1];

function ticketOf(m) {
  if (!m) return 0;
  if (m.purchases > 0) return m.revenue / m.purchases;
  return m.avgPurchase || 0;
}

export default function RevenueBridgeCard({ delay }) {
  const { data = [] } = useMonthlyMetrics();
  const { periodEnd } = useComparison();

  const sorted = [...data].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  const idxEnd = sorted.findIndex(r => r.year === periodEnd.year && r.month === periodEnd.month);
  const cur = idxEnd >= 0 ? sorted[idxEnd] : sorted[sorted.length - 1];
  const curIdx = idxEnd >= 0 ? idxEnd : sorted.length - 1;
  const prev = curIdx > 0 ? sorted[curIdx - 1] : null;
  const hasData = !!(cur && prev);

  let steps = [], deltaRev = 0, volEffect = 0, priceEffect = 0;
  if (hasData) {
    const Qp = prev.purchases || 0, Qc = cur.purchases || 0;
    const Pp = ticketOf(prev), Pc = ticketOf(cur);
    const revPrev = prev.revenue || 0, revCur = cur.revenue || 0;
    volEffect = (Qc - Qp) * Pp;
    priceEffect = (Pc - Pp) * Qc;
    deltaRev = revCur - revPrev;

    // construir waterfall con base invisible + barra visible
    const mk = (name, from, to, kind) => {
      const base = Math.min(from, to);
      const val = Math.abs(to - from);
      const up = to >= from;
      return { name, base, val, up, kind, from, to };
    };
    const r0 = revPrev;
    const r1 = r0 + volEffect;
    const r2 = r1 + priceEffect; // ≈ revCur
    steps = [
      mk(`${M[prev.month]} ${String(prev.year).slice(2)}`, 0, r0, "total"),
      mk("Volumen (pedidos)", r0, r1, "delta"),
      mk("Ticket (precio)", r1, r2, "delta"),
      mk(`${M[cur.month]} ${String(cur.year).slice(2)}`, 0, revCur, "total"),
    ];
  }

  const colorFor = (s) => s.kind === "total"
    ? (s.name.includes(String(cur?.year ?? "").slice(2)) && s !== steps[0] ? ACCENT : PRIMARY)
    : (s.up ? PRIMARY : NEUTRAL);

  const driver = Math.abs(volEffect) >= Math.abs(priceEffect) ? "volumen" : "ticket";
  const momPct = hasData && prev.revenue ? (deltaRev / prev.revenue) * 100 : undefined;

  return (
    <EvidenceCard
      question="¿Qué impulsa el cambio de revenue: volumen o ticket?"
      kpis={hasData ? [
        { value: fmtCurrency(deltaRev), label: `Δ revenue ${M[cur.month]} ${cur.year}`, delta: momPct },
        { value: fmtCurrency(volEffect), label: "Efecto volumen" },
        { value: fmtCurrency(priceEffect), label: "Efecto ticket" },
      ] : undefined}
      answer={!hasData ? "Sin datos" : undefined}
      maturity="green"
      insight={hasData
        ? `El cambio del mes lo explica sobre todo el ${driver} (${driver === "volumen" ? "nº de pedidos" : "ticket medio"}).`
        : undefined}
      actions={[
        { verb: "reasignar", rationale: hasData && driver === "volumen"
          ? "El cambio viene del nº de pedidos: actúa sobre captación y frecuencia de compra."
          : "El cambio viene del ticket medio: actúa sobre cross-sell, bundles y precio." },
      ]}
      delay={delay}
      note="Descomposición volumen/precio (Connectif · monthly_metrics). ΔRev = Δpedidos·ticket_ant + Δticket·pedidos_actual."
    >
      {hasData && (
        <div className={CHART_H}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={steps} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                cursor={{ fill: "hsl(220,13%,91%)", fillOpacity: 0.3 }}
                formatter={(v, n, p) => [`${p.payload.up ? "" : "−"}${fmtCurrency(p.payload.val)}`, p.payload.kind === "total" ? "Revenue" : "Efecto"]}
                {...TIP} />
              {/* base invisible */}
              <Bar dataKey="base" stackId="w" fill="transparent" />
              <Bar dataKey="val" stackId="w" radius={[3, 3, 0, 0]}>
                {steps.map((s, i) => <Cell key={i} fill={colorFor(s)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
