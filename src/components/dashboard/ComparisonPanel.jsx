import { useComparison } from "@/lib/ComparisonContext";
import { monthLabel } from "@/lib/dashboardData";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEARS = [2024, 2025, 2026];

// Atajos como chips (rápidos y legibles) en vez de un dropdown "Atajos…".
const RANGE_PRESETS = [
  { id: "this_month", label: "Este mes" },
  { id: "last_month", label: "Mes ant." },
  { id: "last_3", label: "3 meses" },
  { id: "last_6", label: "6 meses" },
  { id: "last_12", label: "12 meses" },
  { id: "ytd", label: "Año" },
];

const COMP_MODES = [
  { id: "yoy", label: "Año ant." },
  { id: "prev", label: "Periodo ant." },
  { id: "custom", label: "Personal." },
];

function MonthYear({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      <select
        value={value.month}
        onChange={(e) => onChange({ ...value, month: +e.target.value })}
        className="flex-1 bg-background text-foreground text-xs rounded-lg border border-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {MONTHS.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
      </select>
      <select
        value={value.year}
        onChange={(e) => onChange({ ...value, year: +e.target.value })}
        className="w-[4.4rem] bg-background text-foreground text-xs rounded-lg border border-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

export default function ComparisonPanel() {
  const { rangeB, rangeA, compMode, setPrimary, setComparison, setMode, applyRangePreset, labelRange } = useComparison();

  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 space-y-3.5 w-full">
      {/* ── Período: atajos + rango ── */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Período</p>

        <div className="flex flex-wrap gap-1.5">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyRangePreset(p.id)}
              className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-muted/70 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Desde</span>
            <div className="flex-1"><MonthYear value={rangeB.start} onChange={(s) => setPrimary({ start: s, end: rangeB.end })} /></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hasta</span>
            <div className="flex-1"><MonthYear value={rangeB.end} onChange={(e) => setPrimary({ start: rangeB.start, end: e })} /></div>
          </div>
        </div>
      </div>

      {/* ── Comparar con: control segmentado ── */}
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Comparar con</p>
        <div className="flex gap-0.5 p-0.5 bg-muted/50 rounded-lg">
          {COMP_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 text-[11px] py-1.5 rounded-md transition-colors ${
                compMode === m.id ? "bg-card shadow-sm text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {compMode === "custom" && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Desde</span>
              <div className="flex-1"><MonthYear value={rangeA.start} onChange={(s) => setComparison({ start: s, end: rangeA.end })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hasta</span>
              <div className="flex-1"><MonthYear value={rangeA.end} onChange={(e) => setComparison({ start: rangeA.start, end: e })} /></div>
            </div>
          </div>
        )}
      </div>

      {/* ── Resumen ── */}
      <div className="border-t border-border pt-2.5">
        <p className="text-xs leading-snug">
          <span className="font-semibold text-foreground">{labelRange(rangeB)}</span>
          <span className="text-muted-foreground"> vs </span>
          <span className="font-semibold text-foreground">{labelRange(rangeA)}</span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Afecta a todo el panel</p>
      </div>
    </div>
  );
}
