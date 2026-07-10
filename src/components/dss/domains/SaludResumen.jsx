/**
 * SaludResumen — resumen de negocio de un vistazo para la sección "Salud del Negocio".
 * Solo métricas de nivel negocio (revenue, compradores, recurrencia). Las métricas de
 * canal/campaña viven en Marketing; las de flujos en Automatizaciones. Sin branding,
 * sin decoración y con la paleta de dos colores (caídas en neutro, no en rojo).
 */
import { useMonthlyMetrics, useBuyerCohorts, useCompradores } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function sortByYearMonth(arr) {
  return [...arr].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
}

function yoyDelta(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Paleta de dos colores: subida = predominante (azul), bajada = neutro. Sin rojo.
function Delta({ pct }) {
  if (pct === null || pct === undefined) return null;
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color = pct > 0 ? "text-primary" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(pct).toFixed(1)}% vs año ant.
    </span>
  );
}

export default function SaludResumen() {
  const { data: metrics = [] } = useMonthlyMetrics();   // Nutracéuticos BVS
  const { data: compradores = [] } = useCompradores();  // BVS Vet Shop
  const { data: cohorts = [] } = useBuyerCohorts();     // ambas marcas
  const { periodEnd } = useComparison();

  // Nutracéuticos — mes activo con fallback al último disponible
  const sortedMetrics = sortByYearMonth(metrics);
  const mLatest = sortedMetrics.find(r => r.year === periodEnd.year && r.month === periodEnd.month)
    ?? sortedMetrics[sortedMetrics.length - 1] ?? null;
  const mYoY = sortedMetrics.find(r => r.year === (mLatest?.year ?? 0) - 1 && r.month === (mLatest?.month ?? 0)) ?? null;
  const nutraRevenue = mLatest?.revenue ?? 0;
  const nutraRevenuePct = yoyDelta(nutraRevenue, mYoY?.revenue);
  const periodo = mLatest ? `${monthLabel(mLatest.month)} ${mLatest.year}` : "Cargando…";

  // BVS Vet Shop
  const sortedComp = sortByYearMonth(compradores);
  const cLatest = sortedComp.find(r => r.year === periodEnd.year && r.month === periodEnd.month)
    ?? sortedComp[sortedComp.length - 1] ?? null;
  const cYoY = sortedComp.find(r => r.year === (cLatest?.year ?? 0) - 1 && r.month === (cLatest?.month ?? 0)) ?? null;
  const vetBuyers = cLatest?.buyers ?? 0;
  const vetBuyersPct = yoyDelta(vetBuyers, cYoY?.buyers);
  const vetRevenue = cLatest?.revenue ?? 0;
  const vetAvgTicket = vetBuyers > 0 ? vetRevenue / vetBuyers : 0;

  // Recurrencia (ambas marcas)
  const sortedCohorts = sortByYearMonth(cohorts);
  const coLatest = sortedCohorts[sortedCohorts.length - 1] ?? null;
  const coTotal = (coLatest?.firstTime ?? 0) + (coLatest?.recurring ?? 0);
  const recurPct = coTotal > 0 ? (coLatest.recurring / coTotal) * 100 : 0;

  const hasData = sortedMetrics.length > 0;

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">
        Resumen · {periodo}
      </p>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">Cargando datos…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Nutracéuticos BVS */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Nutracéuticos BVS</p>
            <p className="text-xl font-black">{fmtCurrency(nutraRevenue)}</p>
            <Delta pct={nutraRevenuePct} />
            {mYoY && (
              <div className="pt-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Revenue {monthLabel(mYoY.month)} {mYoY.year}</span>
                  <span className="font-semibold text-foreground">{fmtCurrency(mYoY.revenue)}</span>
                </div>
              </div>
            )}
          </div>

          {/* BVS Vet Shop */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">BVS Vet Shop</p>
            <p className="text-xl font-black">{fmtNumber(vetBuyers)} compradores</p>
            <Delta pct={vetBuyersPct} />
            <div className="pt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Revenue atribuido</span>
                <span className="font-semibold text-foreground">{fmtCurrency(vetRevenue)}</span>
              </div>
              {vetAvgTicket > 0 && (
                <div className="flex justify-between">
                  <span>Ticket medio</span>
                  <span className="font-semibold text-foreground">€{vetAvgTicket.toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recurrencia — ambas marcas */}
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recurrencia · ambas marcas</p>
            {coLatest ? (
              <>
                <p className="text-xl font-black">{recurPct.toFixed(0)}% recurrentes</p>
                <p className="text-[10px] text-muted-foreground">{monthLabel(coLatest.month)} {coLatest.year}</p>
                <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Primerizos</span>
                    <span className="font-semibold text-foreground">{fmtNumber(coLatest.firstTime ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recurrentes</span>
                    <span className="font-semibold text-foreground">{fmtNumber(coLatest.recurring ?? 0)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sin datos de cohortes</p>
            )}
          </div>

        </div>
      )}

      {/* Histórico cubierto — informativo */}
      {sortedMetrics.length > 1 && mLatest && (
        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Histórico Nutracéuticos</p>
            <p className="text-sm font-semibold">
              {monthLabel(sortedMetrics[0].month)} {sortedMetrics[0].year} – {monthLabel(mLatest.month)} {mLatest.year} ({sortedMetrics.length} meses)
            </p>
          </div>
          {sortedComp.length > 0 && cLatest && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Histórico Vet Shop</p>
              <p className="text-sm font-semibold">
                {monthLabel(sortedComp[0].month)} {sortedComp[0].year} – {monthLabel(cLatest.month)} {cLatest.year} ({sortedComp.length} meses)
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Canales</p>
            <p className="text-sm font-semibold">Email · Push · Web · Sticky</p>
          </div>
        </div>
      )}
    </div>
  );
}
