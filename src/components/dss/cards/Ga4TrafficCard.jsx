import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useGa4Daily } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const lbl = (r) => r.month ? `${r.day||""} ${M[r.month]||""}`.trim() : String(r.date_str||"").slice(5);
const EXCLUDE = new Set(["date_str","year","month","day","updated_at","created_at","id"]);
const PREF = ["sessions","users","total_users","totalUsers","active_users","activeUsers","page_views","pageviews","screen_page_views","screenPageViews","conversions","engaged_sessions"];

export default function Ga4TrafficCard({ delay }) {
  const { data = [] } = useGa4Daily();
  const hasData = data.length > 0;

  // Detectar la métrica de tráfico dinámicamente (esquema no documentado)
  const sample = data[data.length - 1] || {};
  const numericKeys = Object.keys(sample).filter(k => !EXCLUDE.has(k) && typeof sample[k] === "number");
  const metric = PREF.find(p => numericKeys.includes(p)) || numericKeys[0];

  if (!hasData || !metric) {
    return (
      <EvidenceCard
        question="MK-6 · ¿De dónde llega el tráfico y cómo se comporta?"
        answer="Sin datos de GA4 aún"
        answerTone="neutral"
        context={hasData ? "La tabla ga4_daily tiene filas pero no una métrica numérica reconocible." : "La tabla ga4_daily todavía no tiene filas."}
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Confirma que el sync de GA4 esté poblando ga4_daily (sesiones/usuarios por día)." }]}
        delay={delay}
        note="Fuente: GA4 · ga4_daily. Se enciende automáticamente cuando haya datos."
      />
    );
  }

  const rows = [...data].sort((a,b)=>((a.date_str||"")<(b.date_str||"")?-1:1))
    .map(r => ({ name: lbl(r), value: Number(r[metric]) || 0 })).slice(-90);
  const last = rows[rows.length-1]?.value || 0;
  const metricLabel = metric.replace(/_/g, " ");

  return (
    <EvidenceCard
      question="MK-6 · ¿De dónde llega el tráfico y cómo se comporta?"
      answer={`${fmtNumber(last)} ${metricLabel}/día`}
      answerTone="neutral"
      context={`Métrica de tráfico detectada: "${metricLabel}". Evolución diaria del comportamiento web.`}
      maturity="amber"
      actions={[
        { verb: "investigar", rationale: "Cruza los picos de tráfico con las campañas de Email/Push para ver qué canal atrae visitas." },
        { verb: "crear", rationale: "Si el tráfico crece pero no la venta, revisa la conversión on-site (sticky/contenido web)." },
      ]}
      delay={delay}
      note="Fuente: GA4 · ga4_daily. Métrica detectada dinámicamente (esquema no fijado). Histórico corto."
    >
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top:5, right:8, left:4, bottom:0 }}>
            <defs>
              <linearGradient id="ga4Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(218,33%,70%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(218,33%,70%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} interval={Math.max(0,Math.floor(rows.length/8))} />
            <YAxis tick={{ fontSize:8, fill:"hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v=>fmtNumber(v)} />
            <Tooltip formatter={(v)=>[fmtNumber(v),metricLabel]} labelStyle={{ fontSize:11 }} />
            <Area type="monotone" dataKey="value" stroke="hsl(218,33%,70%)" fill="url(#ga4Grad)" strokeWidth={1.8} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
