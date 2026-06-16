import { useComparison } from "@/lib/ComparisonContext";
import { useMonthlyMetrics } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { useState } from "react";


const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const YEARS = [2024, 2025, 2026];


function PeriodSelector({ label, value, onChange, color }) {
 return (
   <div className={`flex flex-col gap-1.5 p-3 rounded-xl border-2 ${color}`}>
     <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
     <div className="flex gap-2">
       <select
         value={value.month}
         onChange={(e) => onChange({ ...value, month: +e.target.value })}
         className="flex-1 bg-background text-foreground text-sm rounded-lg border border-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
       >
         {MONTHS.map((m) => (
           <option key={m} value={m}>{monthLabel(m)}</option>
         ))}
       </select>
       <select
         value={value.year}
         onChange={(e) => onChange({ ...value, year: +e.target.value })}
         className="flex-1 bg-background text-foreground text-sm rounded-lg border border-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
       >
         {YEARS.map((y) => (
           <option key={y} value={y}>{y}</option>
         ))}
       </select>
     </div>
   </div>
 );
}


function DeltaBadge({ delta }) {
 if (delta === null) return <span className="text-xs text-muted-foreground">N/D</span>;
 const isPos = delta > 0;
 const isZero = delta === 0;
 const Icon = isZero ? Minus : isPos ? TrendingUp : TrendingDown;
 const color = isZero ? "text-muted-foreground" : isPos ? "text-emerald-400" : "text-red-400";
 return (
   <span className={`flex items-center gap-1 font-bold text-sm ${color}`}>
     <Icon className="w-3.5 h-3.5" />
     {isPos ? "+" : ""}{delta.toFixed(1)}%
   </span>
 );
}


function formatValue(key, val) {
 if (val === undefined || val === null) return "—";
 if (key === "revenue") return fmtCurrency(val);
 if (key === "avgPurchase") return `€${val.toFixed(2)}`;
 return fmtNumber(val);
}


export default function ComparisonPanel() {
 const { periodA, setPeriodA, periodB, setPeriodB, selectedVars, toggleVar, VARIABLES } = useComparison();
 const [open, setOpen] = useState(true);
 const { data: metrics = [] } = useMonthlyMetrics();


 const dataA = metrics.find(d => d.year === periodA.year && d.month === periodA.month);
 const dataB = metrics.find(d => d.year === periodB.year && d.month === periodB.month);


 const labelA = `${monthLabel(periodA.month)} ${periodA.year}`;
 const labelB = `${monthLabel(periodB.month)} ${periodB.year}`;


 return (
   <motion.div
     initial={{ opacity: 0, y: -12 }}
     animate={{ opacity: 1, y: 0 }}
     className="bg-card border border-border rounded-2xl overflow-hidden mb-6"
   >
     {/* Header */}
     <button
       onClick={() => setOpen(!open)}
       className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
     >
       <div className="flex items-center gap-2.5">
         <div className="p-1.5 rounded-lg bg-primary/10">
           <SlidersHorizontal className="w-4 h-4 text-primary" />
         </div>
         <div className="text-left">
           <p className="text-sm font-bold font-heading">Comparador de Periodos</p>
           <p className="text-[10px] text-muted-foreground">
             {labelA} vs {labelB} · {selectedVars.length} variable{selectedVars.length !== 1 ? "s" : ""}
           </p>
         </div>
       </div>
       <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
     </button>


     <AnimatePresence>
       {open && (
         <motion.div
           initial={{ height: 0, opacity: 0 }}
           animate={{ height: "auto", opacity: 1 }}
           exit={{ height: 0, opacity: 0 }}
           transition={{ duration: 0.25 }}
           className="overflow-hidden"
         >
           <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
             {/* Period selectors */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <PeriodSelector label="Periodo A" value={periodA} onChange={setPeriodA} color="border-primary/40" />
               <PeriodSelector label="Periodo B" value={periodB} onChange={setPeriodB} color="border-amber-500/40" />
             </div>


             {/* Variable selector */}
             <div>
               <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Variables a comparar</p>
               <div className="flex flex-wrap gap-2">
                 {VARIABLES.map((v) => {
                   const active = selectedVars.includes(v.key);
                   return (
                     <button
                       key={v.key}
                       onClick={() => toggleVar(v.key)}
                       className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                         active
                           ? "bg-primary text-primary-foreground border-primary"
                           : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                       }`}
                     >
                       {v.label}
                     </button>
                   );
                 })}
               </div>
             </div>


             {/* Comparison result */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
               {selectedVars.map((key) => {
                 const varMeta = VARIABLES.find((v) => v.key === key);
                 const valA = dataA?.[key];
                 const valB = dataB?.[key];
                 const delta = valA != null && valB != null && valA !== 0 ? ((valB - valA) / valA) * 100 : null;


                 return (
                   <div key={key} className="rounded-xl bg-muted/40 border border-border p-3.5 space-y-2">
                     <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{varMeta?.label}</p>
                     <div className="flex items-end justify-between gap-2">
                       <div className="space-y-1">
                         <div className="flex items-center gap-2">
                           <span className="inline-block w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                           <span className="text-xs text-muted-foreground">{labelA}</span>
                           <span className="text-sm font-bold font-mono">{formatValue(key, valA)}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="inline-block w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                           <span className="text-xs text-muted-foreground">{labelB}</span>
                           <span className="text-sm font-bold font-mono">{formatValue(key, valB)}</span>
                         </div>
                       </div>
                       <DeltaBadge delta={delta} />
                     </div>


                     {/* Mini bar comparison */}
                     {valA != null && valB != null && (
                       <div className="space-y-1 pt-1">
                         <div className="flex items-center gap-1.5">
                           <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                             <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (valA / Math.max(valA, valB)) * 100)}%` }} />
                           </div>
                         </div>
                         <div className="flex items-center gap-1.5">
                           <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                             <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (valB / Math.max(valA, valB)) * 100)}%` }} />
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>


             {(!dataA || !dataB) && (
               <p className="text-xs text-muted-foreground text-center py-2">
                 {!dataA && `Sin datos para ${labelA}. `}
                 {!dataB && `Sin datos para ${labelB}.`}
               </p>
             )}
           </div>
         </motion.div>
       )}
     </AnimatePresence>
   </motion.div>
 );
}