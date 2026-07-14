/**
 * WebFunnelCard (Marketing · síntesis) — embudo web con la COMPRA desde la fuente de verdad.
 *   Sesiones (GA4) → [Checkout iniciado (GA4, si está)] → Compra web (PrestaShop) · Revenue web (PrestaShop)
 * La compra y el revenue vienen de PrestaShop (prestashop_monthly, pedidos reales), filtrados a
 * canal WEB (excluye Amazon y TPV/tienda física). Las sesiones vienen de GA4. Respeta el periodo.
 * Nota honesta: PrestaShop purga los carritos antiguos y GA4 no instrumenta add-to-cart, así que
 * la etapa intermedia de carrito no es fiable históricamente y no se dibuja.
 */
import EvidenceCard from "../EvidenceCard";
import { useGa4Daily, usePrestashopMonthly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, fmtCurrency } from "@/lib/dashboardData";

export default function WebFunnelCard({ delay }) {
  const { data: ga = [] } = useGa4Daily();
  const { data: ps = [] } = usePrestashopMonthly();
  const { rangeB, inRange, labelRange } = useComparison();

  // Agregados del periodo (mismo selector para ambas fuentes)
  const sumGa = (f) => ga.reduce((s, g) => s + (inRange(rangeB, g) ? (Number(g[f]) || 0) : 0), 0);
  const sumPs = (f) => ps.reduce((s, r) => s + (inRange(rangeB, r) ? (Number(r[f]) || 0) : 0), 0);

  const sessions = sumGa("sessions");
  const checkouts = sumGa("checkouts");
  const ordersWeb = sumPs("orders_web");
  const revenueWeb = sumPs("revenue_web");
  const ordersTotal = sumPs("orders_total");

  const hasData = sessions > 0 && ordersWeb > 0;
  const conv = sessions ? (ordersWeb / sessions) * 100 : 0;
  const webShare = ordersTotal ? (ordersWeb / ordersTotal) * 100 : 0;
  const cmp = labelRange(rangeB);

  if (!hasData) {
    return (
      <EvidenceCard sources={["ga4", "prestashop"]}
        question="¿Funciona el embudo del sitio? (tráfico → compra)"
        answer="Pendiente de datos"
        answerTone="neutral" maturity="amber"
        actions={[{ verb: "investigar", rationale: "Necesita sesiones de GA4 (ga4_daily) y pedidos web de PrestaShop (prestashop_monthly) para el periodo." }]}
        delay={delay}
        note="Sesiones: GA4 · ga4_daily. Compra/revenue web: PrestaShop · prestashop_monthly (pedidos reales, canal web)."
      />
    );
  }

  // Solo 2 etapas fiables: Sesiones (GA4) → Compra web (PrestaShop). La etapa intermedia de
  // checkout de GA4 se omite: solo tiene ~60 días de histórico y está infra-contada frente a
  // los pedidos reales de PrestaShop, lo que produciría un paso >100% (compra > checkout) en
  // periodos largos. Sesiones → Compra web es siempre monótona y honesta.
  const stages = [
    { key: "ses", label: "Sesiones (web)", v: sessions, show: sessions > 0 },
    { key: "buy", label: "Compra web (PrestaShop)", v: ordersWeb, show: ordersWeb > 0 },
  ].filter(s => s.show);
  const top = stages[0].v || 1;

  return (
    <EvidenceCard sources={["ga4", "prestashop"]}
      question="¿Funciona el embudo del sitio? (tráfico → compra)"
      kpis={[
        { value: `${conv.toFixed(1)}%`, label: "Conversión web (compra/sesión)" },
        { value: fmtCurrency(revenueWeb), label: `Revenue web · ${cmp}` },
        { value: `${webShare.toFixed(0)}%`, label: "de los pedidos de la tienda" },
      ]}
      maturity="green"
      insight={`De ${fmtNumber(sessions)} sesiones web, ${fmtNumber(ordersWeb)} acaban en compra (${conv.toFixed(1)}%). La compra y el revenue son pedidos REALES de PrestaShop (canal web), no una estimación. Ojo: la web es solo el ${webShare.toFixed(0)}% de los pedidos totales de la tienda — el resto es Amazon y tienda física (TPV).`}
      actions={[
        { verb: "investigar", rationale: "La conversión sesión→compra es el número clave; para ver dónde se pierde dentro del sitio (carrito/checkout) haría falta instrumentar esos eventos en GA4, hoy no fiables." },
      ]}
      delay={delay}
      note="Sesiones: GA4 · ga4_daily. Compra web y revenue web: PrestaShop · prestashop_monthly (pedidos reales con valid=1, excluyendo Amazon y TPV). Ventana = periodo seleccionado. Solo 2 etapas: las intermedias (carrito/checkout) no se dibujan — PrestaShop purga carritos antiguos y los checkouts de GA4 están infra-contados, lo que daría un embudo imposible."
    >
      <div className="space-y-2 mt-1">
        {stages.map((s, i) => {
          const pct = (s.v / top) * 100;
          const step = i === 0 ? null : stages[i - 1].v ? (s.v / stages[i - 1].v) * 100 : 0;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-44 shrink-0 text-xs text-muted-foreground">{s.label}</span>
              <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden">
                <div className="h-full bg-primary/70 rounded-md flex items-center justify-end px-2" style={{ width: `${Math.max(pct, 6)}%` }}>
                  <span className="text-[11px] font-semibold text-primary-foreground">{fmtNumber(s.v)}</span>
                </div>
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] font-mono text-muted-foreground">
                {step == null ? "—" : `${step.toFixed(1)}%`}
              </span>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground/70 pt-1">Barras = volumen sobre sesiones · columna derecha = % de paso desde la etapa anterior. La compra es dato real de PrestaShop (canal web).</p>
      </div>
    </EvidenceCard>
  );
}
