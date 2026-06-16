import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMonthlyMetrics } from "@/lib/useEntities";
import { monthLabel } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import { TrendingUp } from "lucide-react";
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
         <span className="font-mono font-medium">€{Number(p.value).toLocaleString('es-ES')}</span>
       </div>
     ))}
   </div>
 );
};


export default function RevenueChart() {
 const { data: metrics = [] } = useMonthlyMetrics();
 const sorted = [...metrics].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
 const chartData = sorted.map(d => ({
   name: `${monthLabel(d.month)} ${d.year}`,
   Revenue: Math.round(d.revenue),
   Compras: d.purchases,
 }));


 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.2 }}
     className="bg-card border border-border rounded-2xl p-5"
   >
     <SectionHeader
       title="Evolución Revenue BVS Vet Shop"
       subtitle="Ingresos mensuales · datos en tiempo real"
       icon={TrendingUp}
     />
     <div className="h-72">
       <ResponsiveContainer width="100%" height="100%">
         <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
           <defs>
             <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.3} />
               <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
             </linearGradient>
           </defs>
           <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
           <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
           <YAxis tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
           <Tooltip content={<CustomTooltip />} />
           <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
           <Area type="monotone" dataKey="Revenue" stroke="hsl(217,91%,60%)" fill="url(#revGrad)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(217,91%,60%)' }} />
         </AreaChart>
       </ResponsiveContainer>
     </div>
   </motion.div>
 );
}