/**
 * MarketingFunnelCard (Marketing) — ¿está funcionando el marketing? (embudo completo)
 *
 * Embudo de conversión CONECTADO 1:1 de una sola fuente (Connectif · email_campaigns):
 *   Enviados → Aperturas → Clics → Compras → Revenue.
 * Cada etapa es un subconjunto real de la anterior, así que las tasas entre pasos son
 * matemáticamente válidas (no cruzamos universos como alcance social/sesiones GA4).
 * La notoriedad (Metricool) y el tráfico (GA4) viven en sus propias tarjetas porque NO
 * se conectan 1:1 con este recorrido; el push tiene su tarjeta de rendimiento aparte.
 */
import EvidenceCard from "../EvidenceCard";
import { useEmailCampaigns } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { wilson } from "@/lib/dss/dssUtils";
import { fmtNumber, fmtCurrency } from "@/lib/dashboardData";
import { ChevronDown } from "lucide-react";

export default function MarketingFunnelCard({ delay }) {
  const { data = [] } = useEmailCampaigns();
  const { rangeB, labelRange } = useComparison();
  const s = rangeB.start.year * 12 + rangeB.start.month;
  const e = rangeB.end.year * 12 + rangeB.end.month;

  const rows = data.filter(r => { const k = r.year * 12 + r.month; return k >= s && k <= e && (r.sent || 0) > 0; });
  const T = rows.reduce((a, r) => ({
    sent: a.sent + (r.sent || 0), opens: a.opens + (r.opens || 0), clicks: a.clicks + (r.clicks || 0),
    purchases: a.purchases + (r.purchases || 0), revenue: a.revenue + (r.revenue || 0),
  }), { sent: 0, opens: 0, clicks: 0, purchases: 0, revenue: 0 });
  const hasData = T.sent > 0;

  if (!hasData) {
    return (
      <EvidenceCard sources={["connectif"]} question="¿Está funcionando el marketing? (embudo completo)" answer="Sin envíos en el período"
        answerTone="neutral" maturity="amber" delay={delay}
        actions={[{ verb: "investigar", rationale: "No hay campañas de email con envíos en el período seleccionado." }]} />
    );
  }

  const stages = [
    { key: "sent", label: "Enviados", value: T.sent },
    { key: "opens", label: "Aperturas", value: T.opens },
    { key: "clicks", label: "Clics", value: T.clicks },
    { key: "purchases", label: "Compras", value: T.purchases },
  ];
  const maxV = T.sent || 1;
  // Tasas de paso (conectadas) con IC 95% de Wilson
  const steps = [
    { label: "apertura", num: T.opens, den: T.sent },
    { label: "clic / apertura", num: T.clicks, den: T.opens },
    { label: "compra / clic", num: T.purchases, den: T.clicks },
  ].map(st => ({ ...st, ci: wilson(st.num, st.den) }));
  const ticket = T.purchases > 0 ? T.revenue / T.purchases : 0;

  // Cuello de botella = el paso que MENOS retiene
  const worst = steps.reduce((m, st) => (st.ci.mid < m.ci.mid ? st : m), steps[0]);

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Está funcionando el marketing? (embudo completo)"
      answer={`${fmtCurrency(T.revenue)} · ${fmtNumber(T.purchases)} compras`}
      answerTone="neutral"
      context={`Embudo de email conectado (Connectif) · ${labelRange(rangeB)}. Etapas encadenadas 1:1, tasas válidas entre pasos. El mayor descarte está en «${worst.label}» (${worst.ci.mid.toFixed(worst.ci.mid < 10 ? 2 : 1)}%).`}
      maturity="green"
      actions={[
        { verb: "investigar", rationale: `El cuello de botella del embudo es «${worst.label}». Ataca ese paso: asunto/preheader para apertura, oferta/enlace para clic, o landing/checkout para compra.` },
        { verb: "escalar", rationale: "Refuerza las campañas cuya tasa de compra/clic supera la media (ver tarjeta de escala de email)." },
      ]}
      delay={delay}
      note="Fuente única: Connectif · email_campaigns. Tasas entre pasos con IC 95% de Wilson. Notoriedad (Metricool) y tráfico (GA4) van en sus propias tarjetas porque no se conectan 1:1 con este recorrido; push tiene su tarjeta aparte."
    >
      <div className="space-y-1">
        {stages.map((st, i) => (
          <div key={st.key}>
            <div className="flex items-baseline justify-between text-xs mb-0.5">
              <span className="text-muted-foreground">{st.label}</span>
              <span className="font-mono font-semibold text-foreground">{fmtNumber(st.value)}</span>
            </div>
            <div className="h-2.5 rounded bg-muted/50 overflow-hidden">
              <div className="h-full rounded bg-primary/80" style={{ width: `${Math.max(1.5, (st.value / maxV) * 100)}%` }} />
            </div>
            {i < steps.length && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground py-0.5">
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">
                  {steps[i].ci.mid.toFixed(steps[i].ci.mid < 10 ? 2 : 1)}% {steps[i].label}
                  <span className="text-muted-foreground/60"> ±{steps[i].ci.half.toFixed(steps[i].ci.half < 1 ? 2 : 1)}</span>
                </span>
              </div>
            )}
          </div>
        ))}
        <div className="flex items-baseline justify-between pt-2 mt-1 border-t border-border text-xs">
          <span className="text-muted-foreground">Revenue · ticket medio</span>
          <span className="font-mono font-semibold text-foreground">{fmtCurrency(T.revenue)} · {fmtCurrency(ticket)}/compra</span>
        </div>
      </div>
    </EvidenceCard>
  );
}
