/**
 * SaludResumen — resumen de negocio de UN mes (el período activo del comparador).
 * Las tres columnas (Nutracéuticos, Vet Shop, Recurrencia) son SIEMPRE del mismo mes,
 * con su variación vs. el mismo mes del año anterior. Sin fechas sueltas, sin rangos
 * históricos ni lista de canales (eso pertenece a otras vistas). Paleta de dos colores.
 */
import { useMonthlyMetrics, useBuyerCohorts, useCompradores } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const ymOf = (r) => r.year * 12 + r.month;
function sortByYM(arr) { return [...arr].sort((a, b) => ymOf(a) - ymOf(b)); }
function yoyDelta(cur, prev) { return (!prev || prev === 0) ? null : ((cur - prev) / Math.abs(prev)) * 100; }

function Delta({ pct }) {
  if (pct === null || pct === undefined) return null;
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color = pct > 0 ? "text-primary" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{Math.abs(pct).toFixed(1)}% vs año ant.
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}</span><span className="font-semibold text-foreground">{value}</span>
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
    return s.find(r => ymOf(r) === targetYM) ?? [...s].reverse().find(r => ymOf(r) <= targetYM) ?? s[s.length - 1] ?? null;
  };
  const yoyOf = (arr, row) => row ? (sortByYM(arr).find(r => r.year === row.year - 1 && r.month === row.month) ?? null) : null;

  const m = atPeriod(metrics);
  const mYoY = yoyOf(metrics, m);
  const c = atPeriod(compradores);
  const cYoY = yoyOf(compradores, c);
  const co = atPeriod(cohorts);

  const hasData = !!m;
  const periodo = `${monthLabel(periodEnd.month)} ${periodEnd.year}`;

  const nutraRev = m?.revenue ?? 0;
  const nutraTicket = m?.purchases > 0 ? nutraRev / m.purchases : (m?.avgPurchase ?? 0);
  const vetBuyers = c?.buyers ?? 0;
  const vetRev = c?.revenue ?? 0;
  const vetTicket = vetBuyers > 0 ? vetRev / vetBuyers : 0;
  const coTotal = (co?.firstTime ?? 0) + (co?.recurring ?? 0);
  const recurPct = coTotal > 0 ? (co.recurring / coTotal) * 100 : 0;

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">Resumen · {periodo}</p>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">Cargando datos…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Nutracéuticos BVS */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Nutracéuticos BVS</p>
            <p className="text-xl font-black">{fmtCurrency(nutraRev)}</p>
            <Delta pct={yoyDelta(nutraRev, mYoY?.revenue)} />
            <div className="pt-2 space-y-1">
              <Row label="Pedidos" value={fmtNumber(m?.purchases ?? 0)} />
              <Row label="Ticket medio" value={`€${nutraTicket.toFixed(0)}`} />
            </div>
          </div>

          {/* BVS Vet Shop */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">BVS Vet Shop</p>
            <p className="text-xl font-black">{fmtNumber(vetBuyers)} compradores</p>
            <Delta pct={yoyDelta(vetBuyers, cYoY?.buyers)} />
            <div className="pt-2 space-y-1">
              <Row label="Revenue atribuido" value={fmtCurrency(vetRev)} />
              {vetTicket > 0 && <Row label="Ticket medio" value={`€${vetTicket.toFixed(0)}`} />}
            </div>
          </div>

          {/* Recurrencia — ambas marcas (mismo mes) */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recurrencia · ambas marcas</p>
            {co ? (
              <>
                <p className="text-xl font-black">{recurPct.toFixed(0)}% recurrentes</p>
                <div className="pt-2 space-y-1">
                  <Row label="Primerizos" value={fmtNumber(co.firstTime ?? 0)} />
                  <Row label="Recurrentes" value={fmtNumber(co.recurring ?? 0)} />
                </div>
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
