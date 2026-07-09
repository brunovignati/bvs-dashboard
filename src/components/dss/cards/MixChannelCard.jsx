import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useDailyRevenue } from "@/lib/useEntities";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function MixChannelCard({ delay }) {
  const { data = [] } = useDailyRevenue();
  const byM = {};
  for (const r of data) {
    const k = r.year * 12 + r.month;
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
  const top = parts.sort((a,b)=>b[1]-a[1])[0];

  return (
    <EvidenceCard
      question="RV-2 · ¿De dónde viene cada euro (mix de canal de marketing)?"
      answer={hasData && top ? `Canal líder: ${top[0]}` : "Sin atribución"}
      answerTone="neutral"
      context={hasData ? "Reparto de compras atribuidas por canal (last-touch) + resto no atribuido." : undefined}
      maturity={hasData ? "green" : "amber"}
      actions={[
        { verb: "reasignar", rationale: "Si un canal gana peso de forma sostenida, considera reforzarlo; si otro se apaga, revísalo." },
        { verb: "investigar", rationale: "Un 'no atribuido' alto sugiere instrumentar mejor el tracking (orgánico/directo)." },
      ]}
      delay={delay}
      note="Compras atribuidas por canal (Connectif · daily_revenue). No atribuido = total − Σ atribuido."
    >
      {hasData && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} stackOffset="expand" margin={{ top:5, right:8, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:9, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} interval={Math.max(1,Math.floor(rows.length/8))} />
              <YAxis tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v*100).toFixed(0)}%`} />
              <Tooltip formatter={(v,n)=>[Math.round(v),n]} labelStyle={{ fontSize:11 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:10 }} />
              <Area type="monotone" dataKey="Email" stackId="1" stroke="hsl(221,83%,53%)" fill="hsl(221,83%,53%)" fillOpacity={0.7} />
              <Area type="monotone" dataKey="Push" stackId="1" stroke="hsl(214,95%,68%)" fill="hsl(214,95%,68%)" fillOpacity={0.7} />
              <Area type="monotone" dataKey="Web" stackId="1" stroke="hsl(214,95%,68%)" fill="hsl(214,95%,68%)" fillOpacity={0.7} />
              <Area type="monotone" dataKey="SMS" stackId="1" stroke="hsl(213,96%,80%)" fill="hsl(213,96%,80%)" fillOpacity={0.7} />
              <Area type="monotone" dataKey="No atribuido" stackId="1" stroke="hsl(220,13%,65%)" fill="hsl(220,13%,65%)" fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
