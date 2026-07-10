import { useComparison } from "@/lib/ComparisonContext";
import { monthLabel } from "@/lib/dashboardData";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEARS = [2024, 2025, 2026];

const RANGE_PRESETS = [
  { id: "last_month", label: "Mes anterior" },
  { id: "this_month", label: "Mes en curso" },
  { id: "last_3", label: "Últimos 3 meses" },
  { id: "last_6", label: "Últimos 6 meses" },
  { id: "last_12", label: "Últimos 12 meses" },
  { id: "ytd", label: "Año en curso" },
];

const COMP_MODES = [
  { id: "yoy", label: "Mismo periodo año anterior" },
  { id: "prev", label: "Periodo anterior" },
  { id: "custom", label: "Personalizado" },
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
        className="w-[4.2rem] bg-background text-foreground text-xs rounded-lg border border-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

export default function ComparisonPanel() {
  const { rangeB, rangeA, compMode, setPrimary, setComparison, setMode, applyRangePreset, labelRange } = useComparison();

  return (
    <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
      {/* ── Período principal ── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Período</p>
        <select
          value=""
          onChange={(e) => e.target.value && applyRangePreset(e.target.value)}
          className="w-full bg-background text-foreground text-xs rounded-lg border border-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Atajos…</option>
          {RANGE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <MonthYear value={rangeB.start} onChange={(s) => setPrimary({ start: s, end: rangeB.end })} />
        <p className="text-center text-[10px] text-muted-foreground">hasta</p>
        <MonthYear value={rangeB.end} onChange={(e) => setPrimary({ start: rangeB.start, end: e })} />
      </div>

      {/* ── Comparación ── */}
      <div className="space-y-1.5 border-t border-border pt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Comparar con</p>
        <select
          value={compMode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full bg-background text-foreground text-xs rounded-lg border border-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {COMP_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        {compMode === "custom" && (
          <>
            <MonthYear value={rangeA.start} onChange={(s) => setComparison({ start: s, end: rangeA.end })} />
            <p className="text-center text-[10px] text-muted-foreground">hasta</p>
            <MonthYear value={rangeA.end} onChange={(e) => setComparison({ start: rangeA.start, end: e })} />
          </>
        )}
      </div>

      {/* ── Resumen de la selección ── */}
      <p className="text-[10px] text-muted-foreground border-t border-border pt-2 leading-snug">
        <span className="font-semibold text-foreground">{labelRange(rangeB)}</span>
        {" vs "}
        <span className="font-semibold text-foreground">{labelRange(rangeA)}</span>
        <br />afecta a todo el panel
      </p>
    </div>
  );
}
