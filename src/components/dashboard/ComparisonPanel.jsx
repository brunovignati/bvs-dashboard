import { useComparison } from "@/lib/ComparisonContext";
import { monthLabel } from "@/lib/dashboardData";
import { ArrowLeftRight } from "lucide-react";

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
  const { periodA, setPeriodA, periodB, setPeriodB, applyPreset } = useComparison();

  return (
    <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
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

      {/* Selectores de periodo (apilados) */}
      <div className="grid grid-cols-1 gap-2">
        <PeriodSelector label="desde" value={periodB} onChange={setPeriodB} accent="border-primary/40" />
        <div className="flex justify-center">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground rotate-90" />
        </div>
        <PeriodSelector label="hasta" value={periodA} onChange={setPeriodA} accent="border-slate-500/40" />
      </div>
    </div>
  );
}
