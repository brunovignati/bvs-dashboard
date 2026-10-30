/**
 * PosDiscountsCard (Tiendas · Descuentos) — Facturación total, descuento medio por pedido con descuento
 * y % de descuento sobre la venta bruta. Origen: PrestaShop POS (cupones de caja + promos del TPV).
 * Vista B: evolución mensual del % de descuento y del % de tickets con descuento.
 *
 * Bruto = pagado + descuento de cupón + descuento de promo POS (el ticket ya viene neto de ambos).
 * Las promos POS solo se registran desde el 11-jun-2026; antes solo cuentan los cupones.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePosStoreMonthly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, pctChange, ym, ymLabel, cmpWord, sumByKey, lastMonths } from "./posUtils";

const F = ["revenue", "coupon_discount", "promo_discount", "tickets", "tickets_discount"];
const PROMO_LOG_START = 2026 * 12 + 6; // jun-2026: primer mes con registro de promos POS

const summarize = (a) => {
  const dto = a.coupon_discount + a.promo_discount;
  const gross = a.revenue + dto;
  return {
    revenue: a.revenue, dto, gross, tickets: a.tickets, tkDto: a.tickets_discount,
    pct: gross > 0 ? (dto / gross) * 100 : 0,
    avgDto: a.tickets_discount > 0 ? dto / a.tickets_discount : 0,
    shareTk: a.tickets > 0 ? (a.tickets_discount / a.tickets) * 100 : 0,
  };
};
const total = (obj) => {
  const t = Object.fromEntries(F.map((f) => [f, 0]));
  for (const a of Object.values(obj)) for (const f of F) t[f] += a[f];
  return t;
};

export default function PosDiscountsCard({ delay }) {
  const { data: raw = [] } = usePosStoreMonthly();
  const { rangeA, rangeB, compMode, inRange, labelRange } = useComparison();

  const curBy = sumByKey(raw, inRange, rangeB, (r) => r.store, F);
  const prevBy = sumByKey(raw, inRange, rangeA, (r) => r.store, F);
  const cur = summarize(total(curBy));
  const prev = summarize(total(prevBy));
  const hasData = cur.tickets > 0;
  const partial = rangeB.start.year * 12 + rangeB.start.month < PROMO_LOG_START;
  // Si el periodo de comparación es anterior al registro de promos, el descuento medio y el % no son comparables
  // (antes solo se contaban cupones): se oculta la variación y se avisa.
  const prevPartial = prev.tickets > 0 && rangeA.start.year * 12 + rangeA.start.month < PROMO_LOG_START;

  const rows = Object.entries(curBy)
    .map(([store, a]) => ({ store, ...summarize(a) }))
    .filter((r) => r.tickets > 0)
    .sort((a, b) => b.pct - a.pct);
  const maxPct = Math.max(1, ...rows.map((r) => r.pct));

  // ── Vista B: evolución mensual (12 meses hasta el corte del periodo) ──
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const months = lastMonths(raw, cutoff, 12);
  const evo = months.map((k) => {
    const s = summarize(total(sumByKey(raw, (r, row) => ym(row) === k, null, () => "t", F)));
    return { name: ymLabel(k), "% descuento": Math.round(s.pct * 10) / 10, "% tickets con descuento": Math.round(s.shareTk * 10) / 10 };
  });
  const altView = evo.length >= 2 ? (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={evo} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(evo.length / 8))} />
          <YAxis {...AXIS} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v, n) => [`${v}%`, n]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="% descuento" stroke={COLORS[0]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="% tickets con descuento" stroke={COLORS[3]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  const hi = rows[0];

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Cuánto facturamos y cuánto descontamos en tienda?"
      kpis={hasData ? [
        { value: fmtCurrency(cur.revenue), label: `Facturación · ${labelRange(rangeB)}`, delta: pctChange(cur.revenue, prev.revenue) ?? undefined },
        { value: `${cur.avgDto.toFixed(2)} €`, label: "Descuento medio por pedido con descuento", delta: prevPartial ? undefined : pctChange(cur.avgDto, prev.avgDto) ?? undefined },
        { value: `${cur.pct.toFixed(1)}%`, label: "Descuento sobre la venta bruta", delta: prev.tickets > 0 && !prevPartial ? cur.pct - prev.pct : undefined, deltaSuffix: " pts" },
      ] : undefined}
      answer={!hasData ? "Sin ventas de tienda en el periodo" : undefined}
      context={hasData
        ? `${fmtCurrency(cur.dto)} descontados en ${fmtNumber(cur.tkDto)} de ${fmtNumber(cur.tickets)} tickets (${cur.shareTk.toFixed(0)}%). Variación vs ${labelRange(rangeA)} (${cmpWord(compMode)}).${hi ? ` Más descuento: ${hi.store} (${hi.pct.toFixed(1)}%).` : ""}${partial ? " Ojo: antes de jun-26 solo se registran cupones, no las promos del TPV; el % real era algo mayor." : ""}${!partial && prevPartial ? ` Sin variación en descuento: en ${labelRange(rangeA)} solo se registraban cupones (las promos del TPV empiezan en jun-26), no es comparable.` : ""}`
        : undefined}
      maturity="amber"
      actions={[
        { verb: "acotar", rationale: hi ? `${hi.store} es la tienda que más descuenta (${hi.pct.toFixed(1)}%): revisar qué códigos se usan allí y si el descuento trae cliente nuevo o regala a quien ya compraba.` : "Revisa qué tiendas descuentan más y por qué códigos." },
        { verb: "medir", rationale: "Cruza con la tarjeta de retención: un descuento alto solo vale la pena si el cliente vuelve más de lo que habría vuelto sin él." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Por tienda", b: "Evolución" }}
      note="Fuente: PrestaShop · pos_store_monthly. Facturación = total pagado con IVA (ya neto de descuentos). Descuento = cupones de caja (ps_order_cart_rule) + promos del TPV (ps_prestapos_discount_log, desde 11-jun-2026). % descuento = descuento / (pagado + descuento). Descuento medio = descuento total / tickets con algún descuento. Incluye descuento manual en caja y empleado."
    >
      {hasData && (
        <div className="mt-1 space-y-1.5">
          <div className="flex justify-end text-[10px] uppercase tracking-wide text-muted-foreground gap-4">
            <span className="w-16 text-right">Descuento</span>
            <span className="w-10 text-right">%</span>
            <span className="w-14 text-right">Tk c/dto</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.store}>
              <div className="flex items-baseline justify-between text-xs mb-0.5">
                <span className="text-foreground truncate max-w-[35%]">{r.store}</span>
                <span className="font-mono text-muted-foreground flex items-baseline gap-4">
                  <span className="w-16 text-right">{fmtCurrency(r.dto)}</span>
                  <span className="w-10 text-right text-foreground font-semibold">{r.pct.toFixed(1)}%</span>
                  <span className="w-14 text-right">{r.shareTk.toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-2.5 rounded bg-muted/50 overflow-hidden">
                <div className="h-full rounded" style={{ width: `${Math.max(1, (r.pct / maxPct) * 100)}%`, background: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </EvidenceCard>
  );
}
