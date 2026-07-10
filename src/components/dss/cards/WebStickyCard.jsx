import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useStickyData } from "@/lib/useEntities";
import { fmtCurrency } from "@/lib/dashboardData";

export default function WebStickyCard({ delay }) {
  const { data = [] } = useStickyData();
  // Ordena por EFICIENCIA (tasa de conversión), no por revenue absoluto: el revenue bruto
  // favorece a los sticky más antiguos. Sin impresiones en la tabla, convRate es el mejor
  // proxy de eficiencia disponible; el revenue queda como contexto en el tooltip.
  const rows = [...data].filter(s => s.workflow)
    .sort((a,b)=>(b.convRate||0)-(a.convRate||0) || (b.revenue||0)-(a.revenue||0)).slice(0,8)
    .map(s => ({ name: s.workflow.length>26 ? s.workflow.slice(0,25)+"…" : s.workflow, full:s.workflow,
      revenue:s.revenue||0, conv:(s.convRate||0), inactive:(s.convRate||0)===0 }));
  const hasData = rows.length >= 2;
  const active = rows.filter(r=>!r.inactive);
  const best = active[0];

  return (
    <EvidenceCard
      question="¿Convierte el contenido web / sticky? (captación)"
      answer={hasData ? (best ? `Top: ${best.name}` : "Sin piezas activas") : "Sin datos"}
      answerTone={hasData && best ? "good" : "warn"}
      context={hasData ? `Ordenado por tasa de conversión. ${active.length}/${rows.length} piezas convierten > 0; el resto, candidatas a retirar.` : undefined}
      maturity="amber"
      actions={[
        { verb: "escalar", rationale: best ? `Mayor eficiencia de conversión: "${best.name}". Replícala.` : "Prioriza las piezas con conversión probada." },
        { verb: "detener", rationale: "Retira los sticky con conversión 0 sostenida (ocupan espacio sin captar)." },
      ]}
      delay={delay}
      note="Fuente: Connectif · sticky (acumulado sin fecha). Ranking por tasa de conversión (eficiencia), no por revenue bruto; sin impresiones disponibles, convRate es el mejor proxy. Revenue en el tooltip."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top:4, right:16, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(1)}%`} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v,n,p)=>[`${Number(v).toFixed(2)}% · ${fmtCurrency(p?.payload?.revenue||0)}`,"Conversión · Revenue"]} labelFormatter={(l,p)=>p?.[0]?.payload?.full||l} labelStyle={{ fontSize:10 }} />
              <Bar dataKey="conv" radius={[0,4,4,0]}>
                {rows.map((r,i)=><Cell key={i} fill={r.inactive?"hsl(220,13%,70%)":i===0?"hsl(220,55%,62%)":"hsl(221,83%,53%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
