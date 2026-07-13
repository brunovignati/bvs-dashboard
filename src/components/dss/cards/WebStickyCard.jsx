import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useDailySticky } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";

export default function WebStickyCard({ delay }) {
  // Desde el dato DIARIO (daily_sticky) con nombre de pieza + fecha → así el ranking
  // respeta el periodo del selector (antes usaba la tabla `sticky` acumulada sin fecha).
  const { data = [] } = useDailySticky();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const agg = {};
  for (const r of data) {
    if ((r.year * 12 + r.month) > cutoff) continue;
    const name = r.contentName || r.content_name;
    if (!name) continue;
    const a = (agg[name] ||= { name, opens: 0, clicks: 0, buyers: 0, revenue: 0 });
    a.opens += r.opens || 0; a.clicks += r.clicks || 0; a.buyers += r.buyers || 0; a.revenue += r.revenue || 0;
  }
  const rows = Object.values(agg)
    .map(s => ({
      name: s.name.length > 26 ? s.name.slice(0, 25) + "…" : s.name, full: s.name,
      revenue: s.revenue, conv: s.opens > 0 ? (s.buyers / s.opens) * 100 : 0, inactive: (s.buyers || 0) === 0,
    }))
    .sort((a, b) => (b.conv - a.conv) || (b.revenue - a.revenue))
    .slice(0, 8);
  const hasData = rows.length >= 2;
  const active = rows.filter(r => !r.inactive);
  const best = active[0];

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Convierte el contenido web / sticky? (captación)"
      answer={hasData ? (best ? `Top: ${best.name}` : "Sin piezas activas") : "Sin datos en el período"}
      answerTone={hasData && best ? "good" : "warn"}
      context={hasData ? `Ordenado por conversión (compradores/aperturas). ${active.length}/${rows.length} piezas convierten > 0 en el período; el resto, candidatas a retirar.` : undefined}
      maturity="amber"
      actions={[
        { verb: "escalar", rationale: best ? `Mayor eficiencia de conversión: "${best.name}". Replícala.` : "Prioriza las piezas con conversión probada." },
        { verb: "detener", rationale: "Retira los sticky con conversión 0 sostenida (ocupan espacio sin captar)." },
      ]}
      delay={delay}
      note="Fuente: Connectif · daily_sticky (por pieza y día → respeta el periodo). Conversión = compradores / aperturas de la pieza; revenue en el tooltip."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top:4, right:16, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:8, fill:"hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(1)}%`} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize:8, fill:"hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v,n,p)=>[`${Number(v).toFixed(2)}% · ${fmtCurrency(p?.payload?.revenue||0)}`,"Conversión · Revenue"]} labelFormatter={(l,p)=>p?.[0]?.payload?.full||l} labelStyle={{ fontSize:10 }} />
              <Bar dataKey="conv" radius={[0,4,4,0]}>
                {rows.map((r,i)=><Cell key={i} fill={r.inactive?"hsl(220,13%,70%)":i===0?"hsl(30,72%,66%)":"hsl(16,79%,57%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
