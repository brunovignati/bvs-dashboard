import KPICard from "./KPICard";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import { useEmailCampaigns, useCartAbandonment, useBuyerCohorts, useMonthlyMetrics } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { Mail, ShoppingCart, Users, DollarSign, Target, Repeat } from "lucide-react";


export default function OverviewKPIs() {
 const { periodB } = useComparison();
 const { data: emailCampaigns = [] } = useEmailCampaigns();
 const { data: cartData = [] } = useCartAbandonment();
 const { data: cohorts = [] } = useBuyerCohorts();
 const { data: metrics = [] } = useMonthlyMetrics();


 const emailsWithData = emailCampaigns.filter(e => e.emailName && e.sent > 0);
 const totalSent = emailsWithData.reduce((s, e) => s + e.sent, 0);
 const totalOpens = emailsWithData.reduce((s, e) => s + e.opens, 0);
 const totalClicks = emailsWithData.reduce((s, e) => s + e.clicks, 0);
 const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
 const clickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0;

 // Rango de fechas dinámico de email_campaigns
 const emailsSorted = [...emailCampaigns]
   .filter(e => e.year && e.month)
   .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
 const firstEmail = emailsSorted[0];
 const lastEmail  = emailsSorted[emailsSorted.length - 1];
 const emailDateRange = firstEmail && lastEmail
   ? firstEmail.year === lastEmail.year && firstEmail.month === lastEmail.month
     ? `${monthLabel(firstEmail.month)} ${firstEmail.year}`
     : `${monthLabel(firstEmail.month)} ${firstEmail.year} – ${monthLabel(lastEmail.month)} ${lastEmail.year}`
   : 'Sin datos';


 const sorted = [...metrics].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
 const latest = sorted[sorted.length - 1];
 // Usar periodB del contexto si hay datos para ese mes, si no caer al último mes disponible
 const current = sorted.find(m => m.year === periodB.year && m.month === periodB.month) || latest;
 const currentIdx = sorted.indexOf(current);
 const prev = currentIdx > 0 ? sorted[currentIdx - 1] : null;
 const revTrend = prev && current ? ((current.revenue - prev.revenue) / prev.revenue) * 100 : 0;
 const periodLabel = current ? `${monthLabel(current.month)} ${current.year}` : 'Último mes';


 const cohortsSorted = [...cohorts].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
 const latestCohort = cohortsSorted[cohortsSorted.length - 1];
 const recurringPct = latestCohort ? (latestCohort.recurring / (latestCohort.firstTime + latestCohort.recurring)) * 100 : 0;


 const cartTotal = cartData.reduce((s, c) => s + c.revenue, 0);
 const cartPurchases = cartData.reduce((s, c) => s + c.purchases, 0);


 return (
   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
     <KPICard
       title="Emails Enviados"
       value={fmtNumber(totalSent)}
       subtitle={emailDateRange}
       icon={Mail}
     />
     <KPICard
       title="Tasa Apertura"
       value={`${openRate.toFixed(1)}%`}
       subtitle={`${fmtNumber(totalOpens)} aperturas únicas`}
       icon={Target}
       accentClass="text-emerald-500"
     />
     <KPICard
       title="CTR Global"
       value={`${clickRate.toFixed(2)}%`}
       subtitle={`${fmtNumber(totalClicks)} clics únicos`}
       icon={Target}
       accentClass="text-amber-500"
     />
     <KPICard
       title={`Revenue ${periodLabel}`}
       value={fmtCurrency(current?.revenue || 0)}
       subtitle={`${fmtNumber(current?.purchases || 0)} compras`}
       trend={revTrend}
       trendLabel="vs mes anterior"
       icon={DollarSign}
       accentClass="text-primary"
     />
     <KPICard
       title="Recurrencia"
       value={`${recurringPct.toFixed(0)}%`}
       subtitle={`${fmtNumber(latestCohort?.recurring || 0)} recurrentes`}
       icon={Repeat}
       accentClass="text-violet-500"
     />
     <KPICard
       title="Carrito Recuperado"
       value={fmtCurrency(cartTotal)}
       subtitle={`${cartPurchases} compras`}
       icon={ShoppingCart}
       accentClass="text-orange-500"
     />
   </div>
 );
}