import { useState, useEffect } from "react";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const LS = (p) => `bvs_revenue_target_${p}`;
const dim = (y, m) => new Date(y, m, 0).getDate();

export default function RevenueTargetCard({ delay }) {
  const { data = [] } = useDailyRevenue();
  const { rangeB } = useComparison();
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

  // El período lo marca el comparador (rangeB.end): mes / trimestre / año que contiene ese mes.
  const refY = rangeB.end.year, refM = rangeB.end.month;
  const months = period === "month" ? [refM]
    : period === "quarter" ? (() => { const q = Math.floor((refM - 1) / 3); return [q * 3 + 1, q * 3 + 2, q * 3 + 3]; })()
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const periodLabel = period === "month" ? `${M[refM]} ${refY}`
    : period === "quarter" ? `Q${Math.floor((refM - 1) / 3) + 1} ${refY}`
    : `${refY}`;

  const inRef = data.filter(r => r.year === refY && r.month === refM);
  const dayInRef = inRef.length ? Math.max(...inRef.map(r => r.day || 0)) : 0;
  const acc = data.filter(r => r.year === refY && months.includes(r.month)).reduce((s, r) => s + (r.revenue || 0), 0);
  const daysElapsed = months.filter(m => m < refM).reduce((s, m) => s + dim(refY, m), 0) + dayInRef;
  const daysInPeriod = months.reduce((s, m) => s + dim(refY, m), 0);

  const hasData = daysElapsed > 0;
  const closed = hasData && daysElapsed >= daysInPeriod;               // periodo terminado
  const projection = hasData ? (acc / daysElapsed) * daysInPeriod : 0;
  // Cuando está cerrado, la referencia de cumplimiento es el acumulado real; si no, la proyección.
  const outcome = closed ? acc : projection;
  const pct = target > 0 ? Math.min(120, (outcome / target) * 100) : 0;
  const onTrack = target > 0 && outcome >= target;

  const controls = (
    <div className="space-y-2.5">
      <div className="flex gap-1 p-0.5 bg-muted/40 rounded-lg w-fit">
        {[["month", "Mes"], ["quarter", "Trimestre"], ["year", "Año"]].map(([id, l]) => (
          <button key={id} onClick={() => setPeriod(id)}
            className={`text-xs px-3 py-1 rounded-md transition-colors ${period === id ? "bg-card shadow text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="shrink-0">Objetivo {periodLabel}</span>
        <span className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
          <input type="number" value={target || ""} onChange={e => saveTarget(Number(e.target.value))}
            placeholder="meta" className="w-32 text-xs pl-5 pr-2 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
        </span>
      </label>
    </div>
  );

  // Bullet: relleno = acumulado; marca de proyección solo si el periodo está en curso.
  const ref = target > 0 ? target : (outcome || 1);
  const fillPct = Math.min(100, (acc / ref) * 100);
  const projMarker = Math.min(100, (projection / ref) * 100);

  const kpis = !hasData ? undefined : closed
    ? [
        { value: fmtCurrency(acc), label: `Revenue ${periodLabel}` },
        ...(target > 0 ? [{ value: `${pct.toFixed(0)}%`, label: "del objetivo" }] : []),
      ]
    : [
        { value: fmtCurrency(acc), label: `Acumulado ${periodLabel}` },
        { value: fmtCurrency(projection), label: `Proyección a cierre` },
        ...(target > 0 ? [{ value: `${pct.toFixed(0)}%`, label: "proyección vs objetivo" }] : []),
      ];

  const insight = !hasData ? undefined
    : target <= 0
      ? (closed ? `${periodLabel} cerró en ${fmtCurrency(acc)}. Fija un objetivo para medir el cumplimiento.`
                : `Llevas ${fmtCurrency(acc)} (día ${daysElapsed}/${daysInPeriod}); a este ritmo cerrarás en ${fmtCurrency(projection)}.`)
      : closed
        ? (onTrack ? `${periodLabel} cerró en ${fmtCurrency(acc)}: cumpliste el objetivo (${pct.toFixed(0)}%).`
                   : `${periodLabel} cerró en ${fmtCurrency(acc)}: por debajo del objetivo (${pct.toFixed(0)}%).`)
        : (onTrack ? `Al ritmo actual (día ${daysElapsed}/${daysInPeriod}) superarás el objetivo: proyección ${pct.toFixed(0)}%.`
                   : `Al ritmo actual (día ${daysElapsed}/${daysInPeriod}) te quedarás corto: proyección ${pct.toFixed(0)}%.`);

  const action = !hasData ? undefined
    : target <= 0 ? "Fija un objetivo para activar el seguimiento de cumplimiento."
    : closed ? (onTrack ? "Objetivo cumplido: consolida lo que funcionó este período."
                        : "Cerró por debajo: revisa qué faltó para ajustar el próximo período.")
    : (onTrack ? "Mantén la inversión y el calendario promocional que funcionan."
               : "Refuerza campañas/promoción para cerrar la brecha antes de fin de período.");

  return (
    <EvidenceCard
      question="¿Voy camino de cumplir el objetivo de revenue?"
      kpis={kpis}
      answer={!hasData ? "Sin datos para el período seleccionado" : undefined}
      status={hasData && target > 0 ? (onTrack ? { tone: "good", label: "En objetivo" } : { tone: "bad", label: "En riesgo" }) : undefined}
      severity={hasData && target > 0 && !onTrack ? "medium" : undefined}
      insight={insight}
      action={action}
      delay={delay}
      note="Objetivo editable, guardado en tu navegador. Fuente: Connectif · daily_revenue. Con el período en curso se proyecta linealmente por ritmo diario; cerrado, se muestra el revenue real."
    >
      {hasData && (
        <div className="space-y-3">
          {controls}
          <div>
            <div className="relative h-6 bg-muted/50 rounded-md overflow-hidden">
              <div className={`absolute inset-y-0 left-0 ${onTrack || target <= 0 ? "bg-primary/70" : "bg-red-500/60"}`} style={{ width: `${fillPct}%` }} />
              {!closed && <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${projMarker}%` }} title="Proyección a cierre" />}
              {target > 0 && <div className="absolute inset-y-0 right-0 w-0.5 bg-foreground/70" title="Objetivo (100%)" />}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{closed ? `Cerrado · ${daysInPeriod} días` : `En curso · día ${daysElapsed}/${daysInPeriod}`}{!closed ? " · ▏ proyección" : ""}</span>
              <span>{target > 0 ? `objetivo ${fmtCurrency(target)}` : "sin objetivo fijado"}</span>
            </div>
          </div>
        </div>
      )}
    </EvidenceCard>
  );
}
