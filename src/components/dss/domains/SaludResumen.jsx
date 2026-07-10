/**
 * SaludResumen — estado del negocio para el período del COMPARADOR (rangeB),
 * comparado contra el período de comparación (rangeA). No es una foto mensual fija:
 * agrega sobre el rango elegido y reacciona a cualquier cambio del comparador global.
 *
 * Coherencia:
 *  - Las dos líneas (Nutracéuticos BVS y BVS Vet Shop) se comparan por las MISMAS
 *    dos métricas, ambas comparables: Revenue (€) y su Aporte a las ventas (peso de
 *    cada línea sobre el revenue total del negocio, en %, con variación en puntos).
 *  - Recurrencia = reparto de compradores del negocio (primerizos vs recurrentes)
 *    agregado sobre el rango, con su variación en puntos.
 */
import { useMonthlyMetrics, useBuyerCohorts, useCompradores } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const pctChange = (cur, prev) => (prev == null || prev === 0) ? null : ((cur - prev) / Math.abs(prev)) * 100;

/* Delta grande (junto al dato principal) */
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

/* Delta compacto en puntos porcentuales (para tasas) */
function DeltaPts({ pts, suffix }) {
  if (pts == null) return <span className="text-xs text-muted-foreground">— sin comparación</span>;
  const Icon = pts > 0 ? TrendingUp : pts < 0 ? TrendingDown : Minus;
  const color = pts > 0 ? "text-primary" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{pts > 0 ? "+" : ""}{pts.toFixed(1)} pts {suffix}
    </span>
  );
}

/* Fila secundaria con variación inline (% o pts) */
function Row({ label, value, pct, pts }) {
  const d = pts != null ? pts : pct;
  const up = d != null && d > 0;
  const col = d == null ? "text-muted-foreground/60" : up ? "text-primary" : "text-muted-foreground";
  const txt = d == null ? "—" : pts != null ? `${up ? "+" : ""}${pts.toFixed(1)} pts` : `${up ? "+" : ""}${pct.toFixed(0)}%`;
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-semibold text-foreground">{value}</span>
        <span className={`text-[11px] font-semibold ${col}`}>{txt}</span>
      </span>
    </div>
  );
}

export default function SaludResumen() {
  const { data: metrics = [] } = useMonthlyMetrics();
  const { data: compradores = [] } = useCompradores();
  const { data: cohorts = [] } = useBuyerCohorts();
  const { rangeA, rangeB, sumRange, labelRange } = useComparison();

  const cmp = `vs ${labelRange(rangeA)}`;

  // Revenue por línea, agregado sobre cada rango
  const nutraRevB = sumRange(metrics, rangeB, "revenue");
  const nutraRevA = sumRange(metrics, rangeA, "revenue");
  const vetRevB = sumRange(compradores, rangeB, "revenue");
  const vetRevA = sumRange(compradores, rangeA, "revenue");

  // Aporte a las ventas: peso de cada línea sobre el revenue total del negocio (siempre
  // definido, crezca o no). Su variación en puntos muestra el desplazamiento del mix.
  const combinedB = nutraRevB + vetRevB;
  const combinedA = nutraRevA + vetRevA;
  const nutraShareB = combinedB > 0 ? (nutraRevB / combinedB) * 100 : 0;
  const vetShareB = combinedB > 0 ? (vetRevB / combinedB) * 100 : 0;
  const nutraShareA = combinedA > 0 ? (nutraRevA / combinedA) * 100 : null;
  const vetShareA = combinedA > 0 ? (vetRevA / combinedA) * 100 : null;
  const nutraSharePts = nutraShareA == null ? null : nutraShareB - nutraShareA;
  const vetSharePts = vetShareA == null ? null : vetShareB - vetShareA;

  // Recurrencia del negocio, agregada sobre cada rango
  const recurB = sumRange(cohorts, rangeB, "recurring");
  const firstB = sumRange(cohorts, rangeB, "firstTime");
  const recurA = sumRange(cohorts, rangeA, "recurring");
  const firstA = sumRange(cohorts, rangeA, "firstTime");
  const totalB = recurB + firstB;
  const totalA = recurA + firstA;
  const recurPctB = totalB > 0 ? (recurB / totalB) * 100 : 0;
  const recurPctA = totalA > 0 ? (recurA / totalA) * 100 : null;
  const recurPts = recurPctA == null ? null : recurPctB - recurPctA;

  const hasData = nutraRevB > 0 || vetRevB > 0 || totalB > 0;

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      {!hasData ? (
        <p className="text-sm text-muted-foreground">Sin datos para el período seleccionado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Nutracéuticos BVS */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Nutracéuticos BVS · revenue</p>
            <p className="text-xl font-black">{fmtCurrency(nutraRevB)}</p>
            <Delta pct={pctChange(nutraRevB, nutraRevA)} suffix={cmp} />
            <div className="pt-2">
              <Row label="Aporte a las ventas" value={`${nutraShareB.toFixed(0)}%`} pts={nutraSharePts} />
            </div>
          </div>

          {/* BVS Vet Shop */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">BVS Vet Shop · revenue</p>
            <p className="text-xl font-black">{fmtCurrency(vetRevB)}</p>
            <Delta pct={pctChange(vetRevB, vetRevA)} suffix={cmp} />
            <div className="pt-2">
              <Row label="Aporte a las ventas" value={`${vetShareB.toFixed(0)}%`} pts={vetSharePts} />
            </div>
          </div>

          {/* Recurrencia — negocio completo */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recurrencia · negocio</p>
            {totalB > 0 ? (
              <>
                <p className="text-xl font-black">{recurPctB.toFixed(0)}% recurrentes</p>
                <DeltaPts pts={recurPts} suffix={cmp} />
                <div className="pt-2 space-y-1">
                  <Row label="Recurrentes" value={fmtNumber(recurB)} pct={pctChange(recurB, recurA)} />
                  <Row label="Primerizos" value={fmtNumber(firstB)} pct={pctChange(firstB, firstA)} />
                </div>
                <p className="text-[10px] text-muted-foreground/70 pt-1 leading-snug">
                  De los compradores del período, {recurPctB.toFixed(0)}% ya habían comprado antes.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sin datos de cohortes</p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
