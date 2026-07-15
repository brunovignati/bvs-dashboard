import { useState } from "react";
import { useComparison } from "@/lib/ComparisonContext";
import { monthLabel } from "@/lib/dashboardData";

// Rango REAL de datos: desde ene-2024 (lo más antiguo: venta web/categorías) hasta el mes
// en curso (último con dato). Se calcula dinámicamente para no ofrecer meses futuros vacíos.
const NOW = new Date();
const MAX = { year: NOW.getFullYear(), month: NOW.getMonth() + 1 };
const MIN = { year: 2024, month: 1 };
const YEARS = Array.from({ length: MAX.year - MIN.year + 1 }, (_, i) => MIN.year + i);
const monthsFor = (year) => {
  const lo = year === MIN.year ? MIN.month : 1;
  const hi = year === MAX.year ? MAX.month : 12;
  return Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
};

const RANGE_PRESETS = [
  { id: "this_month", label: "Este mes" },
  { id: "last_month", label: "Mes ant." },
  { id: "last_3", label: "3M" },
  { id: "last_6", label: "6M" },
  { id: "last_12", label: "12M" },
  { id: "ytd", label: "Año" },
];

const COMP_MODES = [
  { id: "yoy", label: "Año ant." },
  { id: "prev", label: "Periodo ant." },
  { id: "custom", label: "Personal." },
];

function MonthYear({ value, onChange }) {
  const months = monthsFor(value.year);
  return (
    <div className="flex gap-1.5">
      <select value={value.month} onChange={(e) => onChange({ ...value, month: +e.target.value })}
        className="flex-1 bg-background text-foreground text-xs rounded-lg border border-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary">
        {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
      </select>
      <select value={value.year} onChange={(e) => {
        const y = +e.target.value; const mm = monthsFor(y);
        const month = mm.includes(value.month) ? value.month : mm[mm.length - 1];
        onChange({ ...value, year: y, month });
      }}
        className="w-[4.4rem] bg-background text-foreground text-xs rounded-lg border border-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary">
        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

export default function ComparisonPanel() {
  const { rangeB, rangeA, compMode, setPrimary, setComparison, setMode, applyRangePreset } = useComparison();
  const [custom, setCustom] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 space-y-3 w-full">
      {/* ── Período ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Período</p>
          <button onClick={() => setCustom((v) => !v)} className="text-[10px] font-medium text-primary hover:opacity-70">
            {custom ? "Ocultar" : "Personalizar"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RANGE_PRESETS.map((p) => (
            <button key={p.id} onClick={() => applyRangePreset(p.id)}
              className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-muted/70 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
              {p.label}
            </button>
          ))}
        </div>
        {custom && (
          <div className="space-y-1.5 pt-1">
            <MonthYear value={rangeB.start} onChange={(s) => setPrimary({ start: s, end: rangeB.end })} />
            <p className="text-center text-[10px] text-muted-foreground">hasta</p>
            <MonthYear value={rangeB.end} onChange={(e) => setPrimary({ start: rangeB.start, end: e })} />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground/80 leading-snug pt-0.5">
          Cobertura de datos: venta web y categorías desde <span className="font-medium">ene-2024</span> · email/push/CRM desde <span className="font-medium">jun-2024</span> · GA4 y redes sociales desde <span className="font-medium">may-2026</span>. Fuera de su rango, esas tarjetas aparecen vacías.
        </p>
      </div>

      {/* ── Comparar ── */}
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Comparar</p>
        <div className="flex gap-0.5 p-0.5 bg-muted/50 rounded-lg">
          {COMP_MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`flex-1 text-[11px] py-1.5 rounded-md transition-colors ${
                compMode === m.id ? "bg-card shadow-sm text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
              {m.label}
            </button>
          ))}
        </div>
        {compMode === "custom" && (
          <div className="space-y-1.5 pt-0.5">
            <MonthYear value={rangeA.start} onChange={(s) => setComparison({ start: s, end: rangeA.end })} />
            <p className="text-center text-[10px] text-muted-foreground">hasta</p>
            <MonthYear value={rangeA.end} onChange={(e) => setComparison({ start: rangeA.start, end: e })} />
          </div>
        )}
      </div>
    </div>
  );
}
