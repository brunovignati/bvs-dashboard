/**
 * SaludResumen — composición del revenue por LÍNEA de negocio (Nutracéuticos BVS y
 * BVS Vet Shop) para el período del comparador, comparado contra el período de referencia.
 * Descompone el revenue total (va debajo de la evolución). Las dos líneas se comparan por
 * las mismas dos métricas: Revenue (€) y su Aporte a las ventas (% del revenue del negocio).
 * La recurrencia ya no vive aquí: es una métrica de cliente y está en Clientes.
 */
import EvidenceCard from "../EvidenceCard";
import { useMonthlyMetrics, useCompradores } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Cómo se reparte el revenue por línea de negocio?"
      answer={!hasData ? "Sin datos para el período seleccionado" : undefined}
      maturity="green"
      note="Revenue por línea (Connectif · monthly_metrics + compradores). Aporte a las ventas = % del revenue total del negocio; el delta en puntos solo se muestra si ambas líneas tienen dato en el período de comparación."
    >
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Nutracéuticos BVS · revenue</p>
            <p className="text-xl font-black">{fmtCurrency(nutraRevB)}</p>
            <Delta pct={pctChange(nutraRevB, nutraRevA)} suffix={cmp} />
            <div className="pt-2">
              <Row label="Aporte a las ventas" value={`${nutraShareB.toFixed(0)}%`} pts={nutraSharePts} />
            </div>
          </div>
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">BVS Vet Shop · revenue</p>
            <p className="text-xl font-black">{fmtCurrency(vetRevB)}</p>
            <Delta pct={pctChange(vetRevB, vetRevA)} suffix={cmp} />
            <div className="pt-2">
              <Row label="Aporte a las ventas" value={`${vetShareB.toFixed(0)}%`} pts={vetSharePts} />
            </div>
          </div>
        </div>
      )}
    </EvidenceCard>
  );
}
