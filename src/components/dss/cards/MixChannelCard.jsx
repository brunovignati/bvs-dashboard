import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { CHART_H, GRID, AXIS, TIP, LEGEND, SERIES, STACK_FILL_OPACITY } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function MixChannelCard({ delay }) {
  const { data = [] } = useDailyRevenue();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const byM = {};
  for (const r of data) {
    const k = r.year * 12 + r.month;
    if (k > cutoff) continue;
    if (!byM[k]) byM[k] = { k, year: r.year, month: r.month, email:0, push:0, web:0, sms:0, total:0 };
    byM[k].email += r.emailAttr||0; byM[k].push += r.pushAttr||0; byM[k].web += r.webAttr||0;
    byM[k].sms += r.smsAttr||0; byM[k].total += r.purchases||0;
  }
  const rows = Object.values(byM).sort((a,b)=>a.k-b.k).map(m=>{
    const attr = m.email+m.push+m.web+m.sms;
    const noattr = Math.max(0, m.total-attr);
    return { name:`${M[m.month]} ${String(m.year).slice(2)}`, Email:m.email, Push:m.push, Web:m.web, SMS:m.sms, "No atribuido":noattr };
  }).slice(-18);
  const hasData = rows.length >= 2 && rows.some(r=>r.Email+r.Push+r.Web+r.SMS>0);

  const last = rows[rows.length-1] || {};
  const parts = hasData ? [["Email",last.Email],["Push",last.Push],["Web",last.Web],["SMS",last.SMS]] : [];
  const sorted = [...parts].sort((a,b)=>b[1]-a[1]);
  const top = sorted[0];
  const lastAttr = hasData ? last.Email+last.Push+last.Web+last.SMS : 0;
  const topPct = top && lastAttr>0 ? (top[1]/lastAttr)*100 : 0;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿De dónde viene cada euro (mix de canal)?"
      kpis={hasData && top ? [
        { value: top[0], label: "Canal líder" },
        { value: `${topPct.toFixed(0)}%`, label: "de lo atribuido" },
      ] : undefined}
      answer={!hasData ? "Sin atribución" : undefined}
      maturity={hasData ? "green" : "amber"}
      insight={hasData && top ? `${top[0]} concentra el ${topPct.toFixed(0)}% de las compras atribuidas del último mes; vigila si el mix se desplaza entre canales.` : undefined}
      actions={[
        { verb: "reasignar", rationale: "Si un canal gana peso de forma sostenida, refuérzalo; si otro se apaga, revísalo." },
      ]}
      delay={delay}
      note="Atribución de marketing por canal (Email/Push/Web/SMS) — dimensión distinta del canal de venta (online/retail/omnicanal). Compras atribuidas (Connectif · daily_revenue). No atribuido = total − Σ atribuido."
    >
      {hasData && (
        <div className={CHART_H}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} stackOffset="expand" margin={{ top:5, right:8, left:4, bottom:0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="name" {...AXIS} interval={Math.max(1,Math.floor(rows.length/8))} />
              <YAxis {...AXIS} tickFormatter={v=>`${(v*100).toFixed(0)}%`} />
              <Tooltip formatter={(v,n)=>[Math.round(v),n]} {...TIP} />
              <Legend {...LEGEND} />
              <Area type="monotone" dataKey="Email" stackId="1" stroke={SERIES[0]} fill={SERIES[0]} fillOpacity={STACK_FILL_OPACITY} />
              <Area type="monotone" dataKey="Push" stackId="1" stroke={SERIES[1]} fill={SERIES[1]} fillOpacity={STACK_FILL_OPACITY} />
              <Area type="monotone" dataKey="Web" stackId="1" stroke={SERIES[2]} fill={SERIES[2]} fillOpacity={STACK_FILL_OPACITY} />
              <Area type="monotone" dataKey="SMS" stackId="1" stroke={SERIES[3]} fill={SERIES[3]} fillOpacity={STACK_FILL_OPACITY} />
              <Area type="monotone" dataKey="No atribuido" stackId="1" stroke={SERIES[4]} fill={SERIES[4]} fillOpacity={STACK_FILL_OPACITY} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
