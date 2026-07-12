import { useState, useEffect } from "react";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
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

  // El período lo marca el comparador (rangeB.end), no el último día suelto de los datos,
  // para que esta tarjeta sea coherente con el resto de la sección.
  const { rangeB } = useComparison();
  const refY = rangeB.end.year, refM = rangeB.end.month;
  const rows = [...data];

  let acc = 0, daysElapsed = 0, daysInPeriod = 30, periodLabel = "";
  if (rows.length) {
    if (period === "month") {
      const mr = rows.filter(r => r.year === refY && r.month === refM);
      acc = mr.reduce((s, r) => s + (r.revenue || 0), 0);
      daysElapsed = mr.length ? Math.max(...mr.map(r => r.day || 0)) : 0;
      daysInPeriod = new Date(refY, refM, 0).getDate();
      periodLabel = `${M[refM]} ${refY}`;
    } else {
      const q = Math.floor((refM - 1) / 3); const qMonths = [q * 3 + 1, q * 3 + 2, q * 3 + 3];
      acc = rows.filter(r => r.year === refY && qMonths.includes(r.month)).reduce((s, r) => s + (r.revenue || 0), 0);
      const inRef = rows.filter(r => r.year === refY && r.month === refM);
      const dayInRef = inRef.length ? Math.max(...inRef.map(r => r.day || 0)) : 0;
      daysElapsed = qMonths.filter(m => m < refM).reduce((s, m) => s + new Date(refY, m, 0).getDate(), 0) + dayInRef;
      daysInPeriod = qMonths.reduce((s, m) => s + new Date(refY, m, 0).getDate(), 0);
      periodLabel = `Q${q + 1} ${refY}`;
    }
  }
  const hasData = daysElapsed > 0;
  const projection = daysElapsed > 0 ? acc / daysElapsed * daysInPeriod : 0;
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

  // Referencia del bullet: objetivo si está fijado, si no la proyección del período.
  const ref = target > 0 ? target : (projection || 1);
  const fillPct = Math.min(100, (acc / ref) * 100);
  const projMarker = Math.min(100, (projection / ref) * 100);

  const kpis = hasData ? [
    { value: fmtCurrency(acc), label: `Acumulado ${periodLabel}` },
    { value: fmtCurrency(projection), label: `Proyección ${periodLabel}` },
    ...(target > 0 ? [{ value: `${pctProj.toFixed(0)}%`, label: "Proyección vs objetivo" }] : []),
  ] : undefined;

  return (
    <EvidenceCard
      question="¿Voy camino de cumplir el objetivo de revenue?"
      kpis={kpis}
      answer={!hasData ? "Sin datos para el período seleccionado" : undefined}
      maturity="green"
      insight={hasData ? (target > 0
        ? (onTrack
          ? `Al ritmo actual (día ${daysElapsed}/${daysInPeriod}) superarás el objetivo: proyección ${pctProj.toFixed(0)}%.`
          : `Al ritmo actual (día ${daysElapsed}/${daysInPeriod}) te quedarás por debajo del objetivo: proyección ${pctProj.toFixed(0)}%.`)
        : `Llevas ${fmtCurrency(acc)} acumulados (día ${daysElapsed}/${daysInPeriod}); a este ritmo cerrarás el período en ${fmtCurrency(projection)}.`) : undefined}
      action={hasData ? (target > 0
        ? (onTrack ? "Mantén la inversión y el calendario promocional que funcionan."
          : "Refuerza campañas/promoción para cerrar la brecha antes de fin de período.")
        : "Fija un objetivo para activar el seguimiento de cumplimiento.") : undefined}
      note="Objetivo editable, guardado en tu navegador. Fuente: Connectif · daily_revenue. Proyección lineal por ritmo diario."
    >
      {hasData && (
        <div className="space-y-3">
          {controls}
          <div>
            <div className="relative h-6 bg-muted/50 rounded-md overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-primary/70" style={{ width: `${fillPct}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${projMarker}%` }} title="Proyección" />
              {target > 0 && <div className="absolute inset-y-0 right-0 w-0.5 bg-orange-600" title="Objetivo (100%)" />}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Acumulado · día {daysElapsed}/{daysInPeriod}</span>
              <span>{target > 0 ? `▏ objetivo ${fmtCurrency(target)}` : "sin objetivo fijado"}</span>
            </div>
          </div>
        </div>
      )}
    </EvidenceCard>
  );
}
