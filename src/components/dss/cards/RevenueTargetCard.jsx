import { useState, useEffect } from "react";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { fmtCurrency } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const LS = (p) => `bvs_revenue_target_${p}`;

export default function RevenueTargetCard({ delay }) {
  const { data = [] } = useDailyRevenue();
  const [period, setPeriod] = useState("month");
  const [target, setTarget] = useState(0);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(LS(period)) : null;
    setTarget(saved ? Number(saved) : 0);
  }, [period]);

  const saveTarget = (v) => {
    setTarget(v);
    if (typeof window !== "undefined") window.localStorage.setItem(LS(period), String(v));
  };

  const rows = [...data].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month !== b.month ? a.month - b.month : (a.day || 0) - (b.day || 0));
  const last = rows[rows.length - 1];
  const hasData = !!last;

  let acc = 0, daysElapsed = 0, daysInPeriod = 30, periodLabel = "";
  if (hasData) {
    if (period === "month") {
      acc = rows.filter(r => r.year === last.year && r.month === last.month).reduce((s, r) => s + (r.revenue || 0), 0);
      daysElapsed = last.day || 0;
      daysInPeriod = new Date(last.year, last.month, 0).getDate();
      periodLabel = `${M[last.month]} ${last.year}`;
    } else {
      const q = Math.floor((last.month - 1) / 3); const qMonths = [q * 3 + 1, q * 3 + 2, q * 3 + 3];
      acc = rows.filter(r => r.year === last.year && qMonths.includes(r.month)).reduce((s, r) => s + (r.revenue || 0), 0);
      const elapsedMonths = qMonths.filter(m => m < last.month);
      daysElapsed = elapsedMonths.reduce((s, m) => s + new Date(last.year, m, 0).getDate(), 0) + (last.day || 0);
      daysInPeriod = qMonths.reduce((s, m) => s + new Date(last.year, m, 0).getDate(), 0);
      periodLabel = `Q${q + 1} ${last.year}`;
    }
  }
  const projection = daysElapsed > 0 ? acc / daysElapsed * daysInPeriod : 0;
  const pctAcc = target > 0 ? Math.min(100, acc / target * 100) : 0;
  const pctProj = target > 0 ? Math.min(120, projection / target * 100) : 0;
  const onTrack = target > 0 && projection >= target;

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 p-0.5 bg-muted/40 rounded-lg">
        {[["month", "Mes"], ["quarter", "Trimestre"]].map(([id, l]) => (
          <button key={id} onClick={() => setPeriod(id)}
            className={`text-xs px-2.5 py-1 rounded-md ${period === id ? "bg-card shadow text-foreground font-semibold" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <label className="text-xs text-muted-foreground flex items-center gap-1.5">
        Objetivo {periodLabel}:
        <input type="number" value={target || ""} onChange={e => saveTarget(Number(e.target.value))}
          placeholder="€ meta" className="w-28 text-xs px-2 py-1 rounded-md border border-border bg-background" />
      </label>
    </div>
  );

  const kpis = target > 0 && hasData ? [
    { value: fmtCurrency(acc), label: `Acumulado ${periodLabel}` },
    { value: `${pctAcc.toFixed(0)}%`, label: "del objetivo" },
    { value: fmtCurrency(projection), label: "Proyección fin de período" },
  ] : undefined;

  return (
    <EvidenceCard
      question="¿Voy camino de cumplir el objetivo de revenue?"
      kpis={kpis}
      answer={!kpis ? (hasData ? "Fija un objetivo para ver el progreso" : "Sin datos de revenue") : undefined}
      answerTone="neutral"
      maturity="green"
      insight={target > 0 && hasData ? (onTrack
        ? `Al ritmo actual (día ${daysElapsed}/${daysInPeriod}) superarás el objetivo: proyección ${pctProj.toFixed(0)}%.`
        : `Al ritmo actual (día ${daysElapsed}/${daysInPeriod}) te quedarás por debajo: proyección ${pctProj.toFixed(0)}%.`) : undefined}
      action={target > 0 && hasData
        ? (onTrack ? "Mantén la inversión y el calendario promocional que están funcionando."
          : "Refuerza campañas/promoción si quieres cerrar la brecha antes de fin de período.")
        : undefined}
      note="Objetivo editable, guardado en tu navegador. Fuente: Connectif · daily_revenue. Proyección lineal por ritmo diario."
    >
      <div className="space-y-3">
        {controls}
        {target > 0 && hasData && (
          <div>
            <div className="relative h-6 bg-muted/50 rounded-md overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-primary/70" style={{ width: `${pctAcc}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${Math.min(100, pctProj)}%` }} title="Proyección" />
              <div className="absolute inset-y-0 right-0 w-0.5 bg-blue-600" title="Objetivo (100%)" />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Acumulado · día {daysElapsed}/{daysInPeriod}</span>
              <span>▏ objetivo {fmtCurrency(target)}</span>
            </div>
          </div>
        )}
      </div>
    </EvidenceCard>
  );
}
