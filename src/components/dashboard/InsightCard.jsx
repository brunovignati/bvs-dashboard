import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";


export default function InsightCard({ title, description, type = "info" }) {
 const colors = {
   info: "border-l-primary bg-primary/5",
   success: "border-l-emerald-500 bg-emerald-500/5",
   warning: "border-l-amber-500 bg-amber-500/5",
   danger: "border-l-red-500 bg-red-500/5",
 };


 const iconColors = {
   info: "text-primary",
   success: "text-emerald-500",
   warning: "text-amber-500",
   danger: "text-red-500",
 };


 return (
   <motion.div
     initial={{ opacity: 0, scale: 0.98 }}
     animate={{ opacity: 1, scale: 1 }}
     className={`border-l-4 rounded-r-xl p-4 ${colors[type]}`}
   >
     <div className="flex gap-3">
       <Lightbulb className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors[type]}`} />
       <div>
         <p className="text-sm font-semibold mb-0.5">{title}</p>
         <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
       </div>
     </div>
   </motion.div>
 );
}