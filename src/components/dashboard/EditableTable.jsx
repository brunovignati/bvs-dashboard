import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";


function CellInput({ value, onChange, type = "text" }) {
 return (
   <input
     type={type}
     value={value ?? ""}
     onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
     className="w-full bg-background border border-primary/40 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary min-w-[80px]"
   />
 );
}


export default function EditableTable({ columns, data, onSave, onDelete, onAdd, loading }) {
 const [editingId, setEditingId] = useState(null);
 const [editValues, setEditValues] = useState({});
 const [adding, setAdding] = useState(false);
 const [newRow, setNewRow] = useState({});
 const [saving, setSaving] = useState(false);
 const [deletingId, setDeletingId] = useState(null);


 const startEdit = (row) => {
   setEditingId(row.id);
   setEditValues({ ...row });
   setAdding(false);
 };


 const cancelEdit = () => {
   setEditingId(null);
   setEditValues({});
 };


 const commitEdit = async () => {
   setSaving(true);
   await onSave(editValues);
   setSaving(false);
   setEditingId(null);
   setEditValues({});
 };


 const handleDelete = async (id) => {
   setDeletingId(id);
   await onDelete(id);
   setDeletingId(null);
 };


 const startAdd = () => {
   const defaults = {};
   columns.forEach((c) => { defaults[c.key] = c.type === "number" ? 0 : ""; });
   setNewRow(defaults);
   setAdding(true);
   setEditingId(null);
 };


 const commitAdd = async () => {
   setSaving(true);
   await onAdd(newRow);
   setSaving(false);
   setAdding(false);
   setNewRow({});
 };


 return (
   <div className="bg-card border border-border rounded-2xl overflow-hidden">
     <div className="overflow-x-auto">
       <table className="w-full text-xs">
         <thead>
           <tr className="bg-muted/50 border-b border-border">
             {columns.map((col) => (
               <th key={col.key} className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                 {col.label}
               </th>
             ))}
             <th className="px-3 py-2.5 text-right text-muted-foreground">Acciones</th>
           </tr>
         </thead>
         <tbody>
           <AnimatePresence>
             {data.map((row) => {
               const isEditing = editingId === row.id;
               return (
                 <motion.tr
                   key={row.id}
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className={`border-b border-border/50 transition-colors ${isEditing ? "bg-primary/5" : "hover:bg-muted/30"}`}
                 >
                   {columns.map((col) => (
                     <td key={col.key} className="px-3 py-2">
                       {isEditing ? (
                         <CellInput
                           value={editValues[col.key]}
                           onChange={(v) => setEditValues((prev) => ({ ...prev, [col.key]: v }))}
                           type={col.type === "number" ? "number" : "text"}
                         />
                       ) : (
                         <span className={col.type === "number" ? "font-mono" : ""}>
                           {col.render ? col.render(row[col.key], row) : row[col.key]}
                         </span>
                       )}
                     </td>
                   ))}
                   <td className="px-3 py-2">
                     <div className="flex items-center justify-end gap-1">
                       {isEditing ? (
                         <>
                           <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500" onClick={commitEdit} disabled={saving}>
                             {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                           </Button>
                           <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={cancelEdit}>
                             <X className="w-3 h-3" />
                           </Button>
                         </>
                       ) : (
                         <>
                           <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => startEdit(row)}>
                             <Pencil className="w-3 h-3" />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(row.id)} disabled={deletingId === row.id}>
                             {deletingId === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                           </Button>
                         </>
                       )}
                     </div>
                   </td>
                 </motion.tr>
               );
             })}


             {/* Add new row */}
             {adding && (
               <motion.tr
                 initial={{ opacity: 0, y: -8 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="border-b border-primary/20 bg-primary/5"
               >
                 {columns.map((col) => (
                   <td key={col.key} className="px-3 py-2">
                     <CellInput
                       value={newRow[col.key]}
                       onChange={(v) => setNewRow((prev) => ({ ...prev, [col.key]: v }))}
                       type={col.type === "number" ? "number" : "text"}
                     />
                   </td>
                 ))}
                 <td className="px-3 py-2">
                   <div className="flex items-center justify-end gap-1">
                     <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500" onClick={commitAdd} disabled={saving}>
                       {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                     </Button>
                     <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => setAdding(false)}>
                       <X className="w-3 h-3" />
                     </Button>
                   </div>
                 </td>
               </motion.tr>
             )}
           </AnimatePresence>
         </tbody>
       </table>
     </div>


     <div className="px-3 py-2 border-t border-border/50 flex items-center justify-between">
       <span className="text-[10px] text-muted-foreground">{data.length} registro{data.length !== 1 ? "s" : ""}</span>
       {!adding && (
         <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:bg-primary/10" onClick={startAdd}>
           <Plus className="w-3 h-3 mr-1" /> Añadir fila
         </Button>
       )}
     </div>
   </div>
 );
}