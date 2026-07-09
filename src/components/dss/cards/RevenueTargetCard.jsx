import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useDailyRevenue } from "@/lib/useEntities";
import { fmtCurrency } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const LS = (p) => `bvs_revenue_target_${p}`;

export default function RevenueTargetCard({ delay }) {
  const { data = [] } = useDailyRevenue();
  const [period, setPeriod] = useState("month"); // month | quarter
  const [target, setTarget] = useState(0);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(LS(period)) : null;
    setTarget(saved ? Number(saved) : 0);
  }, [period]);

  const saveTarget = (v) => {
    setTarget(v);
    if (typeof window !== "undefined") window.localStorage.setItem(LS(period), String(v));
  };

  const rows = [...data].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month!==b.month?a.month-b.month:(a.day||0)-(b.day||0));
  const last = rows[rows.length-1];
  const hasData = !!last;

  let acc = 0, daysElapsed = 0, daysInPeriod = 30, periodLabel = "";
  if (hasData) {
    if (period === "month") {
      acc = rows.filter(r=>r.year===last.year && r.month===last.month).reduce((s,r)=>s+(r.revenue||0),0);
      daysElapsed = last.day || 0;
      daysInPeriod = new Date(last.year, last.month, 0).getDate();
      periodLabel = `${M[last.month]} ${last.year}`;
    } else {
      const q = Math.floor((last.month-1)/3); const qMonths = [q*3+1,q*3+2,q*3+3];
      acc = rows.filter(r=>r.year===last.year && qMonths.includes(r.month)).reduce((s,r)=>s+(r.revenue||0),0);
      const elapsedMonths = qMonths.filter(m=>m<last.month);
      daysElapsed = elapsedMonths.reduce((s,m)=>s+new Date(last.year,m,0).getDate(),0) + (last.day||0);
      daysInPeriod = qMonths.reduce((s,m)=>s+new Date(last.year,m,0).getDate(),0);
      periodLabel = `Q${q+1} ${last.year}`;
    }
  }
  const projection = daysElapsed>0 ? acc/daysElapsed*daysInPeriod : 0;
  const pctAcc = target>0 ? Math.min(100, acc/target*100) : 0;
  const pctProj = target>0 ? Math.min(120, projection/target*100) : 0;
  const onTrack = target>0 && projection>=target;

  return (
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay}}
      className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-foreground">RV-3 · ¿Voy camino de cumplir el objetivo?</h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">● Responde hoy</span>
      </div>

      {/* Controles: periodo + objetivo editable */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 p-0.5 bg-muted/40 rounded-lg">
          {[["month","Mes"],["quarter","Trimestre"]].map(([id,l])=>(
            <button key={id} onClick={()=>setPeriod(id)}
              className={`text-xs px-2.5 py-1 rounded-md ${period===id?"bg-card shadow text-foreground font-semibold":"text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          Objetivo {periodLabel}:
          <input type="number" value={target||""} onChange={e=>saveTarget(Number(e.target.value))}
            placeholder="€ meta" className="w-28 text-xs px-2 py-1 rounded-md border border-border bg-background" />
        </label>
      </div>

      {!hasData ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Sin datos de revenue.</p>
      ) : target<=0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Fija un objetivo de revenue para ver el progreso y la proyección.</p>
      ) : (
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-2xl font-bold font-heading ${onTrack?"text-emerald-600":"text-amber-600"}`}>{fmtCurrency(acc)}</span>
            <span className="text-xs text-muted-foreground">de {fmtCurrency(target)} · {pctAcc.toFixed(0)}% acumulado</span>
          </div>
          {/* Barra tipo bullet */}
          <div className="relative h-6 bg-muted/50 rounded-md overflow-hidden mt-2">
            <div className="absolute inset-y-0 left-0 bg-primary/70" style={{width:`${pctAcc}%`}} />
            {/* marcador de proyección */}
            <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{left:`${Math.min(100,pctProj)}%`}} title="Proyección" />
            <div className="absolute inset-y-0 right-0 w-0.5 bg-emerald-600" title="Objetivo (100%)" />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Acumulado · día {daysElapsed}/{daysInPeriod}</span>
            <span>▏ proyección: <span className={onTrack?"text-emerald-600 font-semibold":"text-amber-600 font-semibold"}>{fmtCurrency(projection)}</span> ({pctProj.toFixed(0)}%)</span>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/60">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Decisiones que apoya esta evidencia</p>
        <p className="text-xs text-muted-foreground">
          {target>0 ? (onTrack ? "Vas camino de cumplir: mantén el ritmo o reinvierte el excedente." : "Proyección por debajo de la meta: acelera captación o campañas para cerrar la brecha.") : "Define la meta para activar el seguimiento."}
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 italic">Objetivo editable, guardado en tu navegador. Fuente: Connectif · daily_revenue. Proyección lineal por ritmo diario.</p>
    </motion.div>
  );
}
