import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useEmailDiario, usePushDiario } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { upToCutoff } from "@/lib/dss/dssUtils";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function SendVolumeCard({ delay }) {
  // Lee las vistas de agregación por día (~745 filas) en vez de daily_email (150k) / daily_push (7k).
  const { data: emailRaw = [] } = useEmailDiario();
  const { data: pushRaw = [] } = usePushDiario();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const email = upToCutoff(emailRaw, cutoff);
  const push = upToCutoff(pushRaw, cutoff);

  const agg = {};
  const add = (arr, key) => { for (const r of arr) { const k = r.year*10000+r.month*100+(r.day||0);
    if (!agg[k]) agg[k] = { k, r, email:0, push:0 }; agg[k][key] += r.sent||0; } };
  add(email, "email"); add(push, "push");
  const rows = Object.values(agg).sort((a,b)=>a.k-b.k).map(d=>({ name:`${d.r.day} ${M[d.r.month]}`, Email:d.email, Push:d.push })).slice(-60);
  const hasData = rows.length >= 5;
  const peak = hasData ? Math.max(...rows.map(r=>r.Email+r.Push)) : 0;

  return (
    <EvidenceCard sources={["connectif"]}
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
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top:5, right:8, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:8, fill:"hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(1,Math.floor(rows.length/8))} />
              <YAxis tick={{ fontSize:8, fill:"hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v,n)=>[fmtNumber(v),n]} labelStyle={{ fontSize:11 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:10 }} />
              <Area type="monotone" dataKey="Email" stackId="1" stroke="hsl(16,79%,57%)" fill="hsl(16,79%,57%)" fillOpacity={0.5} />
              <Area type="monotone" dataKey="Push" stackId="1" stroke="hsl(30,72%,66%)" fill="hsl(30,72%,66%)" fillOpacity={0.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
