/**
 * EmailDeliverabilityCard (Salud) — ¿se mantiene la apertura de email?
 * Usa la apertura MENSUAL de email_campaigns (opens/envíos), que es una tasa acotada
 * y fiable (~40%), en vez del ratio diario de daily_email (que acumula aperturas y
 * puede superar el 100%). Marca desviación respecto a la media de meses recientes.
 */
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useEmailCampaigns } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { wilson } from "@/lib/dss/dssUtils";
import { CHART_H, GRID, AXIS, TIP, PRIMARY } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function EmailDeliverabilityCard({ delay }) {
  const { data = [] } = useEmailCampaigns();
  const { rangeB } = useComparison();
  // El comparador controla la ventana: el "mes actual" es el final del período principal.
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const byM = {};
  for (const r of data) {
    if (!(r.sent > 0)) continue;
    const k = r.year * 12 + r.month;
    if (k > cutoff) continue;
    if (!byM[k]) byM[k] = { k, year: r.year, month: r.month, sent: 0, opens: 0 };
    byM[k].sent += r.sent || 0;
    byM[k].opens += r.opens || 0;
  }
  const months = Object.values(byM).sort((a, b) => a.k - b.k)
    .map(m => {
      const ci = wilson(m.opens, m.sent);
      return { name: `${M[m.month]} ${String(m.year).slice(2)}`, value: ci.mid, band: [ci.low, ci.high], half: ci.half, sent: m.sent };
    })
    .slice(-12);
  const hasData = months.length >= 3;

  if (!hasData) {
    return (
      <EvidenceCard
        question="¿Se mantiene la apertura de email?"
        answer="Sin datos suficientes"
        answerTone="neutral"
        context="Aún no hay suficientes meses de campañas de email."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Verifica que el sync de Connectif esté poblando email_campaigns." }]}
        delay={delay}
      />
    );
  }

  const last = months[months.length - 1];
  const prior = months.slice(-4, -1); // 3 meses anteriores
  const mean = prior.length ? prior.reduce((s, r) => s + r.value, 0) / prior.length : last.value;
  // Solo consideramos "caída" si además es significativa (la media queda fuera del IC del último mes).
  const drop = mean > 0 && last.value < mean * 0.92 && mean > last.value + last.half;

  return (
    <EvidenceCard
      question="¿Se mantiene la apertura de email?"
      answer={`${last.value.toFixed(1)}% ± ${last.half.toFixed(1)}`}
      answerTone={drop ? "bad" : "good"}
      context={drop
        ? `Por debajo de la media reciente (${mean.toFixed(1)}%) de forma significativa. Revisa asunto, segmentación o entregabilidad.`
        : `En línea con la media reciente (${mean.toFixed(1)}%); la variación cae dentro del margen de error.`}
      maturity="green"
      severity={drop ? "medium" : undefined}
      actions={drop
        ? [{ verb: "investigar", rationale: "Una caída sostenida de apertura puede indicar problema de reputación/entregabilidad o fatiga de lista." }]
        : [{ verb: "mantener", rationale: "Apertura estable; sin acción hoy." }]}
      delay={delay}
      note="Apertura mensual = aperturas / envíos (Connectif · email_campaigns). Banda = IC 95% de Wilson. Media reciente = 3 meses previos."
    >
      <div className={CHART_H}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={months} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(months.length / 8))} />
            <YAxis {...AXIS} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, "auto"]} />
            <Tooltip formatter={(v, n) => n === "band"
              ? [`${v[0].toFixed(1)}–${v[1].toFixed(1)}%`, "IC 95%"]
              : [`${Number(v).toFixed(1)}%`, "Apertura"]} {...TIP} />
            {mean > 0 && <ReferenceLine y={mean} stroke="hsl(220,13%,72%)" strokeDasharray="4 3"
              label={{ value: `media ${mean.toFixed(0)}%`, position: "right", fontSize: 9, fill: "hsl(220,10%,50%)" }} />}
            <Area type="monotone" dataKey="band" stroke="none" fill={PRIMARY} fillOpacity={0.14} isAnimationActive={false} />
            <Line type="monotone" dataKey="value" stroke={PRIMARY} strokeWidth={2.2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
