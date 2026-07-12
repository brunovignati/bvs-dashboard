/**
 * EmailDeliverabilityCard (Salud) — ¿se mantiene el interés por el email?
 * La APERTURA está inflada desde 2021 por Apple Mail Privacy Protection (precarga
 * aperturas aunque nadie abra), así que como señal aislada engaña. Añadimos el
 * CLIC/ENVÍO (CTR), que MPP NO afecta, como métrica fiable y la juzgamos a ella.
 * Ambas tasas son mensuales (email_campaigns), acotadas y con IC de Wilson.
 */
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useEmailCampaigns } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { wilson } from "@/lib/dss/dssUtils";
import { CHART_H, GRID, AXIS, TIP, PRIMARY } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CTR_COLOR = "hsl(200,55%,30%)";

export default function EmailDeliverabilityCard({ delay }) {
  const { data = [] } = useEmailCampaigns();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const byM = {};
  for (const r of data) {
    if (!(r.sent > 0)) continue;
    const k = r.year * 12 + r.month;
    if (k > cutoff) continue;
    if (!byM[k]) byM[k] = { k, year: r.year, month: r.month, sent: 0, opens: 0, clicks: 0 };
    byM[k].sent += r.sent || 0;
    byM[k].opens += r.opens || 0;
    byM[k].clicks += r.clicks || 0;
  }
  const months = Object.values(byM).sort((a, b) => a.k - b.k)
    .map(m => {
      const open = wilson(m.opens, m.sent);
      const ctr = wilson(m.clicks, m.sent);
      return {
        name: `${M[m.month]} ${String(m.year).slice(2)}`,
        value: open.mid, band: [open.low, open.high], half: open.half,
        ctr: ctr.mid, ctrHalf: ctr.half, sent: m.sent,
      };
    })
    .slice(-12);
  const hasData = months.length >= 3;
  const hasClicks = months.some(m => m.ctr > 0);

  if (!hasData) {
    return (
      <EvidenceCard
        question="¿Se mantiene el interés por el email?"
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
  const prior = months.slice(-4, -1);
  // Juzgamos la CAÍDA sobre el CLIC (señal fiable); si no hay clics, caemos a apertura.
  const key = hasClicks ? "ctr" : "value";
  const halfKey = hasClicks ? "ctrHalf" : "half";
  const mean = prior.length ? prior.reduce((s, r) => s + r[key], 0) / prior.length : last[key];
  const drop = mean > 0 && last[key] < mean * 0.92 && mean > last[key] + last[halfKey];

  return (
    <EvidenceCard
      question="¿Se mantiene el interés por el email?"
      kpis={[
        { value: `${last.ctr.toFixed(1)}%`, label: "Clic / envío · señal fiable" },
        { value: `${last.value.toFixed(0)}%`, label: "Apertura (inflada por MPP)" },
      ]}
      maturity="green"
      severity={drop ? "medium" : undefined}
      insight={hasClicks
        ? (drop
          ? `El clic/envío cae por debajo de su media reciente (${mean.toFixed(1)}%) de forma significativa: es la señal que importa, porque la apertura está inflada por Apple MPP.`
          : `El clic/envío (${last.ctr.toFixed(1)}%) se mantiene en línea con su media reciente (${mean.toFixed(1)}%). La apertura se muestra solo como contexto: MPP la infla y no es fiable por sí sola.`)
        : "Sin dato de clics; se juzga la apertura, pero recuerda que Apple MPP la infla desde 2021."}
      actions={drop
        ? [{ verb: "investigar", rationale: "Una caída sostenida del clic puede indicar fatiga de lista, peor segmentación o problema de entregabilidad." }]
        : [{ verb: "mantener", rationale: "Interés estable; sin acción hoy." }]}
      delay={delay}
      note="Clic/envío = clics / envíos · Apertura = aperturas / envíos (Connectif · email_campaigns), mensual, IC 95% de Wilson. La apertura está inflada por Apple Mail Privacy Protection; el clic no. Media reciente = 3 meses previos."
    >
      <div className={CHART_H}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={months} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(months.length / 8))} />
            <YAxis yAxisId="o" {...AXIS} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, "auto"]} />
            <YAxis yAxisId="c" orientation="right" {...AXIS} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, "auto"]} />
            <Tooltip formatter={(v, n) => n === "band"
              ? [`${v[0].toFixed(1)}–${v[1].toFixed(1)}%`, "Apertura IC 95%"]
              : n === "Clic/envío" ? [`${Number(v).toFixed(2)}%`, n]
              : [`${Number(v).toFixed(1)}%`, "Apertura"]} {...TIP} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
            <Area yAxisId="o" type="monotone" dataKey="band" stroke="none" fill={PRIMARY} fillOpacity={0.1} isAnimationActive={false} legendType="none" />
            <Line yAxisId="o" type="monotone" dataKey="value" name="Apertura (MPP)" stroke={PRIMARY} strokeWidth={1.6} strokeDasharray="4 3" dot={false} />
            <Line yAxisId="c" type="monotone" dataKey="ctr" name="Clic/envío" stroke={CTR_COLOR} strokeWidth={2.4} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
