/**
 * SocialContentCard (Marketing) — ¿qué contenido funciona en cada red?
 * Mide ÉXITO por engagement (interacciones por alcance, rate normalizado de Metricool)
 * y no solo por views, más un segundo indicador de valor (guardados / compartidos).
 * Cubre las 3 redes con datos por pieza: Instagram (ig_reels), Facebook (fb_posts),
 * TikTok (tk_videos). Selector de red; cada una lee su propio hook.
 */
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useIgReels, useFbPosts, useTkVideos } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : (s || "(sin texto)"); };
const num = (v) => Number(v) || 0;

const NETS = [
  { id: "ig", label: "Instagram", secLabel: "Guardados" },
  { id: "fb", label: "Facebook", secLabel: "Compartidos" },
  { id: "tk", label: "TikTok", secLabel: "Compartidos" },
];

export default function SocialContentCard({ delay }) {
  const [net, setNet] = useState("ig");
  const { data: ig = [] } = useIgReels();
  const { data: fb = [] } = useFbPosts();
  const { data: tk = [] } = useTkVideos();

  // Normalizar cada red a {full, name, engagement, reach, views, secondary}
  const norm = {
    ig: ig.map(r => ({ full: r.content, engagement: num(r.engagement), reach: num(r.reach), views: num(r.views), secondary: num(r.saved) })),
    fb: fb.map(r => ({ full: r.content, engagement: num(r.engagement), reach: num(r.reach), views: num(r.video_views), secondary: num(r.shares) })),
    tk: tk.map(r => ({ full: r.description, engagement: num(r.engagement), reach: num(r.reach), views: num(r.views), secondary: num(r.shares) })),
  };
  const cfg = NETS.find(n => n.id === net);
  const items = [...norm[net]].sort((a, b) => b.engagement - a.engagement);
  const top = items.slice(0, 6).map(r => ({ ...r, name: clip(r.full, 32) }));
  const hasData = items.length > 0;
  const best = top[0];
  const avgEng = items.length ? items.reduce((s, r) => s + r.engagement, 0) / items.length : 0;

  return (
    <EvidenceCard
      question="¿Qué contenido funciona en cada red?"
      answer={hasData ? `${cfg.label}: top ${best.engagement.toFixed(1)} engagement` : `Sin datos de ${cfg.label} aún`}
      answerTone={hasData ? "good" : "neutral"}
      context={hasData
        ? `"${clip(best.full, 60)}" · ${fmtNumber(best.reach || best.views)} de alcance · ${fmtNumber(best.secondary)} ${cfg.secLabel.toLowerCase()}. Engagement medio ${avgEng.toFixed(1)}.`
        : (net === "ig" ? "La tabla ig_reels aún no tiene filas." : `La tabla ${net === "fb" ? "fb_posts" : "tk_videos"} se enciende cuando el sync la rellene.`)}
      maturity="amber"
      actions={[
        { verb: "crear", rationale: "Replica el tema/formato de las piezas con más engagement: es el contenido que de verdad resuena, no solo el más visto." },
        { verb: "escalar", rationale: `Impulsa (o convierte en anuncio) las piezas con más ${cfg.secLabel.toLowerCase()}: son señal de valor real.` },
      ]}
      delay={delay}
      note="Éxito = engagement (interacciones / alcance) de Metricool. Fuente: ig_reels / fb_posts / tk_videos. Top 6 por engagement."
    >
      <div className="flex gap-1 p-0.5 bg-muted/40 rounded-lg w-fit mb-3">
        {NETS.map(n => (
          <button key={n.id} onClick={() => setNet(n.id)}
            className={`text-xs px-2.5 py-1 rounded-md ${net === n.id ? "bg-card shadow text-foreground font-semibold" : "text-muted-foreground"}`}>
            {n.label}
          </button>
        ))}
      </div>
      {hasData ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v, n, p) => [`${Number(v).toFixed(1)} · ${fmtNumber(p.payload.reach || p.payload.views)} alcance · ${fmtNumber(p.payload.secondary)} ${cfg.secLabel.toLowerCase()}`, "Engagement"]}
                labelFormatter={(l, p) => p?.[0]?.payload?.full || l} labelStyle={{ fontSize: 10 }} />
              <Bar dataKey="engagement" radius={[0, 4, 4, 0]}>
                {top.map((_, i) => <Cell key={i} fill={i === 0 ? "hsl(220,55%,62%)" : "hsl(221,83%,53%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">Sin datos de {cfg.label} aún — se encenderá cuando el sync de Metricool acumule contenido.</p>
      )}
    </EvidenceCard>
  );
}
