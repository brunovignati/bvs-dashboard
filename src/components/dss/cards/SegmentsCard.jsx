import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useSegments } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";

export default function SegmentsCard({ delay }) {
  const { data = [] } = useSegments();
  // segments trae varios snapshots mensuales → deduplicar por nombre al MÁS RECIENTE,
  // si no cada segmento sale repetido y el total se infla sumando meses.
  const latest = {};
  for (const s of data) {
    if (!s.segment) continue;
    const ym = (s.year || 0) * 12 + (s.month || 0);
    if (!latest[s.segment] || ym > latest[s.segment]._ym) latest[s.segment] = { ...s, _ym: ym };
  }
  const clean = Object.values(latest).filter(s => !/test|prueba|_old|borrar/i.test(s.segment) && (s.contacts||0) > 0);
  const top = [...clean].sort((a,b)=>(b.contacts||0)-(a.contacts||0)).slice(0,10)
    .map(s => ({ name: s.segment.length>28 ? s.segment.slice(0,27)+"…" : s.segment, full:s.segment, contacts:s.contacts||0 }));
  const hasData = top.length >= 2;
  const total = clean.reduce((s,r)=>s+(r.contacts||0),0);

  return (
    <EvidenceCard
      question="CR-1 · ¿Cómo se compone mi base de segmentos (incl. RFM)?"
      answer={hasData ? `${fmtNumber(clean.length)} segmentos activos` : "Sin datos"}
      answerTone="neutral"
      context={hasData ? `Base total accionable ≈ ${fmtNumber(total)} contactos (con solapes). Top 10 por tamaño.` : undefined}
      maturity="amber"
      actions={[
        { verb: "crear", rationale: "Dirige la próxima campaña a los segmentos grandes y con intención (RFM 'en riesgo', recencia)." },
        { verb: "investigar", rationale: "Depura segmentos duplicados o zombis (sin crecimiento) para higiene de la base." },
      ]}
      delay={delay}
      note="Fuente: Connectif · segments (snapshot). La evolución se activa al acumular cortes con fecha."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top:4, right:16, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v=>fmtNumber(v)} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v)=>[fmtNumber(v),"Contactos"]} labelFormatter={(l,p)=>p?.[0]?.payload?.full||l} labelStyle={{ fontSize:10 }} />
              <Bar dataKey="contacts" radius={[0,4,4,0]}>
                {top.map((_,i)=><Cell key={i} fill={i===0?"hsl(199,80%,64%)":"hsl(199,89%,48%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
