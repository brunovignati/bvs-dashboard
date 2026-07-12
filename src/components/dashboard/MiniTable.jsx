import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";


export default function MiniTable({ columns, data, maxRows = 10 }) {
 return (
   <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     className="bg-card border border-border rounded-2xl overflow-hidden"
   >
     <div className="overflow-x-auto">
       <Table>
         <TableHeader>
           <TableRow className="bg-muted/50 hover:bg-muted/50">
             {columns.map((col) => (
               <TableHead key={col.key} className={`text-[10px] uppercase tracking-widest font-semibold text-muted-foreground py-3 ${col.align === 'right' ? 'text-right' : ''}`}>
                 {col.label}
               </TableHead>
             ))}
           </TableRow>
         </TableHeader>
         <TableBody>
           {data.slice(0, maxRows).map((row, i) => (
             <TableRow key={i} className="border-border/50 hover:bg-muted/30 transition-colors">
               {columns.map((col) => (
                 <TableCell key={col.key} className={`text-sm py-2.5 ${col.align === 'right' ? 'text-right font-mono text-xs' : ''} ${col.bold ? 'font-semibold' : ''}`}>
                   {col.render ? col.render(row[col.key], row) : row[col.key]}
                 </TableCell>
               ))}
             </TableRow>
           ))}
         </TableBody>
       </Table>
     </div>
   </motion.div>
 );
}