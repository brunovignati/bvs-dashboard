import { useDailyRevenue, useBuyerCohorts, useCompradores, useSubscribers } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

function Tile({ label, value, delta, tone = "neutral" }) {
  const c = tone === "good" ? "text-orange-600" : tone === "bad" ? "text-slate-600" : "text-foreground";
  return (
    <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold font-heading ${c}`}>{value}</p>
      {delta && <p className="text-[11px] text-muted-foreground">{delta}</p>}
    </div>
  );
}

export default function KpiGridCard({ delay }) {
  const { data: daily = [] } = useDailyRevenue();
  const { data: cohorts = [] } = useBuyerCohorts();
  const { data: marca = [] } = useCompradores();
  const { data: subs = [] } = useSubscribers();

  // Revenue mensual
  const byM = {};
  for (const r of daily) { const k = r.year * 12 + r.month; if (!byM[k]) byM[k] = { k, year:r.year, month:r.month, rev:0 }; byM[k].rev += r.revenue||0; }
  const months = Object.values(byM).sort((a,b)=>a.k-b.k);
  const last = months[months.length-1], prev = months[months.length-2];
  const yoy = last && months.find(m=>m.year===last.year-1 && m.month===last.month);
  const mom = last&&prev&&prev.rev ? ((last.rev-prev.rev)/prev.rev)*100 : null;
  const yoyP = last&&yoy&&yoy.rev ? ((last.rev-yoy.rev)/yoy.rev)*100 : null;

  // Recurrentes
  const co = [...cohorts].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month);
  const lc = co[co.length-1];
  const pctRec = lc && (lc.firstTime+lc.recurring) ? (lc.recurring/(lc.firstTime+lc.recurring))*100 : null;

  // % marca propia último mes
  const lm = [...marca].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month).pop();
  const totLm = lm ? (byM[lm.year*12+lm.month]?.rev||0) : 0;
  const pctMarca = lm && totLm ? ((lm.revenue||0)/totLm)*100 : null;

  // Base email
  const es = subs.filter(s=>s.status==="subscribed").sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month).pop();

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-foreground">¿Cómo va el negocio este periodo?</h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-600 border-orange-500/20">● Responde hoy</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        <Tile label="Revenue mes" value={last?fmtCurrency(last.rev):"—"} />
        <Tile label="MoM" value={mom==null?"—":`${mom>=0?"+":""}${mom.toFixed(1)}%`} tone={mom==null?"neutral":mom>=0?"good":"bad"} />
        <Tile label="YoY" value={yoyP==null?"—":`${yoyP>=0?"+":""}${yoyP.toFixed(1)}%`} tone={yoyP==null?"neutral":yoyP>=0?"good":"bad"} />
        <Tile label="% recurrentes" value={pctRec==null?"—":`${pctRec.toFixed(0)}%`} tone={pctRec==null?"neutral":pctRec>=60?"good":"neutral"} />
        <Tile label="% marca propia" value={pctMarca==null?"—":`${pctMarca.toFixed(1)}%`} />
        <Tile label="Base email" value={es?fmtNumber(es.contacts):"—"} delta={es&&es.increment!=null?`neto ${es.increment>=0?"+":""}${fmtNumber(es.increment)}`:null} />
      </div>
      <div className="mt-4 pt-3 border-t border-border/60">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Decisiones que apoya esta evidencia</p>
        <p className="text-xs text-muted-foreground">Triaje: ¿necesito intervenir este periodo? ¿dónde profundizo (Revenue, Clientes, Marketing)?</p>
      </div>
    </div>
  );
}
