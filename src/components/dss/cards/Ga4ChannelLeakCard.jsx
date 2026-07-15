/**
 * Ga4ChannelLeakCard (Marketing) — ¿en qué paso pierde cada canal?
 * Usa ga4_channel_daily: para cada canal, las tasas de paso del embudo de comportamiento
 *   sesiones → vistas → carrito → checkout → compra.
 * Resalta el CUELLO de botella de cada canal (su paso más flojo). Complementa a
 * Ga4ChannelFunnelCard (que compara conversión total): aquí se ve DÓNDE se pierde cada uno.
 * Comportamiento GA4 (tasas relativas, válidas para comparar). Respeta el periodo.
 */
import EvidenceCard from "../EvidenceCard";
import { useGa4ChannelDaily } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber } from "@/lib/dashboardData";

const STEPS = [
  { key: "view", label: "→ vista", num: "item_views", den: "sessions" },
  { key: "cart", label: "→ carrito", num: "add_to_carts", den: "item_views" },
  { key: "chk", label: "→ checkout", num: "checkouts", den: "add_to_carts" },
  { key: "buy", label: "→ compra", num: "ecommerce_purchases", den: "checkouts" },
];

export default function Ga4ChannelLeakCard({ delay }) {
  const { data = [] } = useGa4ChannelDaily();
  const { rangeB, inRange, labelRange } = useComparison();

  const by = {};
  for (const r of data) {
    if (!inRange(rangeB, r)) continue;
    const k = r.channel || "—";
    (by[k] ||= { channel: k, sessions: 0, item_views: 0, add_to_carts: 0, checkouts: 0, ecommerce_purchases: 0 });
    for (const f of ["sessions", "item_views", "add_to_carts", "checkouts", "ecommerce_purchases"]) by[k][f] += Number(r[f]) || 0;
  }
  const all = Object.values(by).filter(c => c.sessions > 0);
  const totalSes = all.reduce((s, c) => s + c.sessions, 0);
  const chans = all.filter(c => c.sessions >= totalSes * 0.02).sort((a, b) => b.sessions - a.sessions).slice(0, 7)
    .map(c => {
      const steps = STEPS.map(st => ({ ...st, rate: c[st.den] ? (c[st.num] / c[st.den]) * 100 : 0 }));
      // El cuello (leak) se busca SOLO entre pasos de comportamiento comparables (vista/carrito/
      // checkout). El paso «compra» de GA4 infra-cuenta las ventas reales, así que sale
      // artificialmente bajo para TODOS los canales y no es una fuga accionable: se excluye.
      const valid = steps.filter(s => s.key !== "buy" && s.rate > 0);
      const worst = valid.length ? valid.reduce((m, s) => (s.rate < m.rate ? s : m), valid[0]) : null;
      return { ...c, steps, worst, conv: c.sessions ? (c.ecommerce_purchases / c.sessions) * 100 : 0 };
    });
  const hasData = chans.length >= 1 && chans.some(c => c.ecommerce_purchases > 0);

  if (!hasData) {
    return (
      <EvidenceCard sources={["ga4"]}
        question="¿En qué paso pierde cada canal?"
        answer="Se enciende con el dato" answerTone="neutral" maturity="amber"
        actions={[{ verb: "investigar", rationale: "Requiere ga4_channel_daily poblada (embudo por canal). Se enciende tras el sync de GA4." }]}
        delay={delay}
        note="Fuente: GA4 · ga4_channel_daily (sesiones→vistas→carrito→checkout→compra por canal)." />
    );
  }

  // Paso donde más canales tienen su cuello (patrón común)
  const tally = {};
  chans.forEach(c => { if (c.worst) tally[c.worst.label] = (tally[c.worst.label] || 0) + 1; });
  const common = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];

  return (
    <EvidenceCard sources={["ga4"]}
      question="¿En qué paso pierde cada canal?"
      answer={common ? `La fuga más común: «${common[0].replace("→ ", "")}»` : "Embudo por canal"}
      answerTone="neutral"
      context={`Tasa de cada paso del embudo por canal · ${labelRange(rangeB)}. En rojo, el paso más flojo (cuello) de cada canal. Comportamiento GA4, comparación relativa.`}
      maturity="amber"
      actions={[
        { verb: "priorizar", rationale: "Cada canal se optimiza distinto: ataca el paso rojo de cada uno. Si la fuga común es 'carrito' (vista→carrito), la palanca transversal es la ficha de producto y el CTA de añadir al carrito." },
      ]}
      delay={delay}
      note="Fuente: GA4 · ga4_channel_daily. Cada tasa = paso siguiente / paso anterior (comportamiento). El cuello (rojo) se calcula solo entre pasos comparables (vista/carrito/checkout); el paso «compra» de GA4 infra-cuenta las ventas reales (sale bajo para todos) y NO se marca como fuga. Se muestran los canales con ≥2% del tráfico."
    >
      <div className="mt-1 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-muted-foreground border-b border-border/60">
              <th className="text-left font-medium py-1 pr-2">Canal</th>
              <th className="text-right font-medium px-1">Sesiones</th>
              {STEPS.map(s => <th key={s.key} className="text-right font-medium px-1">{s.label}</th>)}
              <th className="text-right font-medium pl-1">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {chans.map((c, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="text-left py-1 pr-2 text-foreground truncate max-w-[110px]" title={c.channel}>{c.channel}</td>
                <td className="text-right px-1 font-mono text-muted-foreground">{fmtNumber(c.sessions)}</td>
                {c.steps.map((s, j) => (
                  <td key={j} className={`text-right px-1 font-mono ${c.worst && s.key === c.worst.key ? "text-red-600 font-semibold" : "text-foreground/80"}`}>
                    {s.rate ? `${s.rate.toFixed(0)}%` : "—"}
                  </td>
                ))}
                <td className="text-right pl-1 font-mono font-semibold text-foreground">{c.conv.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-muted-foreground/70 pt-1.5">Rojo = paso más flojo del canal (su cuello de botella). Conv. = compra/sesión.</p>
      </div>
    </EvidenceCard>
  );
}
