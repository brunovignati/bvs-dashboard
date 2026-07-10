/**
 * SocialContentCard (Marketing) — ¿qué contenido social rinde?
 * Usa ig_reels (views, interactions, engagement, saved, likes, comments) para rankear
 * las piezas por alcance y ver qué formato replicar. Complementa a SocialReachCard
 * (agregado por red) con el detalle por pieza — sin duplicar la misma serie.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useIgReels } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : (s || "(sin texto)"); };

export default function SocialContentCard({ delay }) {
  const { data = [] } = useIgReels();
  const hasData = data.length > 0;

  const ranked = [...data]
    .map(r => ({
      full: r.content,
      name: clip(r.content, 34),
      views: Number(r.views) || 0,
      interactions: Number(r.interactions) || 0,
      engagement: Number(r.engagement) || 0,
      saved: Number(r.saved) || 0,
    }))
    .sort((a, b) => b.views - a.views);
  const top = ranked.slice(0, 6);
  const best = top[0];
  const avgViews = ranked.length ? ranked.reduce((s, r) => s + r.views, 0) / ranked.length : 0;

  if (!hasData) {
    return (
      <EvidenceCard
        question="¿Qué contenido social genera más alcance?"
        answer="Sin datos de reels aún"
        answerTone="neutral"
        context="La tabla ig_reels todavía no tiene filas."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Confirma que el sync de Metricool esté trayendo el detalle de reels." }]}
        delay={delay}
        note="Fuente: Metricool · ig_reels. Se enciende cuando haya reels sincronizados."
      />
    );
  }

  return (
    <EvidenceCard
      question="¿Qué contenido social genera más alcance?"
      answer={best ? `Top reel · ${fmtNumber(best.views)} views` : "Sin reels"}
      answerTone="good"
      context={best ? `"${clip(best.full, 60)}" · ${fmtNumber(best.interactions)} interacciones. Media por reel: ${fmtNumber(avgViews)} views.` : undefined}
      maturity="amber"
      actions={[
        { verb: "crear", rationale: "Replica el formato/tema de los reels con más views: es tu contenido de mayor alcance orgánico." },
        { verb: "escalar", rationale: "Impulsa (o convierte en anuncio) los reels top para amplificar su alcance." },
      ]}
      delay={delay}
      note="Fuente: Metricool · ig_reels (views, interactions, engagement, saved). Top 6 por views."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v => fmtNumber(v)} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [fmtNumber(v), "Views"]} labelFormatter={(l, p) => p?.[0]?.payload?.full || l} labelStyle={{ fontSize: 10 }} />
            <Bar dataKey="views" radius={[0, 4, 4, 0]}>
              {top.map((_, i) => <Cell key={i} fill={i === 0 ? "hsl(220,55%,62%)" : "hsl(221,83%,53%)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
