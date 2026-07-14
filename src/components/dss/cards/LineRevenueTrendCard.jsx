/**
 * LineRevenueTrendCard (Growth · Revenue) — desarrollo periódico de las ventas por
 * LÍNEA de negocio: Nutracéuticos BVS (monthly_metrics) + BVS Vet Shop (compradores),
 * mes a mes, apilado en doble color. Respeta el periodo (corta en rangeB.end).
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useMonthlyMetrics, useCompradores } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP, SERIES } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function LineRevenueTrendCard({ delay }) {
  const { data: metrics = [] } = useMonthlyMetrics();
  const { data: comp = [] } = useCompradores();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const byM = {};
  for (const r of metrics) { const k = r.year * 12 + r.month; if (k > cutoff) continue; (byM[k] ||= { k, year: r.year, month: r.month, nutra: 0, vet: 0 }).nutra += r.revenue || 0; }
  for (const c of comp) { const k = c.year * 12 + c.month; if (k > cutoff) continue; (byM[k] ||= { k, year: c.year, month: c.month, nutra: 0, vet: 0 }).vet += c.revenue || 0; }
  const rows = Object.values(byM).sort((a, b) => a.k - b.k).slice(-18)
    .map(m => ({ name: `${M[m.month]} ${String(m.year).slice(2)}`, "Nutracéuticos BVS": m.nutra, "BVS Vet Shop": m.vet, total: m.nutra + m.vet }));
  const hasData = rows.length >= 2;
  const last = hasData ? rows[rows.length - 1] : null;
  const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
  const mom = last && prev && prev.total ? ((last.total - prev.total) / prev.total) * 100 : undefined;

  // ── Vista B — mismo apilado pero en CUOTA (100%): revela el desplazamiento de mix entre
  // líneas (¿Vet Shop gana peso sobre Nutracéuticos?). Mismos datos/periodo. ──
  const altView = hasData ? (
    <div className={CHART_H}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} stackOffset="expand" margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(rows.length / 8))} />
          <YAxis {...AXIS} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip formatter={(v, n, p) => [`${fmtCurrency(v)} · ${p?.payload?.total ? ((v / p.payload.total) * 100).toFixed(1) : 0}%`, n]} {...TIP} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Nutracéuticos BVS" stackId="1" fill={SERIES[1]} maxBarSize={30} />
          <Bar dataKey="BVS Vet Shop" stackId="1" fill={SERIES[0]} radius={[3, 3, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Cómo evolucionan las ventas por línea de negocio?"
      kpis={hasData ? [
        { value: fmtCurrency(last["Nutracéuticos BVS"]), label: `Nutracéuticos · ${last.name}` },
        { value: fmtCurrency(last["BVS Vet Shop"]), label: `Vet Shop · ${last.name}` },
        { value: fmtCurrency(last.total), label: "Total mes", delta: mom },
      ] : undefined}
      answer={!hasData ? "Sin datos suficientes" : undefined}
      maturity="green"
      actions={[
        { verb: "vigilar", rationale: "Observa qué línea impulsa el crecimiento mes a mes y reequilibra el surtido/promoción según la que gane tracción." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Absoluto", b: "Cuota" }}
      note="Revenue mensual por línea de negocio: Nutracéuticos (Connectif · monthly_metrics) + BVS Vet Shop (Connectif · compradores). Apilado = total del negocio. Corta en el fin del periodo seleccionado. Vista 'Cuota' = peso relativo de cada línea (100%), para ver el desplazamiento de mix."
    >
      {hasData && (
        <div className={CHART_H}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(rows.length / 8))} />
              <YAxis {...AXIS} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v, n) => [fmtCurrency(v), n]} {...TIP} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Nutracéuticos BVS" stackId="1" fill={SERIES[1]} maxBarSize={30} />
              <Bar dataKey="BVS Vet Shop" stackId="1" fill={SERIES[0]} radius={[3, 3, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
