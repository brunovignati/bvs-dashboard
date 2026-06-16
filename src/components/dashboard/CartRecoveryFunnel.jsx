import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useCartAbandonment } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";


const CustomTooltip = ({ active, payload, label }) => {
 if (!active || !payload?.length) return null;
 return (
   <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
     <p className="text-xs font-semibold mb-1.5">{label}</p>
     {payload.map((p, i) => (
       <div key={i} className="flex items-center gap-2 text-xs">
         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
         <span className="text-muted-foreground">{p.name}:</span>
         <span className="font-mono font-medium">{typeof p.value === 'number' ? p.value.toLocaleString('es-ES') : p.value}</span>
       </div>
     ))}
   </div>
 );
};


export default function CartRecoveryFunnel() {
 const { data: cartAbandonment = [] } = useCartAbandonment();
 const may = cartAbandonment.filter(d => d.month === 5).sort((a, b) => a.emailName.localeCompare(b.emailName));
 const jun = cartAbandonment.filter(d => d.month === 6).sort((a, b) => a.emailName.localeCompare(b.emailName));


 const funnelData = [
   { step: "CA1 - May", Enviados: may[0]?.sent || 0, Aperturas: may[0]?.opens || 0, Clics: may[0]?.clicks || 0, Compras: may[0]?.purchases || 0 },
   { step: "CA2 - May", Enviados: may[1]?.sent || 0, Aperturas: may[1]?.opens || 0, Clics: may[1]?.clicks || 0, Compras: may[1]?.purchases || 0 },
   { step: "CA3 - May", Enviados: may[2]?.sent || 0, Aperturas: may[2]?.opens || 0, Clics: may[2]?.clicks || 0, Compras: may[2]?.purchases || 0 },
   { step: "CA1 - Jun", Enviados: jun[0]?.sent || 0, Aperturas: jun[0]?.opens || 0, Clics: jun[0]?.clicks || 0, Compras: jun[0]?.purchases || 0 },
   { step: "CA2 - Jun", Enviados: jun[1]?.sent || 0, Aperturas: jun[1]?.opens || 0, Clics: jun[1]?.clicks || 0, Compras: jun[1]?.purchases || 0 },
   { step: "CA3 - Jun", Enviados: jun[2]?.sent || 0, Aperturas: jun[2]?.opens || 0, Clics: jun[2]?.clicks || 0, Compras: jun[2]?.purchases || 0 },
 ];


 // Conversion rates per step
 const convRates = cartAbandonment.map(d => ({
   name: d.emailName.replace('V! ', '').replace(' - Carrito abandonado para Todos', ''),
   month: d.month === 5 ? 'May' : 'Jun',
   openRate: d.sent > 0 ? ((d.opens / d.sent) * 100).toFixed(1) : '–',
   ctr: d.sent > 0 ? ((d.clicks / d.sent) * 100).toFixed(2) : '–',
   convRate: d.clicks > 0 ? ((d.purchases / d.clicks) * 100).toFixed(1) : '–',
   revenue: fmtCurrency(d.revenue),
 }));


 const totalRevenue = cartAbandonment.reduce((s, d) => s + d.revenue, 0);
 const totalPurchases = cartAbandonment.reduce((s, d) => s + d.purchases, 0);


 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.35 }}
     className="bg-card border border-border rounded-2xl p-5"
   >
     <SectionHeader
       title="Funnel de Carritos Abandonados"
       subtitle={`May–Jun 2026 · ${fmtNumber(totalPurchases)} compras · ${fmtCurrency(totalRevenue)} revenue`}
       icon={ShoppingCart}
       badge="Funnel"
     />


     <div className="h-56 mb-4">
       <ResponsiveContainer width="100%" height="100%">
         <BarChart data={funnelData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
           <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
           <XAxis dataKey="step" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
           <YAxis tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
           <Tooltip content={<CustomTooltip />} />
           <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
           <Bar dataKey="Enviados" fill="hsl(220,14%,80%)" radius={[3, 3, 0, 0]} />
           <Bar dataKey="Aperturas" fill="hsl(217,91%,60%)" radius={[3, 3, 0, 0]} />
           <Bar dataKey="Compras" fill="hsl(160,84%,39%)" radius={[3, 3, 0, 0]} />
         </BarChart>
       </ResponsiveContainer>
     </div>


     {/* Conversion metrics */}
     <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
       {convRates.map((cr, i) => (
         <div key={i} className="p-3 bg-muted/50 rounded-xl text-center">
           <p className="text-[10px] text-muted-foreground uppercase">{cr.name} · {cr.month}</p>
           <p className="text-sm font-bold font-heading mt-1">{cr.convRate}%</p>
           <p className="text-[10px] text-muted-foreground">clic → compra</p>
           <p className="text-xs font-mono text-primary mt-0.5">{cr.revenue}</p>
         </div>
       ))}
     </div>


     <InsightCard
       type="success"
       title="Secuencia CA Altamente Efectiva"
       description={`CA1 convierte al ${convRates[0]?.convRate}% clic→compra. La secuencia completa recupera ${fmtCurrency(totalRevenue)} con un ticket medio de €${(totalRevenue / totalPurchases).toFixed(0)}. La persistencia del CA3 demuestra que el tercer recordatorio aún genera valor incremental.`}
     />
   </motion.div>
 );
}