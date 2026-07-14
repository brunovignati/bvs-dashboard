/**
 * WebFunnelCard (Marketing · síntesis) — embudo web con la COMPRA desde la fuente de verdad.
 *   Sesiones (GA4) → Compra web (PrestaShop) · Revenue web (PrestaShop)
 * Compra y revenue = pedidos REALES de PrestaShop (prestashop_monthly), canal WEB (excluye
 * Amazon y TPV/tienda física). Sesiones = GA4. Respeta el periodo.
 *
 * Honestidad de datos:
 *  - Las etapas intermedias (carrito/checkout) NO se dibujan: PrestaShop purga carritos
 *    antiguos y los checkouts de GA4 están infra-contados → embudo imposible.
 *  - GA4 (ga4_daily) solo tiene histórico reciente. Si el periodo seleccionado empieza ANTES
 *    de la cobertura de GA4, las sesiones estarían truncadas y la conversión saldría inflada:
 *    en ese caso se ocultan sesiones/conversión y se muestran solo pedidos y revenue web
 *    reales de PrestaShop (fiables para cualquier periodo).
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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

  const sumGa = (f) => ga.reduce((s, g) => s + (inRange(rangeB, g) ? (Number(g[f]) || 0) : 0), 0);
  const sumPs = (f) => ps.reduce((s, r) => s + (inRange(rangeB, r) ? (Number(r[f]) || 0) : 0), 0);

  const sessions = sumGa("sessions");
  const ordersWeb = sumPs("orders_web");
  const revenueWeb = sumPs("revenue_web");
  const ordersTotal = sumPs("orders_total");

  // ¿El periodo está dentro de la cobertura de GA4? (si empieza antes, sesiones truncadas)
  const ga4MinYm = ga.length ? Math.min(...ga.map(g => g.year * 12 + g.month)) : Infinity;
  const periodStartYm = rangeB.start.year * 12 + rangeB.start.month;
  const ga4Covered = periodStartYm >= ga4MinYm;
  const ga4MinLabel = isFinite(ga4MinYm) ? `${M[((ga4MinYm - 1) % 12) + 1]} ${Math.floor((ga4MinYm - 1) / 12)}` : "—";

  const hasOrders = ordersWeb > 0;
  const convValid = ga4Covered && sessions > 0 && hasOrders;
  const conv = sessions ? (ordersWeb / sessions) * 100 : 0;
  const webShare = ordersTotal ? (ordersWeb / ordersTotal) * 100 : 0;
  const cmp = labelRange(rangeB);

  // ── Vista B — reparto de pedidos por canal (web/Amazon/TPV) en el tiempo. Dato completo de
  // PrestaShop (sin límite de GA4). Revela cuánto pesa la web frente a marketplace y tienda. ──
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

  if (!hasOrders) {
    return (
      <EvidenceCard sources={["ga4", "prestashop"]}
        question="¿Funciona el embudo del sitio? (tráfico → compra)"
        answer="Pendiente de datos"
        answerTone="neutral" maturity="amber"
        actions={[{ verb: "investigar", rationale: "Necesita pedidos web de PrestaShop (prestashop_monthly) para el periodo." }]}
        delay={delay}
        note="Compra/revenue web: PrestaShop · prestashop_monthly (pedidos reales, canal web). Sesiones: GA4 · ga4_daily."
      />
    );
  }

  const stages = [
    { key: "ses", label: "Sesiones (web)", v: sessions },
    { key: "buy", label: "Compra web (PrestaShop)", v: ordersWeb },
  ];
  const top = sessions || 1;

  return (
    <EvidenceCard sources={["ga4", "prestashop"]}
      question="¿Funciona el embudo del sitio? (tráfico → compra)"
      kpis={convValid ? [
        { value: `${conv.toFixed(1)}%`, label: "Conversión web (compra/sesión)" },
        { value: fmtCurrency(revenueWeb), label: `Revenue web · ${cmp}` },
        { value: `${webShare.toFixed(0)}%`, label: "de los pedidos de la tienda" },
      ] : [
        { value: fmtNumber(ordersWeb), label: `Pedidos web · ${cmp}` },
        { value: fmtCurrency(revenueWeb), label: "Revenue web" },
        { value: `${webShare.toFixed(0)}%`, label: "de los pedidos de la tienda" },
      ]}
      maturity="green"
      insight={convValid
        ? `De ${fmtNumber(sessions)} sesiones web, ${fmtNumber(ordersWeb)} acaban en compra (${conv.toFixed(1)}%). Compra y revenue son pedidos REALES de PrestaShop (canal web), no una estimación. Ojo: la web es solo el ${webShare.toFixed(0)}% de los pedidos totales de la tienda — el resto es Amazon y tienda física (TPV).`
        : `Pedidos y revenue web REALES de PrestaShop. La conversión sesión→compra no se muestra en este periodo porque GA4 solo tiene sesiones desde ${ga4MinLabel}; selecciona un periodo dentro de esa ventana para verla. La web es el ${webShare.toFixed(0)}% de los pedidos totales de la tienda.`}
      actions={[
        { verb: "investigar", rationale: "La conversión sesión→compra es el número clave; para ver dónde se pierde dentro del sitio (carrito/checkout) haría falta instrumentar esos eventos en GA4, hoy no fiables." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Embudo", b: "Canales" }}
      note={`Sesiones: GA4 · ga4_daily (histórico desde ${ga4MinLabel}). Compra web y revenue web: PrestaShop · prestashop_monthly (pedidos reales valid=1, excluyendo Amazon y TPV). La conversión solo se calcula si el periodo cae dentro de la cobertura de GA4; en periodos anteriores se muestran solo pedidos y revenue web (siempre fiables). Etapas de carrito/checkout omitidas por falta de dato fiable.`}
    >
      {convValid ? (
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
          <p className="text-[10px] text-muted-foreground/70 pt-1">Sesiones (GA4) → Compra web (PrestaShop, dato real). Columna derecha = conversión.</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">
          Sesiones/conversión no disponibles para este periodo (GA4 solo cubre desde {ga4MinLabel}). Arriba, pedidos y revenue web reales de PrestaShop para el periodo seleccionado.
        </p>
      )}
    </EvidenceCard>
  );
}
