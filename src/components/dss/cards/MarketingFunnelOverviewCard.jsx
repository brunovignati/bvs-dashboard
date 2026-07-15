/**
 * MarketingFunnelOverviewCard (Marketing · síntesis ejecutiva) — el embudo de marketing de
 * PUNTA A PUNTA, encadenando las 4 fuentes en una sola vista:
 *   Notoriedad (Metricool) → Sesiones/Comportamiento (GA4) → Compra + Revenue REALES (PrestaShop)
 * Cada etapa lleva su distintivo de fuente. La notoriedad social es otra escala (no un
 * subconjunto de las sesiones) y se muestra aparte. El cierre y el revenue son la caja real de
 * PrestaShop. Añade el canal y el dispositivo que mejor convierten (GA4). Respeta el periodo.
 */
import { ChevronDown } from "lucide-react";
import EvidenceCard from "../EvidenceCard";
import { useIgDaily, useFbDaily, useTkDaily, useGa4Daily, usePrestashopMonthly, useGa4ChannelDaily, useGa4DeviceDaily } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, fmtCurrency } from "@/lib/dashboardData";

const DEV = { mobile: "Móvil", desktop: "Escritorio", tablet: "Tablet" };

function bestConv(rows, keyField, inRange, rangeB) {
  const by = {};
  for (const r of rows) {
    if (!inRange(rangeB, r)) continue;
    const k = r[keyField] || "—";
    (by[k] ||= { k, ses: 0, pur: 0 });
    by[k].ses += Number(r.sessions) || 0;
    by[k].pur += Number(r.ecommerce_purchases) || 0;
  }
  const arr = Object.values(by).filter(x => x.ses > 0).map(x => ({ ...x, conv: (x.pur / x.ses) * 100 }));
  if (!arr.length) return null;
  const top = Math.max(...arr.map(x => x.ses));
  const elig = arr.filter(x => x.ses >= top * 0.05 && x.pur > 0);
  return (elig.sort((a, b) => b.conv - a.conv)[0]) || arr.sort((a, b) => b.ses - a.ses)[0];
}

