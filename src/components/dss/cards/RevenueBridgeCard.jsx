/**
 * RevenueBridgeCard — ¿qué palanca movió el revenue este mes?
 * Descompone el cambio de revenue (mes activo vs mes anterior) en dos efectos:
 *   ΔRev = (Q_t − Q_{t-1})·P_{t-1}   [volumen: nº de pedidos]
 *        + (P_t − P_{t-1})·Q_t       [precio: ticket medio]
 *
 * Visualización: gráfico de CONTRIBUCIÓN (barras divergentes desde cero) — se lee de
 * un vistazo qué palanca empuja arriba (azul) o abajo (neutro) y cuánto.
 * Fuente: daily_revenue (negocio total), coherente con el bloque de evolución.
 */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";
import { CHART_H, AXIS, TIP, PRIMARY, NEUTRAL } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const signed = (v) => `${v >= 0 ? "+" : ""}${fmtCurrency(v)}`;

export default function RevenueBridgeCard({ delay }) {
  const { data = [] } = useDailyRevenue();
  const { periodEnd } = useComparison();

  // Agregar por mes (negocio total)
  const byM = {};
  for (const r of data) {
    const k = r.year * 12 + r.month;
    if (!byM[k]) byM[k] = { k, year: r.year, month: r.month, revenue: 0, purchases: 0 };
    byM[k].revenue += r.revenue || 0;
    byM[k].purchases += r.purchases || 0;
  }
  const months = Object.values(byM).sort((a, b) => a.k - b.k);
  let idx = months.findIndex(m => m.year === periodEnd.year && m.month === periodEnd.month);
  if (idx < 1) idx = months.length - 1;           // fallback al último con anterior disponible
  const cur = months[idx];
  const prev = idx > 0 ? months[idx - 1] : null;
  const hasData = !!(cur && prev);

  let deltaRev = 0, volEffect = 0, priceEffect = 0, momPct, driver = "volumen", bars = [];
  if (hasData) {
    const Qp = prev.purchases || 0, Qc = cur.purchases || 0;
    const Pp = Qp ? prev.revenue / Qp : 0, Pc = Qc ? cur.revenue / Qc : 0;
    volEffect = (Qc - Qp) * Pp;
    priceEffect = (Pc - Pp) * Qc;
    deltaRev = cur.revenue - prev.revenue;
    momPct = prev.revenue ? (deltaRev / prev.revenue) * 100 : undefined;
    driver = Math.abs(volEffect) >= Math.abs(priceEffect) ? "volumen" : "ticket";
    bars = [
      { name: "Volumen (pedidos)", value: Math.round(volEffect) },
      { name: "Ticket (precio)", value: Math.round(priceEffect) },
    ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }
  const axisMax = hasData ? Math.max(Math.abs(volEffect), Math.abs(priceEffect)) * 1.3 || 1 : 1;
  const periodLbl = hasData ? `${M[cur.month]} ${cur.year} vs ${M[prev.month]} ${prev.year}` : "";
  const dirWord = deltaRev >= 0 ? "subió" : "bajó";
  const leverWord = driver === "volumen"
    ? (volEffect >= 0 ? "más pedidos" : "menos pedidos")
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
      note="Descomposición volumen/precio sobre negocio total (Connectif · daily_revenue). ΔRev = Δpedidos·ticket_ant + Δticket·pedidos_actual. Compara meses completos."
    >
      {hasData && (
        <div className={CHART_H}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 0 }} barCategoryGap="35%">
              <XAxis type="number" domain={[-axisMax, axisMax]} {...AXIS} tickFormatter={v => `${v < 0 ? "-" : ""}€${Math.abs(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" width={130} {...AXIS} />
              <ReferenceLine x={0} stroke="hsl(220,10%,50%)" />
              <Tooltip cursor={{ fill: "hsl(220,13%,91%)", fillOpacity: 0.3 }} formatter={(v) => [signed(v), "Efecto"]} {...TIP} />
              <Bar dataKey="value" radius={[3, 3, 3, 3]} barSize={34}>
                {bars.map((b, i) => <Cell key={i} fill={b.value >= 0 ? PRIMARY : NEUTRAL} />)}
                <LabelList dataKey="value" position="right" formatter={(v) => signed(v)} style={{ fontSize: 11, fontWeight: 600, fill: "hsl(220,10%,35%)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
