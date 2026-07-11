import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useChannelSegmentation } from "@/lib/useEntities";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
// Partición MECE que suma exactamente a total_buyers (online + retail + omnicanal).
// NO se incluyen api_buyers/web_buyers: son otro corte (origen técnico) que solapa con
// digital y produce doble conteo si se apila. Ese era el defecto de la versión anterior.
const KEYS = [
  { k: "digital", label: "Online" },
  { k: "retail", label: "Retail" },
  { k: "omnichannel", label: "Omnicanal" },
];
const COLORS = ["hsl(199,89%,48%)", "hsl(199,80%,64%)", "hsl(199,60%,78%)"];

export default function OmnichannelCard({ delay }) {
  const { data = [] } = useChannelSegmentation();
  const present = KEYS.filter(kk => data.some(r => (r[kk.k] || 0) > 0));
  // Cada serie = CUOTA (%) del canal sobre el total del mes → deja ver la evolución de
  // cada canal por separado (el área apilada aplastaba Retail/Omni).
  const rows = [...data].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month)
    .map(r => {
      const tot = present.reduce((s,p)=>s+(r[p.k]||0),0) || 1;
      const o = { name:`${M[r.month]} ${String(r.year).slice(2)}` };
      present.forEach(p => { o[p.label] = ((r[p.k]||0)/tot)*100; o[`${p.label}__n`] = r[p.k]||0; });
      return o;
    })
    .slice(-18);
  const hasData = rows.length >= 2 && present.length > 0;
  const last = hasData ? rows[rows.length - 1] : null;

  return (
    <EvidenceCard
      question="¿Cómo se reparte la venta por canal (online / retail / omnicanal)?"
      answer={hasData
        ? present.map(p => `${p.label} ${Math.round(last[p.label] || 0)}%`).join(" · ")
        : "Sin datos de canal de venta"}
      answerTone="neutral"
      context={hasData ? "Reparto de compradores por canal (online / retail / omnicanal). Partición exclusiva que suma el 100% del total — dimensión distinta de la atribución de marketing." : "Dataset 20 (channel_segmentation) aún sin histórico suficiente."}
      maturity="amber"
      actions={[
        { verb: "reasignar", rationale: "Si el peso online/retail cambia, ajusta dónde refuerzas la captación." },
        { verb: "investigar", rationale: "Vigila si el omnicanal crece (cliente que combina físico y digital = mayor valor)." },
      ]}
      delay={delay}
      note="Fuente: Dataset 20 · channel_segmentation. Histórico corto: madura con el tiempo."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top:5, right:8, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:9, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} interval={Math.max(1,Math.floor(rows.length/8))} />
              <YAxis tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} domain={[0,100]} tickFormatter={v=>`${v.toFixed(0)}%`} />
              <Tooltip formatter={(v,n,p)=>[`${Number(v).toFixed(1)}% · ${(p?.payload?.[`${n}__n`]||0).toLocaleString("es-ES")} compradores`, n]} labelStyle={{ fontSize:11 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:10 }} />
              {present.map((p,i)=>(
                <Line key={p.k} type="monotone" dataKey={p.label} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
