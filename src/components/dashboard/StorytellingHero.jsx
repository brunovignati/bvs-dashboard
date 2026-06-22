import { motion } from "framer-motion";
import { useMonthlyMetrics, useBuyerCohorts, useCompradores } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import { BarChart3, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── helpers ───────────────────────────────────────────────
function sortByYearMonth(arr) {
  return [...arr].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );
}

function getLatestAndYoY(sorted) {
  if (!sorted.length) return { latest: null, yoy: null };
  const latest = sorted[sorted.length - 1];
  const yoy = sorted.find(
    (r) => r.year === latest.year - 1 && r.month === latest.month
  ) ?? null;
  return { latest, yoy };
}

function yoyDelta(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function Delta({ pct }) {
  if (pct === null || pct === undefined) return null;
  const positive = pct > 0;
  const color = positive ? "text-emerald-500" : pct === 0 ? "text-muted-foreground" : "text-rose-500";
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(pct).toFixed(1)}% vs año ant.
    </span>
  );
}

// ─── componente principal ───────────────────────────────────
export default function StorytellingHero() {
  const { data: metrics     = [] } = useMonthlyMetrics();   // Nutracéuticos BVS
  const { data: compradores = [] } = useCompradores();       // BVS Vet Shop
  const { data: cohorts     = [] } = useBuyerCohorts();      // AMBAS marcas

  // Nutracéuticos — mes más reciente y YoY
  const sortedMetrics = sortByYearMonth(metrics);
  const { latest: mLatest, yoy: mYoY } = getLatestAndYoY(sortedMetrics);

  const nutraRevenue    = mLatest?.revenue ?? 0;
  const nutraRevenuePct = yoyDelta(nutraRevenue, mYoY?.revenue);
  const nutraEmails     = mLatest?.emails_sent ?? 0;
  const nutraOpenRate   = mLatest?.open_rate ?? 0;
  const periodo = mLatest
    ? `${monthLabel(mLatest.month)} ${mLatest.year}`
    : "Cargando…";

  // BVS Vet Shop — mes más reciente y YoY
  const sortedComp = sortByYearMonth(compradores);
  const { latest: cLatest, yoy: cYoY } = getLatestAndYoY(sortedComp);

  const vetBuyers    = cLatest?.buyers ?? 0;
  const vetBuyersPct = yoyDelta(vetBuyers, cYoY?.buyers);
  const vetRevenue   = cLatest?.revenue ?? 0;
  const vetAvgTicket = vetBuyers > 0 ? vetRevenue / vetBuyers : 0;

  // Cohortes — mes más reciente (AMBAS marcas)
  const sortedCohorts = sortByYearMonth(cohorts);
  const { latest: coLatest } = getLatestAndYoY(sortedCohorts);
  const coTotal  = (coLatest?.firstTime ?? 0) + (coLatest?.recurring ?? 0);
  const recurPct = coTotal > 0 ? (coLatest.recurring / coTotal) * 100 : 0;

  const hasData = sortedMetrics.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-border p-6 md:p-8"
    >
      <div className="absolute top-4 right-4 opacity-10">
        <BarChart3 className="w-32 h-32" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
            Resumen · {periodo}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black font-heading tracking-tight mb-5">
          Panel de Analítica BVS
        </h1>

        {!hasData ? (
          <p className="text-sm text-muted-foreground">Cargando datos…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Bloque 1 — Nutracéuticos BVS */}
            <div className="rounded-xl bg-card/60 border border-border p-4 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Nutracéuticos BVS
              </p>
              <p className="text-xl font-black">{fmtCurrency(nutraRevenue)}</p>
              <Delta pct={nutraRevenuePct} />
              <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Emails enviados</span>
                  <span className="font-semibold text-foreground">{fmtNumber(nutraEmails)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tasa apertura</span>
                  <span className="font-semibold text-foreground">{nutraOpenRate.toFixed(1)}%</span>
                </div>
                {mYoY && (
                  <div className="flex justify-between">
                    <span>Revenue {monthLabel(mYoY.month)} {mYoY.year}</span>
                    <span className="font-semibold text-foreground">{fmtCurrency(mYoY.revenue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bloque 2 — BVS Vet Shop */}
            <div className="rounded-xl bg-card/60 border border-border p-4 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                BVS Vet Shop
              </p>
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
                {cYoY && (
                  <div className="flex justify-between">
                    <span>Compradores {monthLabel(cYoY.month)} {cYoY.year}</span>
                    <span className="font-semibold text-foreground">{fmtNumber(cYoY.buyers)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bloque 3 — Cohortes (ambas marcas) */}
            <div className="rounded-xl bg-card/60 border border-border p-4 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Recurrencia · ambas marcas
              </p>
              {coLatest ? (
                <>
                  <p className="text-xl font-black">{recurPct.toFixed(0)}% recurrentes</p>
                  <p className="text-[10px] text-muted-foreground">
                    {monthLabel(coLatest.month)} {coLatest.year}
                  </p>
                  <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Primerizos</span>
                      <span className="font-semibold text-foreground">{fmtNumber(coLatest.firstTime ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recurrentes</span>
                      <span className="font-semibold text-foreground">{fmtNumber(coLatest.recurring ?? 0)}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 pt-1">
                      Universo total BVS — Nutracéuticos + Vet Shop
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Sin datos de cohortes</p>
              )}
            </div>

          </div>
        )}

        {/* Footer — periodo cubierto */}
        {sortedMetrics.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Histórico Nutracéuticos</p>
              <p className="text-sm font-semibold">
                {monthLabel(sortedMetrics[0].month)} {sortedMetrics[0].year} –{" "}
                {monthLabel(mLatest.month)} {mLatest.year}
                {" "}({sortedMetrics.length} meses)
              </p>
            </div>
            {sortedComp.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Histórico Vet Shop</p>
                <p className="text-sm font-semibold">
                  {monthLabel(sortedComp[0].month)} {sortedComp[0].year} –{" "}
                  {monthLabel(cLatest.month)} {cLatest.year}
                  {" "}({sortedComp.length} meses)
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
    </motion.div>
  );
}
