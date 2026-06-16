import { motion } from "framer-motion";
import { useMonthlyMetrics, useCartAbandonment, useBuyerCohorts, useCompradores } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { BarChart3, Sparkles } from "lucide-react";

export default function StorytellingHero() {
  // ✅ MIGRADO: datos reales de Supabase
  const { data: metrics       = [] } = useMonthlyMetrics();
  const { data: cartData      = [] } = useCartAbandonment();
  const { data: cohorts       = [] } = useBuyerCohorts();
  const { data: compradores   = [] } = useCompradores();

  const totalRevenue = metrics.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalBuyers  = compradores.reduce((s, d) => s + (d.buyers || 0), 0);
  const avgTicket    = totalBuyers > 0 ? totalRevenue / totalBuyers : 0;

  const sortedCohorts = [...cohorts].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  const latestCohort  = sortedCohorts[sortedCohorts.length - 1];
  const recurringPct  = latestCohort
    ? (latestCohort.recurring / ((latestCohort.firstTime || 0) + latestCohort.recurring)) * 100
    : 0;

  const cartRevenue = cartData.reduce((s, c) => s + (c.revenue || 0), 0);

  const sortedMetrics = [...metrics].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  const firstMonth = sortedMetrics[0];
  const lastMonth  = sortedMetrics[sortedMetrics.length - 1];
  const periodo = firstMonth && lastMonth
    ? `${firstMonth.month}/${firstMonth.year} – ${lastMonth.month}/${lastMonth.year}`
    : 'Cargando...'

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
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">Data Storytelling</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black font-heading tracking-tight mb-2">
          Panel de Analítica Avanzada
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-6">
          Tu ecosistema de marketing generó{' '}
          <span className="font-bold text-foreground">{fmtCurrency(totalRevenue)}</span> en revenue
          {totalBuyers > 0 && <> con <span className="font-bold text-foreground">{fmtNumber(totalBuyers)}</span> compradores únicos</>},
          {avgTicket > 0 && <> un ticket medio de <span className="font-bold text-foreground">€{avgTicket.toFixed(0)}</span></>},
          {recurringPct > 0 && <> y una tasa de recurrencia del <span className="font-bold text-foreground">{recurringPct.toFixed(0)}%</span></>}.
          {cartRevenue > 0 && <> Los carritos abandonados recuperaron <span className="font-bold text-foreground">{fmtCurrency(cartRevenue)}</span> adicionales.</>}
        </p>

        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Periodo Analizado</p>
            <p className="text-sm font-semibold">{periodo}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Meses de Datos</p>
            <p className="text-sm font-semibold">{metrics.length} meses integrados</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Canales</p>
            <p className="text-sm font-semibold">Email · Push · Web · Sticky</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
