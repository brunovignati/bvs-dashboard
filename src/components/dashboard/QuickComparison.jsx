import { useComparison } from "@/lib/ComparisonContext";
import { useMonthlyMetrics } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";

// ─── helpers ────────────────────────────────────────────────

function formatValue(key, val) {
  if (val === undefined || val === null) return "—";
  if (key === "revenue")     return fmtCurrency(val);
  if (key === "avgPurchase") return `€${val.toFixed(2)}`;
  return fmtNumber(val);
}

function delta(a, b) {
  if (a == null || b == null || a === 0) return null;
  return ((b - a) / Math.abs(a)) * 100;
}

function DeltaBadge({ pct }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">N/D</span>;
  const pos  = pct > 0;
  const zero = pct === 0;
  const Icon  = zero ? Minus : pos ? TrendingUp : TrendingDown;
  const color = zero ? "text-muted-foreground" : pos ? "text-emerald-500" : "text-rose-500";
  return (
    <span className={`flex items-center gap-1 font-bold text-sm ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {pos ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

// ─── componente principal ───────────────────────────────────

export default function QuickComparison() {
  const { periodA, periodB, selectedVars, toggleVar, VARIABLES, isComparing } = useComparison();
  const { data: metrics = [] } = useMonthlyMetrics();

  const dataA = metrics.find((d) => d.year === periodA.year && d.month === periodA.month);
  const dataB = metrics.find((d) => d.year === periodB.year && d.month === periodB.month);

  const labelA = `${monthLabel(periodA.month)} ${periodA.year}`;
  const labelB = `${monthLabel(periodB.month)} ${periodB.year}`;

  if (!isComparing && !dataB) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <SectionHeader
        title="Comparativa Rápida"
        subtitle={isComparing ? `${labelB} vs ${labelA}` : `Resumen · ${labelB}`}
        icon={Zap}
        badge="KPIs"
      />

      {/* Variable toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {VARIABLES.map((v) => {
          const active = selectedVars.includes(v.key);
          return (
            <button
              key={v.key}
              onClick={() => toggleVar(v.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {selectedVars.map((key) => {
          const meta = VARIABLES.find((v) => v.key === key);
          const valA = dataA?.[key];
          const valB = dataB?.[key];
          const pct  = isComparing ? delta(valA, valB) : null;
          const maxVal = Math.max(valA ?? 0, valB ?? 0);

          return (
            <div key={key} className="rounded-xl bg-card border border-border p-4 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {meta?.label}
              </p>

              <div className="flex items-end justify-between gap-2">
                <div className="space-y-1.5">
                  {/* Periodo B (activo) — prominente */}
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-[10px] text-muted-foreground">{labelB}</span>
                    <span className="text-sm font-bold font-mono">{formatValue(key, valB)}</span>
                  </div>
                  {/* Periodo A (referencia) — solo si estamos comparando */}
                  {isComparing && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground">{labelA}</span>
                      <span className="text-sm font-mono text-muted-foreground">{formatValue(key, valA)}</span>
                    </div>
                  )}
                </div>
                {isComparing && <DeltaBadge pct={pct} />}
              </div>

              {/* Mini barras comparativas */}
              {isComparing && valA != null && valB != null && maxVal > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (valB / maxVal) * 100)}%` }}
                    />
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (valA / maxVal) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Aviso si faltan datos */}
      {(!dataA && isComparing) || !dataB ? (
        <p className="text-xs text-muted-foreground text-center mt-3">
          {!dataB && `Sin datos para ${labelB}. `}
          {!dataA && isComparing && `Sin datos para ${labelA}.`}
        </p>
      ) : null}
    </motion.div>
  );
}
