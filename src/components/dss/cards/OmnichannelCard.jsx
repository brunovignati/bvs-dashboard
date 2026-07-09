import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useChannelSegmentation } from "@/lib/useEntities";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const KEYS = [
  { k: "api", label: "API" },
  { k: "web", label: "Web" },
  { k: "retail", label: "Retail" },
  { k: "digital", label: "Digital" },
  { k: "omnichannel", label: "Omnicanal" },
];
const COLORS = ["hsl(217,91%,60%)", "hsl(160,84%,39%)", "hsl(35,92%,56%)", "hsl(280,65%,60%)", "hsl(200,80%,45%)"];

export default function OmnichannelCard({ delay }) {
  const { data = [] } = useChannelSegmentation();
  const present = KEYS.filter(kk => data.some(r => typeof r[kk.k] === "number"));
  const rows = [...data].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month)
    .map(r => { const o = { name:`${M[r.month]} ${String(r.year).slice(2)}` }; present.forEach(p=>o[p.label]=r[p.k]||0); return o; })
    .slice(-18);
  const hasData = rows.length >= 2 && present.length > 0;

  return (
    <EvidenceCard
      question="RV-2b · ¿Cómo se reparte la venta por canal (online / retail / omnicanal)?"
      answer={hasData ? `${present.length} canales de venta` : "Sin datos de canal de venta"}
      answerTone="neutral"
      context={hasData ? "Reparto de compradores por canal físico/digital — dimensión distinta de la atribución de marketing." : "Dataset 20 (channel_segmentation) aún sin histórico suficiente."}
      maturity="amber"
      actions={[
        { verb: "reasignar", rationale: "Si el peso online/retail cambia, ajusta dónde refuerzas la captación." },
        { verb: "investigar", rationale: "Vigila si el omnicanal crece (cliente que combina físico y digital = mayor valor)." },
      ]}
      delay={delay}
      note="Fuente: Dataset 20 · channel_segmentation. Histórico corto: madura con el tiempo."
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
              {present.map((p,i)=>(
                <Area key={p.k} type="monotone" dataKey={p.label} stackId="1" stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]} fillOpacity={0.65} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
