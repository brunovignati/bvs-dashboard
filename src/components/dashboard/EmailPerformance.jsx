import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import { useEmailCampaigns } from "@/lib/useEntities";
import SectionHeader from "./SectionHeader";
import MiniTable from "./MiniTable";
import InsightCard from "./InsightCard";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";


export default function EmailPerformance() {
 const { data: emailData = [] } = useEmailCampaigns();
 const campaigns = emailData
   .filter(e => e.emailName && e.sent > 0)
   .sort((a, b) => b.revenue - a.revenue)
   .slice(0, 12);


 const columns = [
   {
     key: "emailName",
     label: "Campaña",
     bold: true,
     render: (v) => (
       <div className="max-w-[200px] truncate text-xs" title={v}>{v}</div>
     ),
   },
   {
     key: "month",
     label: "Mes",
     render: (v) => (
       <Badge variant="outline" className="text-[10px] font-mono">
         {monthLabel(v)}
       </Badge>
     ),
   },
   {
     key: "sent",
     label: "Enviados",
     align: "right",
     render: (v) => fmtNumber(v),
   },
   {
     key: "openRate",
     label: "Open Rate",
     align: "right",
     render: (_, row) => {
       const rate = row.sent > 0 ? (row.opens / row.sent) * 100 : 0;
       return (
         <span className={rate > 45 ? "text-emerald-500 font-semibold" : ""}>
           {rate.toFixed(1)}%
         </span>
       );
     },
   },
   {
     key: "ctr",
     label: "CTR",
     align: "right",
     render: (_, row) => {
       const rate = row.sent > 0 ? (row.clicks / row.sent) * 100 : 0;
       return `${rate.toFixed(2)}%`;
     },
   },
   {
     key: "purchases",
     label: "Compras",
     align: "right",
     render: (v) => fmtNumber(v),
   },
   {
     key: "revenue",
     label: "Revenue",
     align: "right",
     render: (v) => fmtCurrency(v),
   },
   {
     key: "rpc",
     label: "Rev/Compra",
     align: "right",
     render: (_, row) => {
       const rpc = row.purchases > 0 ? row.revenue / row.purchases : 0;
       return `€${rpc.toFixed(0)}`;
     },
   },
 ];


 // Top cart abandonment vs newsletter insight
 const cartEmails = campaigns.filter(e => e.emailWorkflow?.includes('Carrito'));
 const newsletterEmails = campaigns.filter(e => !e.emailWorkflow?.includes('Carrito'));
 const cartRevenue = cartEmails.reduce((s, e) => s + e.revenue, 0);
 const nlRevenue = newsletterEmails.reduce((s, e) => s + e.revenue, 0);


 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.25 }}
   >
     <SectionHeader
       title="Rendimiento Email Marketing"
       subtitle="Top campañas por revenue · Feb-Mar 2026"
       icon={Mail}
       badge="Email"
     />


     <MiniTable columns={columns} data={campaigns} maxRows={12} />


     <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
       <InsightCard
         type="success"
         title="Carritos Abandonados: Motor de Revenue"
         description={`Los emails de carrito abandonado generan ${fmtCurrency(cartRevenue)} con tasas de apertura superiores al 50%. La secuencia CA1→CA2→CA3 muestra un funnel efectivo con decay natural.`}
       />
       <InsightCard
         type="info"
         title="Newsletters vs Automation"
         description={`Las newsletters masivas generan ${fmtCurrency(nlRevenue)} pero con CTR más bajo (~1.1%). Optimizar CTA y personalización podría mejorar la conversión significativamente.`}
       />
     </div>
   </motion.div>
 );
}