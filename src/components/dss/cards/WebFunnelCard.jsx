/**
 * WebFunnelCard (Marketing · síntesis) — embudo de ecommerce del sitio.
 *   Sesiones (GA4) → Vistas de producto → Añadir al carrito → Checkout → Compra (GA4),
 *   con el Revenue real (Connectif) como valor de la compra.
 * Las etapas intermedias vienen de los eventos de ecommerce de GA4 (item_views,
 * add_to_carts, checkouts, ecommerce_purchases): se encienden cuando el sync ampliado
 * las puebla. Mientras tanto, muestra el embudo corto Sesiones → Compra.
 */
import EvidenceCard from "../EvidenceCard";
import { useGa4Daily, useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, fmtCurrency } from "@/lib/dashboardData";

export default function WebFunnelCard({ delay }) {
  const { data: ga = [] } = useGa4Daily();
  const { data: rev = [] } = useDailyRevenue();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const gaRows = ga.filter(g => (g.year * 12 + g.month) <= cutoff && Number(g.sessions) > 0).slice(-60);
  const hasData = gaRows.length >= 5;

  // Connectif (verdad de la compra) para los mismos días del rango de GA4.
  const dayKeys = new Set(gaRows.map(g => `${g.year}-${g.month}-${g.day}`));
  let cnOrders = 0, cnRevenue = 0;
  for (const r of rev) {
    if (dayKeys.has(`${r.year}-${r.month}-${r.day}`)) { cnOrders += r.purchases || 0; cnRevenue += r.revenue || 0; }
  }

  const sum = (f) => gaRows.reduce((s, g) => s + (Number(g[f]) || 0), 0);
  const sessions = sum("sessions");
  const itemViews = sum("itemViews");
  const addToCarts = sum("addToCarts");
  const checkouts = sum("checkouts");
  const ecomPurch = sum("ecommercePurchases");
  const hasEco = itemViews + addToCarts + checkouts > 0;

  const purchases = ecomPurch > 0 ? ecomPurch : cnOrders;

  if (!hasData) {
    return (
      <EvidenceCard sources={["connectif", "ga4"]}
        question="¿Funciona el embudo del sitio? (tráfico → compra)"
        answer="Pendiente de datos de GA4"
        answerTone="neutral"
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Necesita histórico de GA4 (ga4_daily) para dibujar el embudo." }]}
        delay={delay}
        note="Fuente: GA4 · ga4_daily (sesiones y eventos de ecommerce) + Connectif · daily_revenue (compra y revenue)."
      />
    );
  }

  const stages = [
    { key: "ses", label: "Sesiones", v: sessions, show: true },
    { key: "view", label: "Vistas de producto", v: itemViews, show: hasEco },
    { key: "cart", label: "Añadir al carrito", v: addToCarts, show: hasEco },
    { key: "checkout", label: "Checkout iniciado", v: checkouts, show: hasEco },
    { key: "buy", label: "Compra", v: purchases, show: true },
  ].filter(s => s.show);

  const top = stages[0].v || 1;
  const convTotal = sessions ? (purchases / sessions) * 100 : 0;

  return (
    <EvidenceCard sources={["connectif", "ga4"]}
      question="¿Funciona el embudo del sitio? (tráfico → compra)"
      kpis={[
        { value: `${convTotal.toFixed(1)}%`, label: "Conversión sitio (compra/sesión)" },
        { value: fmtCurrency(cnRevenue), label: "Revenue del período (Connectif)" },
      ]}
      maturity={hasEco ? "green" : "amber"}
      insight={hasEco
        ? `De ${fmtNumber(sessions)} sesiones, ${fmtNumber(addToCarts)} añaden al carrito y ${fmtNumber(purchases)} compran. Mira dónde cae el mayor % entre etapas: ahí está la fuga.`
        : `Embudo corto (sesiones → compra) con datos actuales. Las etapas intermedias (producto → carrito → checkout) se encienden al ejecutar el ALTER de ga4_daily y correr el sync ampliado de GA4.`}
      actions={[
        { verb: "investigar", rationale: hasEco
          ? "Ataca la etapa con mayor caída: si es carrito→checkout, revisa gastos de envío y fricción; si es sesión→producto, revisa relevancia de la landing."
          : "Activa los eventos de ecommerce de GA4 para ver en qué paso exacto se pierde la venta." },
      ]}
      delay={delay}
      note="Sesiones y eventos de ecommerce: GA4 · ga4_daily. Compra/revenue: Connectif · daily_revenue (verdad de la venta). Ventana: últimos 60 días con dato de GA4. La compra usa el evento de GA4 si está disponible; si no, los pedidos de Connectif."
    >
      <div className="space-y-2 mt-1">
        {stages.map((s, i) => {
          const pct = (s.v / top) * 100;
          const step = i === 0 ? null : stages[i - 1].v ? (s.v / stages[i - 1].v) * 100 : 0;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-xs text-muted-foreground">{s.label}</span>
              <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden">
                <div className="h-full bg-primary/70 rounded-md flex items-center justify-end px-2"
                  style={{ width: `${Math.max(pct, 6)}%` }}>
                  <span className="text-[11px] font-semibold text-primary-foreground">{fmtNumber(s.v)}</span>
                </div>
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] font-mono text-muted-foreground">
                {step == null ? "—" : `${step.toFixed(1)}%`}
              </span>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground/70 pt-1">Barras = volumen sobre sesiones · columna derecha = % de paso desde la etapa anterior.</p>
      </div>
    </EvidenceCard>
  );
}
