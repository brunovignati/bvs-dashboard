/**
 * SocialProfileVisitsCard (Marketing · Notoriedad) — el paso de "interés" entre alcance y web:
 * ¿la actividad social lleva gente a VISITAR el perfil/página? Usa el dato ya sincronizado de
 * Metricool: Facebook → page_views (visitas a la página), TikTok → profile_views (visitas al
 * perfil). Instagram no expone visitas de perfil en el sync actual, así que no aparece.
 *
 * NOTA de honestidad: NO son "clics de enlace al sitio web" (esa métrica requiere la API de
 * analítica de Metricool, hoy no accesible). Son visitas de perfil/página: la mejor señal de
 * interés por red disponible con el dato actual.
 * Vista A: evolución mensual por red. Vista B: reparto del periodo. Respeta el periodo.
 */
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useFbDaily, useTkDaily } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, monthLabel } from "@/lib/dashboardData";

const NET = [
  { key: "fb", label: "Facebook (página)", field: "page_views", color: "hsl(221,44%,50%)" },
  { key: "tk", label: "TikTok (perfil)", field: "profile_views", color: "hsl(0,0%,20%)" },
];

export default function SocialProfileVisitsCard({ delay }) {
  const { data: fb = [] } = useFbDaily();
  const { data: tk = [] } = useTkDaily();
  const { rangeB, inRange, labelRange } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const hasData = (fb.length + tk.length) > 0 &&
    (fb.some(r => Number(r.page_views) > 0) || tk.some(r => Number(r.profile_views) > 0));
  if (!hasData) {
    return (
      <EvidenceCard sources={["metricool"]}
        question="¿La actividad social lleva gente a visitar el perfil/página?"
        answer="Se enciende con el dato" answerTone="neutral" maturity="amber"
        actions={[{ verb: "investigar", rationale: "Requiere fb_daily.page_views / tk_daily.profile_views poblados por el sync social." }]}
        delay={delay}
        note="Fuente: Metricool · fb_daily (page_views) + tk_daily (profile_views)." />
    );
  }

  // Totales del periodo (reparto)
  const fbP = fb.filter(r => inRange(rangeB, r)).reduce((s, r) => s + (Number(r.page_views) || 0), 0);
  const tkP = tk.filter(r => inRange(rangeB, r)).reduce((s, r) => s + (Number(r.profile_views) || 0), 0);
  const total = fbP + tkP;
  const dist = [
    { name: "Facebook (página)", value: fbP, color: NET[0].color },
    { name: "TikTok (perfil)", value: tkP, color: NET[1].color },
  ].sort((a, b) => b.value - a.value);
  const lead = dist[0];

  // Evolución mensual (hasta el corte, últimos 18 meses)
  const byMonth = {};
  const acc = (arr, field, key) => {
    for (const r of arr) {
      const ym = r.year * 12 + r.month; if (ym > cutoff) continue;
      (byMonth[ym] ||= { ym, label: `${monthLabel(r.month)} ${String(r.year).slice(2)}`, fb: 0, tk: 0 });
      byMonth[ym][key] += Number(r[field]) || 0;
    }
  };
  acc(fb, "page_views", "fb");
  acc(tk, "profile_views", "tk");
  const series = Object.values(byMonth).sort((a, b) => a.ym - b.ym).slice(-18);

  const trend = (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(series.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => fmtNumber(v)} width={38} />
          <Tooltip formatter={(v, n) => [fmtNumber(v), n === "fb" ? "Facebook (página)" : "TikTok (perfil)"]} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
          <Legend formatter={(v) => v === "fb" ? "Facebook (página)" : "TikTok (perfil)"} wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="fb" name="fb" stroke={NET[0].color} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="tk" name="tk" stroke={NET[1].color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const altView = (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dist} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => fmtNumber(v)} width={38} />
          <Tooltip formatter={(v) => [fmtNumber(v), "Visitas"]} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={90}>
            {dist.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <EvidenceCard sources={["metricool"]}
      question="¿La actividad social lleva gente a visitar el perfil/página?"
      answer={lead ? `${lead.name.split(" ")[0]} lidera · ${fmtNumber(lead.value)} visitas` : "Visitas de perfil/página"}
      answerTone="neutral"
      context={`Visitas al perfil/página por red · ${labelRange(rangeB)}. ${fmtNumber(total)} visitas en total. Es el paso de interés entre el alcance social y la web.`}
      kpis={[
        { value: fmtNumber(fbP), label: `Visitas a la página FB · ${labelRange(rangeB)}` },
        { value: fmtNumber(tkP), label: `Visitas al perfil TikTok · ${labelRange(rangeB)}` },
      ]}
      maturity="amber"
      actions={[
        { verb: "investigar", rationale: "Son visitas de perfil/página (interés), no clics de enlace al sitio: cruza con GA4 (tráfico social) para ver cuántas de esas visitas llegan a la web." },
        { verb: "priorizar", rationale: "Si una red genera mucho alcance pero pocas visitas de perfil, el contenido no invita a profundizar: revisa CTA y bio/enlace." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Evolución", b: "Reparto" }}
      note="Fuente: Metricool · fb_daily.page_views (visitas a la página de Facebook) + tk_daily.profile_views (visitas al perfil de TikTok). NO son clics de enlace al sitio (esa métrica requiere la API de analítica de Metricool). Instagram no expone visitas de perfil en el sync actual, por eso no aparece."
    >
      {trend}
    </EvidenceCard>
  );
}
