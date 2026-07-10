/**
 * SaludResumen — estado del negocio de UN mes (el período activo del comparador),
 * comparado SIEMPRE contra el mismo mes del año anterior (YoY).
 *
 * Coherencia (reglas):
 *  - Las dos líneas de negocio (Nutracéuticos BVS y BVS Vet Shop) se comparan por la
 *    ÚNICA métrica común y homogénea: Revenue. Es lo que las hace comparables.
 *  - CADA cifra muestra su variación YoY (sube/baja); ninguna cifra va "suelta".
 *  - La métrica secundaria de cada línea es la que su fuente registra de verdad
 *    (Nutracéuticos → pedidos; Vet Shop → compradores). No se fuerza equivalencia falsa.
 *  - Recurrencia = reparto de compradores del mes entre primerizos y recurrentes,
 *    del negocio completo, con su variación en puntos.
 */
import { useMonthlyMetrics, useBuyerCohorts, useCompradores } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const ymOf = (r) => r.year * 12 + r.month;
const sortByYM = (arr) => [...arr].sort((a, b) => ymOf(a) - ymOf(b));
const yoyDelta = (cur, prev) => (prev == null || prev === 0) ? null : ((cur - prev) / Math.abs(prev)) * 100;

/* Delta grande (junto al dato principal) */
function Delta({ pct, suffix = "vs año ant." }) {
  if (pct == null) return <span className="text-xs text-muted-foreground">— sin año anterior</span>;
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color = pct > 0 ? "text-primary" : pct < 0 ? "text-muted-foreground" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{pct > 0 ? "+" : ""}{pct.toFixed(1)}% {suffix}
    </span>
  );
}

/* Delta compacto en puntos porcentuales (para tasas) */
function DeltaPts({ pts }) {
  if (pts == null) return <span className="text-xs text-muted-foreground">— sin año anterior</span>;
  const Icon = pts > 0 ? TrendingUp : pts < 0 ? TrendingDown : Minus;
  const color = pts > 0 ? "text-primary" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{pts > 0 ? "+" : ""}{pts.toFixed(1)} pts vs año ant.
    </span>
  );
}

/* Fila secundaria: etiqueta · valor · variación YoY inline */
function Row({ label, value, pct }) {
  const up = pct != null && pct > 0;
  const col = pct == null ? "text-muted-foreground/60" : up ? "text-primary" : "text-muted-foreground";
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-semibold text-foreground">{value}</span>
        <span className={`text-[11px] font-semibold ${col}`}>
          {pct == null ? "—" : `${up ? "+" : ""}${pct.toFixed(0)}%`}
        </span>
      </span>
    </div>
  );
}

export default function SaludResumen() {
  const { data: metrics = [] } = useMonthlyMetrics();
  const { data: compradores = [] } = useCompradores();
  const { data: cohorts = [] } = useBuyerCohorts();
  const { periodEnd } = useComparison();
  const targetYM = periodEnd.year * 12 + periodEnd.month;

  // Fila del mes activo (o el último mes disponible ≤ activo) — coherencia entre columnas.
  const atPeriod = (arr) => {
    const s = sortByYM(arr);
    return s.find((r) => ymOf(r) === targetYM) ?? [...s].reverse().find((r) => ymOf(r) <= targetYM) ?? s[s.length - 1] ?? null;
  };
  const yoyOf = (arr, row) => row ? (sortByYM(arr).find((r) => r.year === row.year - 1 && r.month === row.month) ?? null) : null;

  const m = atPeriod(metrics);
  const mYoY = yoyOf(metrics, m);
  const c = atPeriod(compradores);
  const cYoY = yoyOf(compradores, c);
  const co = atPeriod(cohorts);
  const coYoY = yoyOf(cohorts, co);

  const hasData = !!m || !!c;

  // El mes activo puede diferir del último disponible por línea: rotula el mes real.
  const baseRow = m || c || co;
  const periodo = baseRow ? `${monthLabel(baseRow.month)} ${baseRow.year}` : `${monthLabel(periodEnd.month)} ${periodEnd.year}`;
  const refPeriodo = baseRow ? `${monthLabel(baseRow.month)} ${baseRow.year - 1}` : "año ant.";

  // Nutracéuticos
  const nutraRev = m?.revenue ?? 0;
  const nutraOrders = m?.purchases ?? 0;
  const nutraRevYoY = yoyDelta(nutraRev, mYoY?.revenue);
  const nutraOrdersYoY = yoyDelta(nutraOrders, mYoY?.purchases);

  // Vet Shop
  const vetRev = c?.revenue ?? 0;
  const vetBuyers = c?.buyers ?? 0;
  const vetRevYoY = yoyDelta(vetRev, cYoY?.revenue);
  const vetBuyersYoY = yoyDelta(vetBuyers, cYoY?.buyers);

  // Recurrencia
  const coTotal = (co?.firstTime ?? 0) + (co?.recurring ?? 0);
  const recurPct = coTotal > 0 ? (co.recurring / coTotal) * 100 : 0;
  const coYoYTotal = (coYoY?.firstTime ?? 0) + (coYoY?.recurring ?? 0);
  const recurPctYoY = coYoYTotal > 0 ? (coYoY.recurring / coYoYTotal) * 100 : null;
  const recurPtsDelta = recurPctYoY == null ? null : recurPct - recurPctYoY;

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Resumen · {periodo}</p>
        <p className="text-[10px] text-muted-foreground/70">variación vs {refPeriodo}</p>
      </div>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">Cargando datos…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Nutracéuticos BVS — comparable por Revenue */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Nutracéuticos BVS · revenue</p>
            <p className="text-xl font-black">{fmtCurrency(nutraRev)}</p>
            <Delta pct={nutraRevYoY} />
            <div className="pt-2">
              <Row label="Pedidos" value={fmtNumber(nutraOrders)} pct={nutraOrdersYoY} />
            </div>
          </div>

          {/* BVS Vet Shop — comparable por Revenue */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">BVS Vet Shop · revenue</p>
            <p className="text-xl font-black">{fmtCurrency(vetRev)}</p>
            <Delta pct={vetRevYoY} />
            <div className="pt-2">
              <Row label="Compradores" value={fmtNumber(vetBuyers)} pct={vetBuyersYoY} />
            </div>
          </div>

          {/* Recurrencia — negocio completo */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recurrencia · negocio</p>
            {co ? (
              <>
                <p className="text-xl font-black">{recurPct.toFixed(0)}% recurrentes</p>
                <DeltaPts pts={recurPtsDelta} />
                <div className="pt-2 space-y-1">
                  <Row label="Recurrentes" value={fmtNumber(co.recurring ?? 0)} pct={yoyDelta(co.recurring ?? 0, coYoY?.recurring)} />
                  <Row label="Primerizos" value={fmtNumber(co.firstTime ?? 0)} pct={yoyDelta(co.firstTime ?? 0, coYoY?.firstTime)} />
                </div>
                <p className="text-[10px] text-muted-foreground/70 pt-1 leading-snug">
                  De los compradores del mes, {recurPct.toFixed(0)}% ya habían comprado antes.
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