export default function MarketingFunnelOverviewCard({ delay }) {
  const { data: ig = [] } = useIgDaily();
  const { data: fb = [] } = useFbDaily();
  const { data: tk = [] } = useTkDaily();
  const { data: ga = [] } = useGa4Daily();
  const { data: ps = [] } = usePrestashopMonthly();
  const { data: ch = [] } = useGa4ChannelDaily();
  const { data: dv = [] } = useGa4DeviceDaily();
  const { rangeB, inRange, labelRange } = useComparison();

  const sumR = (arr, f) => arr.reduce((s, r) => s + (inRange(rangeB, r) ? (Number(r[f]) || 0) : 0), 0);
  const reach = sumR(ig, "views") + sumR(fb, "page_media_view") + sumR(tk, "account_views");

  const gf = ga.filter(g => inRange(rangeB, g) && g.item_views != null);
  const gv = (f) => gf.reduce((s, g) => s + (Number(g[f]) || 0), 0);
  const sessions = gv("sessions"), itemViews = gv("item_views"), addToCarts = gv("add_to_carts"), checkouts = gv("checkouts");

  const ordersWeb = sumR(ps, "orders_web");
  const revenueWeb = sumR(ps, "revenue_web");
  const conv = sessions ? (ordersWeb / sessions) * 100 : 0;
  const cmp = labelRange(rangeB);

  const topCh = bestConv(ch, "channel", inRange, rangeB);
  const topDv = bestConv(dv, "device", inRange, rangeB);
  const topDvLabel = topDv ? (DEV[topDv.k] || topDv.k) : null;

  const hasCore = sessions > 0 && ordersWeb > 0;
  if (!hasCore) {
    return (
      <EvidenceCard sources={["metricool", "ga4", "prestashop"]}
        question="Embudo de marketing: ¿de la notoriedad a la venta?"
        answer="Se enciende con el dato" answerTone="neutral" maturity="amber"
        actions={[{ verb: "investigar", rationale: "Necesita GA4 (sesiones/embudo, desde may-2026) y pedidos web de PrestaShop en el periodo." }]}
        delay={delay}
        note="Fuentes: Metricool (notoriedad) · GA4 (comportamiento) · PrestaShop (compra/revenue reales)." />
    );
  }

  // Etapas conectadas de comportamiento (GA4) + cierre real (PrestaShop).
  const stages = [
    { label: "Sesiones web", v: sessions, src: "GA" },
    { label: "Vistas de producto", v: itemViews, src: "GA" },
    { label: "Añadir al carrito", v: addToCarts, src: "GA" },
    { label: "Checkout", v: checkouts, src: "GA" },
    { label: "Compra (real)", v: ordersWeb, src: "PS" },
  ];
  const maxV = sessions || 1;
  const rate = (i) => (i === 0 ? null : stages[i - 1].v ? (stages[i].v / stages[i - 1].v) * 100 : 0);

  return (
    <EvidenceCard sources={["metricool", "ga4", "prestashop"]}
      question="Embudo de marketing: ¿de la notoriedad a la venta?"
      kpis={[
        { value: fmtNumber(reach), label: "Notoriedad social (impresiones)" },
        { value: `${conv.toFixed(1)}%`, label: "Conversión web (compra/sesión)" },
        { value: fmtCurrency(revenueWeb), label: `Revenue web · ${cmp}` },
      ]}
      maturity="amber"
      insight={`Cadena completa ${cmp}: la notoriedad social (${fmtNumber(reach)} impresiones, Metricool) alimenta ${fmtNumber(sessions)} sesiones web (GA4), que acaban en ${fmtNumber(ordersWeb)} compras REALES (${conv.toFixed(1)}%, PrestaShop) y ${fmtCurrency(revenueWeb)}. ${topCh ? `El canal que mejor convierte es «${topCh.k}» (${topCh.conv.toFixed(1)}%)` : ""}${topDvLabel ? ` y el dispositivo, ${topDvLabel} (${topDv.conv.toFixed(1)}%)` : ""}.`}
      actions={[
        { verb: "priorizar", rationale: topCh ? `Invierte en «${topCh.k}», el canal de mayor conversión, y replica su intención en los demás.` : "Prioriza el canal de mayor conversión (ver embudo por canal)." },
        { verb: "investigar", rationale: "La notoriedad social es de otra escala (impresiones ≠ sesiones): sube el embudo solo como contexto de captación. El cierre y el revenue son la caja real de PrestaShop." },
      ]}
      delay={delay}
      note="Fuentes por etapa — Notoriedad: Metricool (ig views + fb vistas de contenido + tk account views, impresiones, otra escala). Sesiones→checkout: GA4 · ga4_daily (comportamiento). Compra y revenue: PrestaShop · prestashop_monthly (caja real, canal web). Conversión = compra real / sesiones. Canal/dispositivo: GA4 · ga4_channel_daily / ga4_device_daily."
    >
      <div className="mt-1">
        {/* Notoriedad — banda aparte (otra escala) */}
        <div className="flex items-baseline justify-between text-xs mb-1.5 pb-2 border-b border-border/60">
          <span className="text-muted-foreground">Notoriedad social <span className="text-[9px] align-super">M</span></span>
          <span className="font-mono font-semibold text-foreground">{fmtNumber(reach)} impresiones</span>
        </div>
        {/* Embudo conectado GA4 → cierre real PrestaShop */}
        <div className="space-y-1">
          {stages.map((st, i) => (
            <div key={st.label}>
              <div className="flex items-baseline justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">{st.label} <span className="text-[9px] align-super">{st.src}</span></span>
                <span className="font-mono font-semibold text-foreground">{fmtNumber(st.v)}</span>
              </div>
              <div className="h-2.5 rounded bg-muted/50 overflow-hidden">
                <div className={`h-full rounded ${st.src === "PS" ? "bg-emerald-500/70" : "bg-primary/80"}`} style={{ width: `${Math.max(1.5, (st.v / maxV) * 100)}%` }} />
              </div>
              {i < stages.length - 1 && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground py-0.5">
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium">{rate(i + 1).toFixed(1)}% pasa a {stages[i + 1].label.toLowerCase()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-baseline justify-between pt-2 mt-1 border-t border-border text-xs">
          <span className="text-muted-foreground">Revenue web (real) <span className="text-[9px] align-super">PS</span></span>
          <span className="font-mono font-semibold text-foreground">{fmtCurrency(revenueWeb)}</span>
        </div>
      </div>
    </EvidenceCard>
  );
}
