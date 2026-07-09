import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useEnvios } from "@/lib/useEntities";
import { fmtCurrency } from "@/lib/dashboardData";

const DAYS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function BestDayCard({ delay }) {
  const { data = [] } = useEnvios();
  const rows = [...data].sort((a,b)=>(a.dayOfWeek||0)-(b.dayOfWeek||0)).map(d => ({
    name: d.dayName || DAYS[d.dayOfWeek] || String(d.dayOfWeek),
    rpm: (d.sent||0) > 0 ? ((d.revenue||0)/d.sent)*1000 : 0,
    revenue: d.revenue||0, sent: d.sent||0,
  }));
  const hasData = rows.length >= 3 && rows.some(r=>r.sent>0);
  const best = hasData ? [...rows].sort((a,b)=>b.rpm-a.rpm)[0] : null;

  return (
    <EvidenceCard
      question="MK-5 · ¿Cuál es el mejor día para enviar?"
      answer={hasData && best ? `${best.name}` : "Sin datos"}
      answerTone={hasData ? "good" : "neutral"}
      context={hasData && best ? `Mayor revenue por 1.000 envíos (€${best.rpm.toFixed(0)}). Normaliza por volumen, no por total bruto.` : undefined}
      maturity="amber"
      actions={[
        { verb: "mantener", rationale: hasData && best ? `Concentra los envíos importantes en ${best.name} y días de eficiencia similar.` : "Define el calendario de envío por eficiencia, no por costumbre." },
        { verb: "crear", rationale: "Prueba mover una campaña al mejor día y compara el resultado la semana siguiente." },
      ]}
      delay={delay}
      note="Fuente: Connectif · envios (agregado histórico por día de la semana). RPMil = revenue / envíos × 1.000."
    >
      {hasData && (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top:5, right:8, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:9, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v=>`€${v.toFixed(0)}`} />
              <Tooltip formatter={(v)=>[`€${Number(v).toFixed(1)}`,"Rev/1.000 env."]} labelStyle={{ fontSize:11 }} />
              <Bar dataKey="rpm" radius={[3,3,0,0]}>
                {rows.map((r,i)=><Cell key={i} fill={best&&r.name===best.name?"hsl(214,95%,68%)":"hsl(221,83%,53%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
