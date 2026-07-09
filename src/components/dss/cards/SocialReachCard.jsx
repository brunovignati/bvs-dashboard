import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useIgDaily, useFbDaily, useTkDaily } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const lbl = (r) => r.month ? `${r.day||""} ${M[r.month]||""}`.trim() : String(r.date_str||"").slice(5);

export default function SocialReachCard({ delay }) {
  const { data: ig = [] } = useIgDaily();
  const { data: fb = [] } = useFbDaily();
  const { data: tk = [] } = useTkDaily();
  const hasData = ig.length + fb.length + tk.length > 0;

  // Merge por fecha
  const map = {};
  const put = (arr, key) => { for (const r of arr) { const d = r.date_str || `${r.year}-${r.month}-${r.day}`;
    if (!map[d]) map[d] = { d, name: lbl(r) }; map[d][key] = Number(r.followers) || 0; } };
  put(ig, "Instagram"); put(fb, "Facebook"); put(tk, "TikTok");
  const rows = Object.values(map).sort((a, b) => a.d < b.d ? -1 : 1).slice(-90);

  const lastIg = ig[ig.length-1]?.followers, lastFb = fb[fb.length-1]?.followers, lastTk = tk[tk.length-1]?.followers;
  const parts = [["IG",lastIg],["FB",lastFb],["TikTok",lastTk]].filter(p=>p[1]!=null);
  const answer = parts.length ? parts.map(p=>`${p[0]} ${fmtNumber(p[1])}`).join(" · ") : "Sin datos de redes aún";

  if (!hasData) {
    return (
      <EvidenceCard
        question="MK-7 · ¿Generan notoriedad y alcance las redes?"
        answer="Sin datos de redes aún"
        answerTone="neutral"
        context="Las tablas de Metricool (ig_daily / fb_daily / tk_daily) todavía no tienen filas."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Confirma que el sync semanal de Metricool (Cowork) esté poblando las tablas sociales." }]}
        delay={delay}
        note="Fuente: Metricool. Se enciende automáticamente cuando el sync acumule datos."
      />
    );
  }

  return (
    <EvidenceCard
      question="MK-7 · ¿Generan notoriedad y alcance las redes?"
      answer={answer}
      answerTone="neutral"
      context="Evolución de seguidores por red (Instagram, Facebook, TikTok)."
      maturity="amber"
      actions={[
        { verb: "escalar", rationale: "Refuerza la red que más crece en seguidores/alcance." },
        { verb: "crear", rationale: "Si una red se estanca, prueba nuevo formato de contenido." },
      ]}
      delay={delay}
      note="Fuente: Metricool · ig_daily / fb_daily / tk_daily (histórico corto: madura con el tiempo)."
    >
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top:5, right:8, left:4, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} interval={Math.max(0,Math.floor(rows.length/8))} />
            <YAxis tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v=>fmtNumber(v)} />
            <Tooltip formatter={(v,n)=>[fmtNumber(v),n]} labelStyle={{ fontSize:11 }} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:10 }} />
            <Line type="monotone" dataKey="Instagram" stroke="hsl(214,95%,68%)" strokeWidth={1.8} dot={false} connectNulls />
            <Line type="monotone" dataKey="Facebook" stroke="hsl(221,83%,53%)" strokeWidth={1.8} dot={false} connectNulls />
            <Line type="monotone" dataKey="TikTok" stroke="hsl(220,9%,20%)" strokeWidth={1.8} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
