import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue, useBuyerCohorts } from "@/lib/useEntities";
import { fmtCurrency } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function CustomerValueCard({ delay }) {
  const { data: daily = [] } = useDailyRevenue();
  const { data: cohorts = [] } = useBuyerCohorts();

  // Revenue y pedidos por mes
  const byM = {};
  for (const r of daily) { const k = r.year*12+r.month; if (!byM[k]) byM[k]={k,year:r.year,month:r.month,rev:0,orders:0}; byM[k].rev+=r.revenue||0; byM[k].orders+=r.purchases||0; }
  const cohMap = {};
  for (const c of cohorts) { cohMap[c.year*12+c.month] = { buyers:(c.firstTime||0)+(c.recurring||0), recurring:c.recurring||0 }; }

  const rows = Object.values(byM).sort((a,b)=>a.k-b.k).map(m=>{
    const co = cohMap[m.k]; const buyers = co?.buyers||0; const rec = co?.recurring||0;
    return { name:`${M[m.month]} ${String(m.year).slice(2)}`, rev:m.rev, orders:m.orders, buyers,
      revPerBuyer: buyers?m.rev/buyers:0, freq: buyers?m.orders/buyers:0, aov: m.orders?m.rev/m.orders:0,
      repeat: buyers?rec/buyers:0 };
  }).filter(r=>r.buyers>0);

  const hasData = rows.length >= 3;
  const recent = rows.slice(-12);
  const avg = (f)=> recent.length? recent.reduce((s,r)=>s+f(r),0)/recent.length : 0;
  const revPerBuyer = avg(r=>r.revPerBuyer);
  const freq = avg(r=>r.freq);
  const aov = avg(r=>r.aov);
  const repeat = avg(r=>r.repeat);
  const lifespan = repeat<0.95 && repeat>0 ? Math.min(24, 1/(1-repeat)) : (repeat>=0.95?24:1); // meses estimados
  const clvEst = revPerBuyer * lifespan;

  const Tile = ({label,value}) => (
    <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold font-heading text-foreground">{value}</p>
    </div>
  );

  if (!hasData) {
    return (
      <EvidenceCard question="CL-2 · ¿Cuánto vale un cliente? (estimación agregada)" answer="Datos insuficientes" answerTone="neutral"
        maturity="amber" delay={delay}
        actions={[{verb:"investigar", rationale:"Se necesita histórico de compradores y revenue para estimar."}]} />
    );
  }

  return (
    <EvidenceCard
      question="CL-2 · ¿Cuánto vale un cliente? (estimación agregada)"
      answer={`≈ ${fmtCurrency(clvEst)} CLV estimado`}
      answerTone="neutral"
      context={`Estimación a nivel negocio (no individual): valor/mes por comprador × vida útil estimada (${lifespan.toFixed(1)} meses).`}
      maturity="amber"
      actions={[
        { verb: "crear", rationale: "Si la frecuencia o la recompra son bajas, un programa de fidelización sube el CLV." },
        { verb: "reasignar", rationale: "Compara el CLV estimado con tu coste de captación para calibrar cuánto invertir en captar." },
      ]}
      delay={delay}
      note="Estimación agregada con datos existentes (daily_revenue + buyer_cohorts). El CLV individual real exige dato a nivel contacto (Contact ID), no disponible."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <Tile label="Rev/comprador mes" value={fmtCurrency(revPerBuyer)} />
        <Tile label="Ticket medio" value={fmtCurrency(aov)} />
        <Tile label="Frecuencia/mes" value={freq.toFixed(2)} />
        <Tile label="Tasa recompra" value={`${(repeat*100).toFixed(0)}%`} />
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={recent} margin={{ top:5, right:8, left:4, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v=>`€${v.toFixed(0)}`} />
            <Tooltip formatter={(v)=>[fmtCurrency(v),"Rev/comprador"]} labelStyle={{ fontSize:11 }} />
            <Line type="monotone" dataKey="revPerBuyer" stroke="hsl(217,91%,60%)" strokeWidth={1.8} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
