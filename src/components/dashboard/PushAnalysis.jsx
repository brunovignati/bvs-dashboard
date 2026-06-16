import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { usePushCampaigns } from "@/lib/useEntities";
import SectionHeader from "./SectionHeader";
import MiniTable from "./MiniTable";
import InsightCard from "./InsightCard";
import KPICard from "./KPICard";
import { Bell, Send, Target } from "lucide-react";
import { motion } from "framer-motion";


export default function PushAnalysis() {
 const { data: pushCampaigns = [] } = usePushCampaigns();
 const columns = [
   {
     key: "workflow",
     label: "Campaña",
     bold: true,
     render: (v) => <div className="max-w-[180px] truncate text-xs" title={v}>{v}</div>,
   },
   { key: "sent", label: "Enviados", align: "right", render: (v) => fmtNumber(v) },
   { key: "opens", label: "Aperturas", align: "right", render: (v) => fmtNumber(v) },
   {
     key: "openRate",
     label: "Open Rate",
     align: "right",
     render: (_, row) => {
       const rate = row.sent > 0 ? (row.opens / row.sent) * 100 : 0;
       return <span className={rate > 50 ? "text-emerald-500 font-semibold" : ""}>{rate.toFixed(1)}%</span>;
     },
   },
   { key: "clicks", label: "Clics", align: "right", render: (v) => fmtNumber(v) },
   { key: "purchases", label: "Compras", align: "right", render: (v) => fmtNumber(v) },
   { key: "revenue", label: "Revenue", align: "right", render: (v) => fmtCurrency(v) },
 ];


 const totalPushRevenue = pushCampaigns.reduce((s, d) => s + d.revenue, 0);
 const totalPushPurchases = pushCampaigns.reduce((s, d) => s + d.purchases, 0);
 const totalPushSent = pushCampaigns.reduce((s, d) => s + d.sent, 0);
 const convRate = totalPushSent > 0 ? (totalPushPurchases / totalPushSent * 100) : 0;


 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.55 }}
   >
     <SectionHeader
       title="Rendimiento Push Notifications"
       subtitle="Marzo 2026 · Análisis de campañas push"
       icon={Bell}
       badge="Push"
     />


     <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
       <KPICard
         title="Push Enviados"
         value={fmtNumber(totalPushSent)}
         subtitle="Total campañas"
         icon={Send}
       />
       <KPICard
         title="Compras Atribuidas"
         value={fmtNumber(totalPushPurchases)}
         subtitle="Feb-Mar 2026"
         icon={Target}
         accentClass="text-emerald-500"
       />
       <KPICard
         title="Revenue Push"
         value={fmtCurrency(totalPushRevenue)}
         subtitle="Feb-Mar 2026"
         icon={Bell}
         accentClass="text-amber-500"
       />
       <KPICard
         title="Conv. Rate"
         value={`${convRate.toFixed(3)}%`}
         subtitle="envío → compra"
         icon={Target}
         accentClass="text-violet-500"
       />
     </div>


     <MiniTable columns={columns} data={pushCampaigns} maxRows={10} />


     <div className="mt-4">
       <InsightCard
         type="warning"
         title="Push: Alto Alcance, Baja Conversión"
         description={`Con ~96K envíos y solo 37 compras atribuidas (${convRate.toFixed(3)}%), las push notifications tienen un ROI muy bajo comparado con email. El open rate es alto (~52%) pero el CTR es mínimo (~0.5%). Se recomienda: 1) Mensajes más personalizados, 2) Deep links a producto específico, 3) Reducir frecuencia para evitar fatiga.`}
       />
     </div>
   </motion.div>
 );
}