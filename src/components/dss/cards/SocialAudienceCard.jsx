/**
 * SocialAudienceCard (CRM) — salud de la base de audiencia social: ¿crece o se erosiona?
 * Usa los seguidores por red (ig/fb/tk .followers) y las señales de crecimiento neto que
 * aporta Metricool: fb followers_acquired/followers_lost y tk new_followers.
 * Los seguidores viven SOLO aquí; el alcance/views vive en Marketing (sin duplicar).
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useIgDaily, useFbDaily, useTkDaily } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { upToCutoff } from "@/lib/dss/dssUtils";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const lbl = (r) => (r.month ? `${r.day || ""} ${M[r.month] || ""}`.trim() : String(r.date_str || "").slice(5));

export default function SocialAudienceCard({ delay }) {
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
  const put = (arr, key) => {
    for (const r of arr) {
      const d = r.date_str || `${r.year}-${r.month}-${r.day}`;
      if (!map[d]) map[d] = { d, name: lbl(r) };
      map[d][key] = Number(r.followers) || 0;
    }
  };
  put(ig, "Instagram"); put(fb, "Facebook"); put(tk, "TikTok");
  const rows = Object.values(map).sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-90);

  // Crecimiento neto (últimos 30d): FB acquired-lost, TK new_followers, IG delta de followers
  const fbNet = fb.slice(-30).reduce((s, r) => s + ((Number(r.followers_acquired) || 0) - (Number(r.followers_lost) || 0)), 0);
  const tkNet = tk.slice(-30).reduce((s, r) => s + (Number(r.new_followers) || 0), 0);
  const igFirst = ig.slice(-30)[0]?.followers, igLast = ig[ig.length - 1]?.followers;
  const igNet = (igLast != null && igFirst != null) ? igLast - igFirst : 0;
  const totalNet = fbNet + tkNet + igNet;

  const totalFollowers = (ig[ig.length - 1]?.followers || 0) + (fb[fb.length - 1]?.followers || 0) + (tk[tk.length - 1]?.followers || 0);

  if (!hasData) {
    return (
      <EvidenceCard
        question="¿Crece o se erosiona la base de audiencia social?"
        answer="Sin datos de redes aún"
        answerTone="neutral"
        context="Las tablas de Metricool (ig_daily / fb_daily / tk_daily) todavía no tienen filas."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Confirma que el sync semanal de Metricool esté poblando las tablas sociales." }]}
        delay={delay}
        note="Fuente: Metricool. Se enciende automáticamente cuando el sync acumule datos."
      />
    );
  }

  return (
    <EvidenceCard
      question="¿Crece o se erosiona la base de audiencia social?"
      answer={`${fmtNumber(totalFollowers)} seguidores · ${totalNet >= 0 ? "+" : ""}${fmtNumber(totalNet)}/30d`}
      answerTone={totalNet >= 0 ? "good" : "bad"}
      context={`Neto 30 días — Instagram ${igNet >= 0 ? "+" : ""}${fmtNumber(igNet)} · Facebook ${fbNet >= 0 ? "+" : ""}${fmtNumber(fbNet)} · TikTok ${tkNet >= 0 ? "+" : ""}${fmtNumber(tkNet)}.`}
      maturity="amber"
      actions={[
        { verb: "escalar", rationale: totalNet >= 0 ? "La base crece: mantén la cadencia de publicación que la alimenta." : "La base se erosiona: revisa frecuencia y relevancia del contenido." },
        { verb: "mantener", rationale: "La audiencia social es un activo de captación: vigílala junto a la base de email/push." },
      ]}
      delay={delay}
      note="Fuente: Metricool · followers por red + fb followers_acquired/lost y tk new_followers."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(rows.length / 8))} />
            <YAxis tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v => fmtNumber(v)} />
            <Tooltip formatter={(v, n) => [fmtNumber(v), n]} labelStyle={{ fontSize: 11 }} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="Instagram" stroke="hsl(200,85%,54%)" strokeWidth={1.8} dot={false} connectNulls />
            <Line type="monotone" dataKey="Facebook" stroke="hsl(200,95%,40%)" strokeWidth={1.8} dot={false} connectNulls />
            <Line type="monotone" dataKey="TikTok" stroke="hsl(220,9%,20%)" strokeWidth={1.8} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
