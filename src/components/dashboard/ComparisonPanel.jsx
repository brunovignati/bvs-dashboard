import { useComparison } from "@/lib/ComparisonContext";
import { monthLabel } from "@/lib/dashboardData";
import { SlidersHorizontal, ChevronDown, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const YEARS  = [2024, 2025, 2026];

function PeriodSelector({ label, value, onChange, accent }) {
  return (
    <div className={`flex flex-col gap-1.5 p-3 rounded-xl border-2 ${accent}`}>
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

const PRESETS = [
  { id: 'prev_month', label: 'vs mes anterior' },
  { id: 'yoy',        label: 'vs mismo mes año pasado' },
];

export default function ComparisonPanel() {
  const { periodA, setPeriodA, periodB, setPeriodB, isComparing, applyPreset } = useComparison();
  const [open, setOpen] = useState(true);

  const labelA = `${monthLabel(periodA.month)} ${periodA.year}`;
  const labelB = `${monthLabel(periodB.month)} ${periodB.year}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Header — clickable to collapse */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold font-heading">Comparador de Periodos</p>
            <p className="text-[10px] text-muted-foreground">
              {isComparing
                ? <><span className="text-primary font-semibold">{labelB}</span> vs <span className="text-slate-500 font-semibold">{labelA}</span> · afecta todo el panel</>
                : <span className="text-primary font-semibold">{labelB}</span>
              }
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
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-border pt-4 space-y-3">

              {/* Presets rápidos */}
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    className="text-[10px] font-semibold px-3 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Selectores de periodo (apilados, para el panel lateral) */}
              <div className="grid grid-cols-1 gap-2">
                <PeriodSelector label="Periodo B · activo" value={periodB} onChange={setPeriodB} accent="border-primary/40" />
                <div className="flex justify-center">
                  <ArrowLeftRight className="w-4 h-4 text-muted-foreground rotate-90" />
                </div>
                <PeriodSelector label="Periodo A · referencia" value={periodA} onChange={setPeriodA} accent="border-slate-500/40" />
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
