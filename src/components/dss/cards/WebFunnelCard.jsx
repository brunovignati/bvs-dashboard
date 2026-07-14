/**
 * WebFunnelCard (Marketing · síntesis) — embudo web COMPLETO de comportamiento (GA4).
 *   Sesiones → Vistas de producto → Añadir al carrito → Checkout → Compra
 * Las 5 etapas salen de GA4 (ga4_daily: sessions, item_views, add_to_carts, checkouts,
 * ecommerce_purchases), sumadas SOLO sobre los días con datos de embudo → cada etapa es un
 * subconjunto real de la anterior y las tasas entre pasos son válidas (monotónicas).
 * El dinero de verdad (revenue web y peso sobre la tienda) viene de PrestaShop
 * (prestashop_monthly, pedidos reales canal web), porque GA4 mide comportamiento (infra-cuenta
 * compras por consentimiento/atribución) mientras PrestaShop es la caja real.
 *
 * Cobertura: las etapas intermedias de GA4 existen desde may-2026. Si el periodo no tiene datos
 * de embudo, se muestra el modo honesto reducido (pedidos y revenue web reales de PrestaShop).
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChevronDown } from "lucide-react";
import EvidenceCard from "../EvidenceCard";
import { useGa4Daily, usePrestashopMonthly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, fmtCurrency } from "@/lib/dashboardData";
const CH = ["hsl(16,79%,57%)", "hsl(45,35%,46%)", "hsl(186,32%,42%)"];

const M = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default function WebFunnelCard({ delay }) {
  const { data: ga = [] } = useGa4Daily();
  const { data: ps = [] } = usePrestashopMonthly();
  const { rangeB, inRange, labelRange } = useComparison();

  const sumPs = (f) => ps.reduce((s, r) => s + (inRange(rangeB, r) ? (Number(r[f]) || 0) : 0), 0);
  const revenueWeb = sumPs("revenue_web");
  const ordersWeb = sumPs("orders_web");
  const ordersTotal = sumPs("orders_total");
  const webShare = ordersTotal ? (ordersWeb / ordersTotal) * 100 : 0;
  const cmp = labelRange(rangeB);

  // ── Embudo GA4: sumar SOLO días con datos de embudo (item_views no nulo) para que las 5
  // etapas cubran el mismo conjunto de días y las tasas sean coherentes. ──
  const fRows = ga.filter(g => inRange(rangeB, g) && g.item_views != null);
  const fv = (f) => fRows.reduce((s, g) => s + (Number(g[f]) || 0), 0);
  const sessions = fv("sessions");
  const itemViews = fv("item_views");
  const addToCarts = fv("add_to_carts");
  const checkouts = fv("checkouts");
  const buys = fv("ecommerce_purchases");
  const funnelValid = fRows.length > 0 && sessions > 0 && itemViews > 0 && addToCarts > 0 && checkouts > 0 && buys > 0;

  const conv = sessions ? (buys / sessions) * 100 : 0;

  // ── Vista B — reparto de pedidos por canal (web/Amazon/TPV) en el tiempo (PrestaShop). ──
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const chRows = ps.filter(r => (r.year * 12 + r.month) <= cutoff)
    .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month)).slice(-12)
    .map(r => ({ name: `${["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][r.month]} ${String(r.year).slice(2)}`,
      Web: Number(r.orders_web) || 0, Amazon: Number(r.orders_amazon) || 0, "Tienda (TPV)": Number(r.orders_tpv) || 0 }));
  const altView = chRows.length >= 2 ? (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chRows} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(chRows.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v, n) => [fmtNumber(v), n]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Web" stackId="1" fill={CH[0]} maxBarSize={30} />
          <Bar dataKey="Amazon" stackId="1" fill={CH[1]} maxBarSize={30} />
          <Bar dataKey="Tienda (TPV)" stackId="1" fill={CH[2]} radius={[3, 3, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  // ── Modo reducido honesto: sin datos de embudo GA4, mostrar solo lo real de PrestaShop. ──
  if (!funnelValid) {
    if (ordersWeb <= 0) {
      return (
        <EvidenceCard sources={["ga4", "prestashop"]}
          question="¿Funciona el embudo del sitio? (tráfico → compra)"
          answer="Pendiente de datos" answerTone="neutral" maturity="amber"
          actions={[{ verb: "investigar", rationale: "Falta el embudo GA4 (item_views/add_to_carts/checkouts) y/o pedidos web de PrestaShop para el periodo." }]}
          delay={delay} altView={altView} viewLabels={{ a: "Embudo", b: "Canales" }}
          note="Embudo: GA4 · ga4_daily. Revenue/pedidos web: PrestaShop · prestashop_monthly." />
      );
    }
    return (
      <EvidenceCard sources={["ga4", "prestashop"]}
        question="¿Funciona el embudo del sitio? (tráfico → compra)"
        kpis={[
          { value: fmtNumber(ordersWeb), label: `Pedidos web · ${cmp}` },
          { value: fmtCurrency(revenueWeb), label: "Revenue web" },
          { value: `${webShare.toFixed(0)}%`, label: "de los pedidos de la tienda" },
        ]}
        maturity="green"
        insight={`Pedidos y revenue web REALES de PrestaShop. El embudo de comportamiento (sesiones→vistas→carrito→checkout→compra) solo existe en GA4 desde may-2026; elige un periodo dentro de esa ventana para ver las 5 etapas. La web es el ${webShare.toFixed(0)}% de los pedidos totales.`}
        actions={[{ verb: "investigar", rationale: "Selecciona un periodo con cobertura de GA4 (desde may-2026) para ver dónde se pierde el tráfico dentro del sitio." }]}
        delay={delay} altView={altView} viewLabels={{ a: "Embudo", b: "Canales" }}
        note="Embudo GA4 (ga4_daily) disponible desde may-2026. Revenue/pedidos web: PrestaShop · prestashop_monthly (pedidos reales, canal web)." />
    );
  }

  const stages = [
    { key: "ses", label: "Sesiones", v: sessions },
    { key: "view", label: "Vistas de producto", v: itemViews },
    { key: "cart", label: "Añadir al carrito", v: addToCarts },
    { key: "chk", label: "Checkout iniciado", v: checkouts },
    { key: "buy", label: "Compra", v: buys },
  ];
  const maxV = sessions || 1;
  const steps = stages.slice(1).map((st, i) => ({
    label: `${st.label.toLowerCase()} / ${stages[i].label.toLowerCase()}`,
    from: stages[i].label, to: st.label,
    rate: stages[i].v ? (st.v / stages[i].v) * 100 : 0,
  }));
  const worst = steps.reduce((m, s) => (s.rate < m.rate ? s : m), steps[0]);
  const worstShort = { "Vistas de producto": "ver producto", "Añadir al carrito": "carrito", "Checkout iniciado": "checkout", "Compra": "compra" }[worst.to] || worst.to;

  return (
    <EvidenceCard sources={["ga4", "prestashop"]}
      question="¿Funciona el embudo del sitio? (tráfico → compra)"
      kpis={[
        { value: `${conv.toFixed(1)}%`, label: "Conversión web (compra/sesión)" },
        { value: fmtCurrency(revenueWeb), label: `Revenue web · ${cmp}` },
        { value: `${webShare.toFixed(0)}%`, label: "de los pedidos de la tienda" },
      ]}
      maturity="green"
      insight={`Embudo de comportamiento web (GA4), 5 etapas encadenadas: de ${fmtNumber(sessions)} sesiones, ${fmtNumber(buys)} acaban en compra (${conv.toFixed(1)}%). El mayor descarte está en el paso a «${worstShort}» (${worst.rate.toFixed(1)}% pasa). El revenue web (${fmtCurrency(revenueWeb)}) es real de PrestaShop; la web pesa el ${webShare.toFixed(0)}% de los pedidos totales de la tienda.`}
      actions={[
        { verb: "priorizar", rationale: `Ataca el cuello de botella: solo el ${worst.rate.toFixed(1)}% pasa de «${worst.from.toLowerCase()}» a «${worst.to.toLowerCase()}». Ahí está la mayor fuga del sitio.` },
        { verb: "investigar", rationale: "Compara las tasas de cada paso con las de campañas/promos para ver qué mejora la conversión web." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Embudo", b: "Canales" }}
      note="5 etapas de GA4 · ga4_daily (sessions, item_views, add_to_carts, checkouts, ecommerce_purchases), sumadas solo sobre días con datos de embudo (desde may-2026) para tasas válidas. La compra del embudo es la de GA4 (comportamiento). Revenue web y % sobre la tienda: PrestaShop · prestashop_monthly (caja real, canal web). Vista 'Canales' = reparto de pedidos web/Amazon/TPV mes a mes (PrestaShop)."
    >
      <div className="space-y-1 mt-1">
        {stages.map((st, i) => (
          <div key={st.key}>
            <div className="flex items-baseline justify-between text-xs mb-0.5">
              <span className="text-muted-foreground">{st.label}</span>
              <span className="font-mono font-semibold text-foreground">{fmtNumber(st.v)}</span>
            </div>
            <div className="h-2.5 rounded bg-muted/50 overflow-hidden">
              <div className="h-full rounded bg-primary/80" style={{ width: `${Math.max(1.5, (st.v / maxV) * 100)}%` }} />
            </div>
            {i < steps.length && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] py-0.5">
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${steps[i] === worst ? "text-red-500" : "text-muted-foreground"}`} />
                <span className={`font-medium ${steps[i] === worst ? "text-red-600" : "text-muted-foreground"}`}>
                  {steps[i].rate.toFixed(1)}% pasa a {steps[i].to.toLowerCase()}
                  {steps[i] === worst && <span className="font-semibold"> · cuello de botella</span>}
                </span>
              </div>
            )}
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground/70 pt-1">Comportamiento GA4 · {cmp}. Sesiones → vistas de producto → carrito → checkout → compra. Cada tasa = paso siguiente / paso anterior.</p>
      </div>
    </EvidenceCard>
  );
}
