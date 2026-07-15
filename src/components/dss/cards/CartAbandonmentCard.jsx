/**
 * CartAbandonmentCard (Automatizaciones) — abandono de carrito REAL del sitio, con dato de
 * PrestaShop (ps_cart + ps_cart_product vs ps_orders), no del flujo de recuperación.
 * Es el "tamaño del problema" que contextualiza a CartWinner/CartSequence (la recuperación).
 *
 * Definición honesta: se mide sobre carritos WEB. Universo = carritos con productos que
 * (a) acabaron en pedido web o (b) se abandonaron. Se excluyen los carritos convertidos por
 * TPV/marketplace (Amazon), que convierten siempre y falsearían la tasa.
 *   abandono_web = abandonados / (abandonados + convertidos_web)
 * Vista A: embudo del periodo. Vista B: evolución mensual de la tasa. Respeta el periodo.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useCartFunnel } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, monthLabel } from "@/lib/dashboardData";

export default function CartAbandonmentCard({ delay }) {
  const { data = [] } = useCartFunnel();
  const { rangeB, inRange, labelRange } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const hasData = data.length > 0;
  if (!hasData) {
    return (
      <EvidenceCard sources={["prestashop"]}
        question="¿Cuánto carrito se abandona en la web?"
        answer="Se enciende con el dato" answerTone="neutral" maturity="amber"
        actions={[{ verb: "investigar", rationale: "Poblar cart_funnel desde PrestaShop (ps_cart vs pedidos). Ver CLAUDE.md §16." }]}
        delay={delay}
        note="Fuente: PrestaShop · cart_funnel (carritos con productos vs pedidos, por mes)." />
    );
  }

  // ── Vista A: embudo del periodo ──
  const per = data.filter(r => inRange(rangeB, r));
  const carts = per.reduce((s, r) => s + (Number(r.carts) || 0), 0);
  const convWeb = per.reduce((s, r) => s + (Number(r.conv_web) || 0), 0);
  const convOther = per.reduce((s, r) => s + (Number(r.conv_other) || 0), 0);
  const abandoned = Math.max(0, carts - convWeb - convOther);
  const webUniverse = abandoned + convWeb;
  const abRate = webUniverse ? (abandoned / webUniverse) * 100 : 0;

  // ── Vista B: evolución mensual de la tasa de abandono web (hasta el corte, últimos 18) ──
  const monthly = data.filter(r => (r.year * 12 + r.month) <= cutoff)
    .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month))
    .map(r => {
      const ab = Math.max(0, (r.carts || 0) - (r.conv_web || 0) - (r.conv_other || 0));
      const uni = ab + (r.conv_web || 0);
      return { label: `${monthLabel(r.month)} ${String(r.year).slice(2)}`, rate: uni ? (ab / uni) * 100 : 0, carts: r.carts };
    }).slice(-18);

  const altView = (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={monthly} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(monthly.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} width={34} domain={[0, 'auto']} />
          <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Abandono web"]} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="rate" name="Abandono web" stroke="hsl(4,60%,52%)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const bar = (label, val, base, color) => (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{fmtNumber(val)}</span>
      </div>
      <div className="h-2.5 rounded bg-muted/50 overflow-hidden">
        <div className="h-full rounded" style={{ width: `${base ? Math.max(1.5, (val / base) * 100) : 0}%`, background: color }} />
      </div>
    </div>
  );

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Cuánto carrito se abandona en la web?"
      answer={`Abandono de carrito web · ${abRate.toFixed(0)}%`}
      answerTone={abRate >= 60 ? "bad" : "neutral"}
      context={`Carritos web con productos que no acaban en compra · ${labelRange(rangeB)}. ${fmtNumber(abandoned)} abandonados de ${fmtNumber(webUniverse)} carritos web.`}
      kpis={[
        { value: `${abRate.toFixed(0)}%`, label: "Abandono de carrito web" },
        { value: fmtNumber(abandoned), label: `Carritos abandonados · ${labelRange(rangeB)}` },
        { value: fmtNumber(convWeb), label: "Carritos → compra web" },
      ]}
      maturity="amber"
      actions={[
        { verb: "priorizar", rationale: "Cada punto de abandono recuperado es venta directa. Ataca la fricción de checkout (gastos de envío visibles antes, pago exprés, invitado) y refuerza la secuencia de recuperación (ver tarjetas de abajo)." },
        { verb: "investigar", rationale: "El abandono ha crecido con el volumen de tráfico; cruza con el paso vista→carrito del embudo web (GA4) para separar fricción de captación de fricción de checkout." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Embudo", b: "Evolución" }}
      note="Fuente: PrestaShop · cart_funnel (ps_cart con productos vs pedidos válidos). Abandono web = abandonados / (abandonados + convertidos web). Se excluyen carritos convertidos por TPV/marketplace (convierten siempre). El volumen de carritos y su registro escalaron en 2025-26, así que compara sobre todo tasas, no absolutos entre años lejanos."
    >
      <div className="mt-1 space-y-2">
        {bar("Carritos web (con productos)", webUniverse, webUniverse, "hsl(186,32%,52%)")}
        {bar("→ Acaban en compra web", convWeb, webUniverse, "hsl(160,50%,42%)")}
        {bar("→ Abandonados", abandoned, webUniverse, "hsl(4,60%,52%)")}
        <p className="text-[10px] text-muted-foreground/70 pt-1">Además, {fmtNumber(convOther)} carritos se cerraron por TPV/marketplace en el periodo (excluidos del cálculo de abandono web).</p>
      </div>
    </EvidenceCard>
  );
}
