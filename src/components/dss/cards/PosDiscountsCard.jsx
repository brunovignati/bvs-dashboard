/**
 * PosDiscountsCard (Tiendas · Descuentos) — Facturación total, descuento medio por compra con descuento
 * y % de descuento sobre la venta bruta. Origen: PrestaShop POS (cupones de caja + promos del TPV).
 * Vista B: evolución mensual del % de descuento, del % de compras con descuento y del margen.
 *
 * Bruto = pagado + descuento de cupón + descuento de promo POS (el ticket ya viene neto de ambos).
 * Las promos POS solo se registran desde el 11-jun-2026; antes solo cuentan los cupones.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import PosBarTable from "./PosBarTable";
import { usePosStoreMonthly, usePosMarginMonthly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, pctChange, ym, ymLabel, sumByKey, lastMonths, marginPct } from "./posUtils";

const F = ["revenue", "coupon_discount", "promo_discount", "tickets", "tickets_discount"];
const FM = ["rev_lines", "rev_known", "cost"];
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
  const { data: marg = [] } = usePosMarginMonthly();
  const { rangeA, rangeB, inRange, labelRange } = useComparison();

  const curBy = sumByKey(raw, inRange, rangeB, (r) => r.store, F);
  const prevBy = sumByKey(raw, inRange, rangeA, (r) => r.store, F);
  const cur = summarize(total(curBy));
  const prev = summarize(total(prevBy));
  const hasData = cur.tickets > 0;
  const partial = rangeB.start.year * 12 + rangeB.start.month < PROMO_LOG_START;
  // Si el periodo de comparación es anterior al registro de promos, el descuento medio y el % no son comparables
  // (antes solo se contaban cupones): se oculta la variación y se avisa.
  const prevPartial = prev.tickets > 0 && rangeA.start.year * 12 + rangeA.start.month < PROMO_LOG_START;

  // Margen de producto tras descuentos (las líneas ya van netas de cupón y promo)
  const mByStore = sumByKey(marg, inRange, rangeB, (r) => r.store, FM);

  const rows = Object.entries(curBy)
    .map(([store, a]) => ({ store, ...summarize(a), mg: marginPct(mByStore[store]?.rev_known, mByStore[store]?.cost) }))
    .filter((r) => r.tickets > 0)
    .sort((a, b) => b.pct - a.pct);
  const maxPct = Math.max(1, ...rows.map((r) => r.pct));

  // ── Vista B: evolución mensual (12 meses hasta el corte del periodo) ──
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const months = lastMonths(raw, cutoff, 12);
  const evo = months.map((k) => {
    const s = summarize(total(sumByKey(raw, (r, row) => ym(row) === k, null, () => "t", F)));
    const mm = sumByKey(marg, (r, row) => ym(row) === k, null, () => "t", FM).t;
    const mgk = mm ? marginPct(mm.rev_known, mm.cost) : null;
    return { name: ymLabel(k), "Descuento (% de la venta)": Math.round(s.pct * 10) / 10, "Compras con descuento (%)": Math.round(s.shareTk * 10) / 10, "Margen (%)": mgk != null ? Math.round(mgk * 10) / 10 : null };
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
          <Line type="monotone" dataKey="Descuento (% de la venta)" stroke={COLORS[0]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Compras con descuento (%)" stroke={COLORS[3]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Margen (%)" stroke={COLORS[5]} strokeWidth={2} dot={false} strokeDasharray="4 3" connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  const hi = rows[0];

  const tableRows = rows.map((r, i) => ({
    key: r.store, label: r.store, pct: (r.pct / maxPct) * 100, color: COLORS[i % COLORS.length],
    cells: [`${r.pct.toFixed(1)}%`, fmtCurrency(r.dto), `${r.shareTk.toFixed(0)}%`, r.mg != null ? `${r.mg.toFixed(0)}%` : "—"],
  }));

  return (
    <EvidenceCard sources={["prestashop"]} kpiGrid
      question="¿Cuánto descontamos en tienda?"
      kpis={hasData ? [
        { value: fmtCurrency(cur.revenue), label: "Facturado", delta: pctChange(cur.revenue, prev.revenue) ?? undefined },
        { value: `${cur.avgDto.toFixed(2)} €`, label: "Descuento medio", delta: prevPartial ? undefined : pctChange(cur.avgDto, prev.avgDto) ?? undefined },
        { value: `${cur.pct.toFixed(1)}%`, label: "De la venta", delta: prev.tickets > 0 && !prevPartial ? cur.pct - prev.pct : undefined, deltaSuffix: " pts" },
      ] : undefined}
      answer={!hasData ? "Sin ventas de tienda en el periodo" : undefined}
      context={hasData
        ? `${labelRange(rangeB)}: ${fmtCurrency(cur.dto)} descontados en ${fmtNumber(cur.tkDto)} de ${fmtNumber(cur.tickets)} compras (${cur.shareTk.toFixed(0)}%). «Descuento medio» es por cada compra con descuento.${partial ? " Antes de jun-26 solo se anotan los cupones, no las promos del TPV: el descuento real era algo mayor." : ""}${!partial && prevPartial ? ` No se compara con ${labelRange(rangeA)}: entonces solo se anotaban cupones.` : ""}`
        : undefined}
      maturity="amber"
      actions={[
        { verb: "acotar", rationale: hi ? `${hi.store} es la que más descuenta (${hi.pct.toFixed(1)}%). Mira qué códigos usa y si traen clientes nuevos o regalan descuento a quien ya compraba.` : "Mira qué tiendas descuentan más y con qué códigos." },
        { verb: "medir", rationale: "Mira también si el cliente vuelve más con descuento (tarjeta «¿Vuelven más los clientes que usaron un código?»). Si no vuelve más, el descuento no compensa." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Por tienda", b: "Mes a mes" }}
      note="Fuente: PrestaShop · pos_store_monthly. Facturado = total pagado con IVA (ya neto de descuentos). Descuento = cupones de caja (ps_order_cart_rule) + promos del TPV (ps_prestapos_discount_log, desde 11-jun-2026). % de la venta = descuento / (pagado + descuento). Descuento medio = descuento total / compras con algún descuento. Incluye descuento manual en caja y empleado. Margen = (venta sin IVA − coste de compra de catálogo) / venta sin IVA (pos_margin_monthly); el precio de línea ya va neto de descuentos, de modo que el margen es el que queda después de descontar."
    >
      {hasData && (
        <PosBarTable
          cols={[
            { h: "% de la venta", w: 64, title: "Descuento sobre la venta bruta" },
            { h: "Descuento", w: 64 },
            { h: "Compras con dto.", w: 72, title: "% de las compras de la tienda que llevaron algún descuento" },
            { h: "Margen", w: 52, title: "Margen de producto después de descontar" },
          ]}
          rows={tableRows}
        />
      )}
    </EvidenceCard>
  );
}
