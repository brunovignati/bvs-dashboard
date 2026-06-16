import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";


export default function KPICard({ title, value, subtitle, trend, trendLabel, icon: Icon, accentClass = "text-primary" }) {
 const trendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
 const TrendIcon = trendIcon;
 const trendColor = trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-400" : "text-muted-foreground";


 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.4 }}
     className="relative bg-card border border-border rounded-2xl p-5 overflow-hidden group hover:border-primary/30 transition-all duration-300"
   >
     <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/5 -translate-y-8 translate-x-8 group-hover:bg-primary/10 transition-colors" />
     <div className="flex items-start justify-between mb-3">
       <div className={`p-2.5 rounded-xl bg-primary/10 ${accentClass}`}>
         <Icon className="w-4 h-4" />
       </div>
       {trend !== undefined && (
         <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
           <TrendIcon className="w-3 h-3" />
           <span>{trend > 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(1) : trend}%</span>
         </div>
       )}
     </div>
     <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
     <p className="text-2xl font-bold font-heading tracking-tight">{value}</p>
     {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
     {trendLabel && <p className="text-[10px] text-muted-foreground mt-0.5">{trendLabel}</p>}
   </motion.div>
 );
}