import { motion } from "framer-motion";


export default function SectionHeader({ title, subtitle, icon: Icon, badge }) {
 return (
   <motion.div
     initial={{ opacity: 0, x: -10 }}
     animate={{ opacity: 1, x: 0 }}
     className="flex items-center gap-3 mb-6"
   >
     {Icon && (
       <div className="p-2 rounded-xl bg-primary/10">
         <Icon className="w-5 h-5 text-primary" />
       </div>
     )}
     <div>
       <div className="flex items-center gap-2">
         <h2 className="text-lg font-bold font-heading tracking-tight">{title}</h2>
         {badge && (
           <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">
             {badge}
           </span>
         )}
       </div>
       {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
     </div>
   </motion.div>
 );
}