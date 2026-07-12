/**
 * SocialReachCard (Marketing) — notoriedad/alcance: cuántas visualizaciones genera
 * cada red. Usa la métrica de distribución de cada plataforma:
 *   Instagram → views · Facebook → page_media_view · TikTok → account_views
 * (Los seguidores/base viven en CRM, no aquí, para no duplicar datos entre secciones.)
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useIgDaily, useFbDaily, useTkDaily } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { upToCutoff } from "@/lib/dss/dssUtils";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const lbl = (r) => (r.month ? `${r.day || ""} ${M[r.month] || ""}`.trim() : String(r.date_str || "").slice(5));

export default function SocialReachCard({ delay }) {
  const { data: igRaw = [] } = useIgDaily();
  const { data: fbRaw = [] } = useFbDaily();
  const { data: tkRaw = [] } = useTkDaily();
  const { rangeB } = useComparison();
  // El comparador controla la ventana: hasta el final del período principal.
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const ig = upToCutoff(igRaw, cutoff);
  const fb = upToCutoff(fbRaw, cutoff);
  const tk = upToCutoff(tkRaw, cutoff);
  const hasData = ig.length + fb.length + tk.length > 0;

  const map = {};
  const put = (arr, key, field) => {
    for (const r of arr) {
      const d = r.date_str || `${r.year}-${r.month}-${r.day}`;
      if (!map[d]) map[d] = { d, name: lbl(r) };
      map[d][key] = Number(r[field]) || 0;
    }
  };
  put(ig, "Instagram", "views");
  put(fb, "Facebook", "page_media_view");
  put(tk, "TikTok", "account_views");
  const rows = Object.values(map).sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-90);

  const sum = (arr, f) => arr.reduce((s, r) => s + (Number(r[f]) || 0), 0);
  const totals = [
    ["Instagram", sum(ig.slice(-30), "views")],
    ["Facebook", sum(fb.slice(-30), "page_media_view")],
    ["TikTok", sum(tk.slice(-30), "account_views")],
  ].filter(t => t[1] > 0).sort((a, b) => b[1] - a[1]);
  const leader = totals[0];

  if (!hasData) {
    return (
      <EvidenceCard
        question="¿Cuánta notoriedad y alcance generan las redes?"
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
      question="¿Cuánta notoriedad y alcance generan las redes?"
      answer={leader ? `${leader[0]} lidera · ${fmtNumber(leader[1])} views/30d` : "Sin visualizaciones"}
      answerTone="neutral"
      context="Visualizaciones por red (IG views · FB vistas de contenido · TikTok views de cuenta). Distribución del contenido orgánico."
      maturity="amber"
      actions={[
        { verb: "escalar", rationale: leader ? `${leader[0]} es la red con más alcance: prioriza formato y frecuencia ahí.` : "Refuerza la red con más alcance." },
        { verb: "crear", rationale: "Si una red pierde visualizaciones, prueba un nuevo formato de contenido." },
      ]}
      delay={delay}
      note="Fuente: Metricool · ig_daily.views / fb_daily.page_media_view / tk_daily.account_views."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(rows.length / 8))} />
            <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => fmtNumber(v)} />
            <Tooltip formatter={(v, n) => [fmtNumber(v), n]} labelStyle={{ fontSize: 11 }} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="Instagram" stroke="hsl(30,72%,66%)" strokeWidth={1.8} dot={false} connectNulls />
            <Line type="monotone" dataKey="Facebook" stroke="hsl(16,79%,57%)" strokeWidth={1.8} dot={false} connectNulls />
            <Line type="monotone" dataKey="TikTok" stroke="hsl(220,9%,20%)" strokeWidth={1.8} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
