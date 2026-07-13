/**
 * SaludResumen — composición del revenue por LÍNEA de negocio (Nutracéuticos BVS y
 * BVS Vet Shop) para el período del comparador, comparado contra el período de referencia.
 * Descompone el revenue total (va debajo de la evolución). Las dos líneas se comparan por
 * las mismas dos métricas: Revenue (€) y su Aporte a las ventas (% del revenue del negocio).
 * La recurrencia ya no vive aquí: es una métrica de cliente y está en Clientes.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useMonthlyMetrics, useCompradores } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP, SERIES } from "@/lib/dss/chartTheme";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const pctChange = (cur, prev) => (prev == null || prev === 0) ? null : ((cur - prev) / Math.abs(prev)) * 100;

function Delta({ pct, suffix }) {
  if (pct == null) return <span className="text-xs text-muted-foreground">— sin comparación</span>;
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color = pct > 0 ? "text-primary" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{pct > 0 ? "+" : ""}{pct.toFixed(1)}% {suffix}
    </span>
  );
}

function Row({ label, value, pts }) {
  const up = pts != null && pts > 0;
  const col = pts == null ? "text-muted-foreground/60" : up ? "text-primary" : "text-muted-foreground";
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-semibold text-foreground">{value}</span>
        <span className={`text-[11px] font-semibold ${col}`}>{pts == null ? "—" : `${up ? "+" : ""}${pts.toFixed(1)} pts`}</span>
      </span>
    </div>
  );
}

export default function SaludResumen() {
  const { data: metrics = [] } = useMonthlyMetrics();
  const { data: compradores = [] } = useCompradores();
  const { rangeA, rangeB, sumRange, labelRange } = useComparison();
  const cmp = `vs ${labelRange(rangeA)}`;

  const nutraRevB = sumRange(metrics, rangeB, "revenue");
  const nutraRevA = sumRange(metrics, rangeA, "revenue");
  const vetRevB = sumRange(compradores, rangeB, "revenue");
  const vetRevA = sumRange(compradores, rangeA, "revenue");

  const combinedB = nutraRevB + vetRevB;
  const combinedA = nutraRevA + vetRevA;
  const nutraShareB = combinedB > 0 ? (nutraRevB / combinedB) * 100 : 0;
  const vetShareB = combinedB > 0 ? (vetRevB / combinedB) * 100 : 0;
  // El aporte (mix) solo es comparable si AMBAS líneas tienen dato en el período de
  // comparación; si una faltaba (p.ej. Vet Shop no se registraba en 2025), el ±pts sería
  // un artefacto engañoso → se suprime en las dos.
  const mixComparable = nutraRevA > 0 && vetRevA > 0;
  const nutraSharePts = mixComparable ? nutraShareB - nutraShareA : null;
  const vetSharePts = mixComparable ? vetShareB - vetShareA : null;

  const hasData = nutraRevB > 0 || vetRevB > 0;

  // Serie mensual (últimos 12 meses hasta el corte) para ver la EVOLUCIÓN del reparto.
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const byM = {};
  for (const r of metrics) { const k = r.year * 12 + r.month; if (k > cutoff) continue; (byM[k] ||= { k, year: r.year, month: r.month, nutra: 0, vet: 0 }).nutra += r.revenue || 0; }
  for (const c of compradores) { const k = c.year * 12 + c.month; if (k > cutoff) continue; (byM[k] ||= { k, year: c.year, month: c.month, nutra: 0, vet: 0 }).vet += c.revenue || 0; }
  const series = Object.values(byM).sort((a, b) => a.k - b.k).slice(-12)
    .map(m => ({ name: `${M[m.month]} ${String(m.year).slice(2)}`, "Nutracéuticos BVS": m.nutra, "BVS Vet Shop": m.vet }));
  const hasSeries = series.length >= 2;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Cómo se reparte el revenue por línea de negocio?"
      answer={!hasData ? "Sin datos para el período seleccionado" : undefined}
      maturity="green"
      note="Revenue por línea (Connectif · monthly_metrics + compradores). Aporte a las ventas = % del revenue total del negocio; el delta en puntos solo se muestra si ambas líneas tienen dato en el período de comparación."
    >
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Foto del período: reparto en una barra de doble color (mismo estilo) */}
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="flex items-baseline gap-1.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-sm self-center" style={{ background: SERIES[1] }} />
                <span className="font-semibold text-foreground">Nutracéuticos BVS</span>
                <span className="text-muted-foreground">{fmtCurrency(nutraRevB)}</span>
                <Delta pct={pctChange(nutraRevB, nutraRevA)} suffix="" />
              </span>
              <span className="flex items-baseline gap-1.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-sm self-center" style={{ background: SERIES[0] }} />
                <span className="font-semibold text-foreground">BVS Vet Shop</span>
                <span className="text-muted-foreground">{fmtCurrency(vetRevB)}</span>
              </span>
            </div>
            <div className="h-10 w-full rounded-lg overflow-hidden flex text-xs font-bold text-white">
              <div className="flex items-center justify-center" style={{ width: `${nutraShareB}%`, background: SERIES[1] }} title={`Nutracéuticos ${nutraShareB.toFixed(0)}%`}>
                {nutraShareB >= 8 ? `${nutraShareB.toFixed(0)}%` : ""}
              </div>
              <div className="flex items-center justify-center" style={{ width: `${vetShareB}%`, background: SERIES[0] }} title={`Vet Shop ${vetShareB.toFixed(0)}%`}>
                {vetShareB >= 8 ? `${vetShareB.toFixed(0)}%` : ""}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Aporte de cada línea al revenue del período{cmp ? ` · Nutracéuticos ${cmp}` : ""}.</p>
          </div>

          {/* Evolución del reparto (últimos 12 meses) */}
          {hasSeries && (
            <div className={CHART_H}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(series.length / 6))} />
                  <YAxis {...AXIS} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v, n) => [fmtCurrency(v), n]} {...TIP} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Nutracéuticos BVS" stackId="1" fill={SERIES[1]} radius={[0, 0, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="BVS Vet Shop" stackId="1" fill={SERIES[0]} radius={[3, 3, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </EvidenceCard>
  );
}
