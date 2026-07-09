import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useDailyEmail, useDailyPush } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function SendVolumeCard({ delay }) {
  const { data: email = [] } = useDailyEmail();
  const { data: push = [] } = useDailyPush();

  const agg = {};
  const add = (arr, key) => { for (const r of arr) { const k = r.year*10000+r.month*100+(r.day||0);
    if (!agg[k]) agg[k] = { k, r, email:0, push:0 }; agg[k][key] += r.sent||0; } };
  add(email, "email"); add(push, "push");
  const rows = Object.values(agg).sort((a,b)=>a.k-b.k).map(d=>({ name:`${d.r.day} ${M[d.r.month]}`, Email:d.email, Push:d.push })).slice(-60);
  const hasData = rows.length >= 5;
  const peak = hasData ? Math.max(...rows.map(r=>r.Email+r.Push)) : 0;

  return (
    <EvidenceCard
      question="¿Hay picos operativos de envío?"
      answer={hasData ? `Pico ${fmtNumber(peak)} env./día` : "Sin datos diarios"}
      answerTone="neutral"
      context={hasData ? "Volumen diario de envío (email + push). Los picos altos concentran riesgo de entregabilidad." : undefined}
      maturity={hasData ? "green" : "amber"}
      actions={[
        { verb: "investigar", rationale: "Un pico inusual puede saturar la reputación de envío: reparte la carga si se repite." },
        { verb: "mantener", rationale: "Volumen estable = entregabilidad más predecible." },
      ]}
      delay={delay}
      note="Fuente: Connectif · daily_email + daily_push (últimos 60 días)."
    >
      {hasData && (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top:5, right:8, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} interval={Math.max(1,Math.floor(rows.length/8))} />
              <YAxis tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v,n)=>[fmtNumber(v),n]} labelStyle={{ fontSize:11 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:10 }} />
              <Area type="monotone" dataKey="Email" stackId="1" stroke="hsl(217,91%,60%)" fill="hsl(217,91%,60%)" fillOpacity={0.5} />
              <Area type="monotone" dataKey="Push" stackId="1" stroke="hsl(262,83%,60%)" fill="hsl(262,83%,60%)" fillOpacity={0.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
