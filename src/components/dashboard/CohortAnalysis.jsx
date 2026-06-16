import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useBuyerCohorts } from "@/lib/useEntities";
import { monthLabel } from "@/lib/dashboardData";


const CustomTooltip = ({ active, payload, label }) => {
 if (!active || !payload?.length) return null;
 return (
   <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
     <p className="text-xs font-semibold mb-1.5">{label}</p>
     {payload.map((p, i) => (
       <div key={i} className="flex items-center gap-2 text-xs">
         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
         <span className="text-muted-foreground">{p.name}:</span>
         <span className="font-mono font-medium">{Number(p.value).toLocaleString('es-ES')}</span>
       </div>
     ))}
   </div>
 );
};
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Users } from "lucide-react";
import { motion } from "framer-motion";


export default function CohortAnalysis() {
 const { data: buyerCohorts = [] } = useBuyerCohorts();
 const sorted = [...buyerCohorts].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
 const data = sorted.map(d => ({
   name: `${monthLabel(d.month)} ${d.year}`,
   Primerizos: d.firstTime,
   Recurrentes: d.recurring,
   total: d.firstTime + d.recurring,
   recurringPct: ((d.recurring / (d.firstTime + d.recurring)) * 100).toFixed(1),
 }));


 if (data.length === 0) return null;


 const avgRecurring = data.reduce((s, d) => s + parseFloat(d.recurringPct), 0) / data.length;
 const latestPct = parseFloat(data[data.length - 1].recurringPct);
 const firstPct = parseFloat(data[0].recurringPct);
 const trendDirection = latestPct > firstPct ? "mejorando" : "decayendo";


 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.3 }}
     className="bg-card border border-border rounded-2xl p-5"
   >
     <SectionHeader
       title="Análisis de Cohortes"
       subtitle="Primerizos vs Recurrentes · Dic 2025 – Mar 2026"
       icon={Users}
       badge="Cohorte"
     />


     <div className="h-64 mb-4">
       <ResponsiveContainer width="100%" height="100%">
         <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
           <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
           <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
           <YAxis tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
           <Tooltip content={<CustomTooltip />} />
           <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
           <Bar dataKey="Primerizos" stackId="a" fill="hsl(217,91%,60%)" radius={[0, 0, 0, 0]} />
           <Bar dataKey="Recurrentes" stackId="a" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} />
         </BarChart>
       </ResponsiveContainer>
     </div>


     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
       {data.map((d, i) => (
         <div key={i} className="text-center p-3 bg-muted/50 rounded-xl">
           <p className="text-xs text-muted-foreground">{d.name}</p>
           <p className="text-lg font-bold font-heading">{d.recurringPct}%</p>
           <p className="text-[10px] text-muted-foreground">recurrencia</p>
         </div>
       ))}
       <div className="text-center p-3 bg-primary/10 rounded-xl">
         <p className="text-xs text-muted-foreground">Promedio</p>
         <p className="text-lg font-bold font-heading text-primary">{avgRecurring.toFixed(1)}%</p>
         <p className="text-[10px] text-muted-foreground">{trendDirection}</p>
       </div>
     </div>


     <div className="mt-4">
       <InsightCard
         type={latestPct > 75 ? "success" : "warning"}
         title="Análisis de Retención"
         description={`La tasa de recurrencia promedio es ${avgRecurring.toFixed(1)}%. El ratio está ${trendDirection} desde ${firstPct}% a ${latestPct}%. Los compradores recurrentes representan ~${latestPct}% del total, indicando una base de clientes leal.`}
       />
     </div>
   </motion.div>
 );
}