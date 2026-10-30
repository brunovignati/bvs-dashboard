/**
 * PosStoreSalesCard (Tiendas · Ventas) — Facturación de cada tienda física y su crecimiento frente
 * al periodo de comparación del selector (por defecto, el mismo mes del año anterior).
 * Origen: PrestaShop POS (tickets TPV válidos). Vista B: evolución mensual de las 5 tiendas líderes.
 * Textos en lenguaje llano; las cifras de cada tienda van en una tabla con títulos en palabras.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import PosBarTable from "./PosBarTable";
import { usePosStoreMonthly, usePosMarginMonthly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, num, pctChange, fmtG, gColor, ym, ymLabel, sumByKey, lastMonths, marginPct, coverPct } from "./posUtils";

const F = ["revenue", "tickets"];
const FM = ["rev_lines", "rev_known", "cost"];

export default function PosStoreSalesCard({ delay }) {
  const { data: raw = [] } = usePosStoreMonthly();
  const { data: marg = [] } = usePosMarginMonthly();
  const { rangeA, rangeB, compMode, inRange, labelRange } = useComparison();

  const cur = sumByKey(raw, inRange, rangeB, (r) => r.store, F);
  const prev = sumByKey(raw, inRange, rangeA, (r) => r.store, F);
  // Margen de producto por tienda (periodo activo y de comparación)
  const mCur = sumByKey(marg, inRange, rangeB, (r) => r.store, FM);
  const mPrev = sumByKey(marg, inRange, rangeA, (r) => r.store, FM);
  const mTot = (o) => Object.values(o).reduce((t, a) => ({ rev_lines: t.rev_lines + a.rev_lines, rev_known: t.rev_known + a.rev_known, cost: t.cost + a.cost }), { rev_lines: 0, rev_known: 0, cost: 0 });

  const rows = Object.entries(cur)
    .map(([store, a]) => ({
      store, revenue: a.revenue, tickets: a.tickets,
      avg: a.tickets > 0 ? a.revenue / a.tickets : 0,
      prev: prev[store]?.revenue || 0,
      g: pctChange(a.revenue, prev[store]?.revenue || 0),
      mg: marginPct(mCur[store]?.rev_known, mCur[store]?.cost),
      cover: coverPct(mCur[store]?.rev_lines, mCur[store]?.rev_known),
    }))
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const total = rows.reduce((s, r) => s + r.revenue, 0);
  const tickets = rows.reduce((s, r) => s + r.tickets, 0);
  const prevTotal = Object.values(prev).reduce((s, a) => s + a.revenue, 0);
  const prevTickets = Object.values(prev).reduce((s, a) => s + a.tickets, 0);
  const avg = tickets > 0 ? total / tickets : 0;
  const prevAvg = prevTickets > 0 ? prevTotal / prevTickets : 0;
  const hasData = rows.length > 0;
  const mt = mTot(mCur), mtp = mTot(mPrev);
  const mg = marginPct(mt.rev_known, mt.cost), mgPrev = marginPct(mtp.rev_known, mtp.cost);
  const hasMargin = mg != null;

  // Mismas tiendas: crecimiento solo con las que ya vendían en el periodo de comparación (excluye aperturas).
  const same = rows.filter((r) => r.prev > 0);
  const sameG = pctChange(same.reduce((s, r) => s + r.revenue, 0), same.reduce((s, r) => s + r.prev, 0));
  const maxRev = rows[0]?.revenue || 1;

  // ── Vista B: evolución mensual de las 5 tiendas líderes (12 meses hasta el corte del periodo) ──
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const top5 = rows.slice(0, 5).map((r) => r.store);
  const months = lastMonths(raw, cutoff, 12);
  const evo = months.map((k) => {
    const o = { name: ymLabel(k) };
    for (const s of top5) o[s] = raw.filter((r) => ym(r) === k && r.store === s).reduce((x, r) => x + num(r.revenue), 0);
    return o;
  });
  const altView = evo.length >= 2 && top5.length ? (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={evo} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(evo.length / 8))} />
          <YAxis {...AXIS} tick={{ fontSize: 8, fill: AXIS.tick.fill }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v, n) => [fmtCurrency(v), n]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          {top5.map((s, i) => <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  const best = same.filter((r) => r.g != null).sort((a, b) => b.g - a.g)[0];
  const worst = same.filter((r) => r.g != null).sort((a, b) => a.g - b.g)[0];

  const tableRows = rows.map((r, i) => ({
    key: r.store, label: r.store, pct: (r.revenue / maxRev) * 100, color: COLORS[i % COLORS.length],
    cells: [
      fmtCurrency(r.revenue),
      fmtNumber(r.tickets),
      `${r.avg.toFixed(0)} €`,
      r.mg != null ? <span title={r.cover < 95 ? `Coste conocido solo en el ${r.cover.toFixed(0)}% de la venta: dato poco fiable` : "Margen de producto"}>{r.mg.toFixed(0)}%{r.cover < 95 ? "*" : ""}</span> : "—",
      <span className="font-semibold" style={{ color: gColor(r.g) }} title={`${labelRange(rangeA)}: ${fmtCurrency(r.prev)}`}>{r.prev > 0 ? fmtG(r.g) : "nueva"}</span>,
    ],
  }));

  return (
    <EvidenceCard sources={["prestashop"]} kpiGrid
      question="¿Cuánto vende cada tienda?"
      kpis={hasData ? [
        { value: fmtCurrency(total), label: "Ventas", delta: pctChange(total, prevTotal) ?? undefined },
        hasMargin
          ? { value: `${mg.toFixed(1)}%`, label: "Margen", delta: mgPrev != null ? mg - mgPrev : undefined, deltaSuffix: " pts" }
          : { value: fmtNumber(tickets), label: "Compras", delta: pctChange(tickets, prevTickets) ?? undefined },
        { value: `${avg.toFixed(1)} €`, label: "Compra media", delta: pctChange(avg, prevAvg) ?? undefined },
      ] : undefined}
      answer={!hasData ? "Sin ventas de tienda en el periodo" : undefined}
      context={hasData
        ? `${labelRange(rangeB)} frente a ${labelRange(rangeA)}.${sameG != null ? ` Con las mismas tiendas: ${fmtG(sameG)}.` : ""}${best && worst && best.store !== worst.store ? ` Sube más ${best.store} (${fmtG(best.g)}) y baja más ${worst.store} (${fmtG(worst.g)}).` : ""}`
        : undefined}
      maturity={hasData ? "green" : "amber"}
      actions={[
        { verb: "revisar", rationale: worst && worst.g < 0 ? `${worst.store} vende ${fmtG(worst.g)} frente al año pasado. Antes de lanzar más promos, mira horario, personal, stock y competencia.` : "Mira la compra media de cada tienda: donde es más baja hay margen para vender más productos juntos." },
        { verb: "vigilar", rationale: "Las tiendas abiertas hace menos de un año no tienen con qué compararse (salen como «nueva»). No mezcles su crecimiento con el de las demás." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Por tienda", b: "Mes a mes" }}
      note="Fuente: PrestaShop · pos_store_monthly (pedidos con módulo InnovaCommerceTPV, válidos; total pagado con IVA, ya neto de descuentos). Tienda = sufijo del módulo; sin sufijo = Barakaldo. Excluye web y Amazon. Margen = (venta sin IVA − coste de compra de catálogo) / venta sin IVA, sobre las líneas con coste conocido (≈98% de la venta; * = menos del 95%); el precio de línea ya va neto de cupón y promo. No incluye personal, alquiler ni mermas. Cambio frente al periodo de comparación del selector. Vista «Mes a mes»: 5 tiendas líderes, 12 meses hasta el fin del periodo."
    >
      {hasData && (
        <PosBarTable
          cols={[
            { h: "Ventas", w: 64 },
            { h: "Compras", w: 56 },
            { h: "Compra media", w: 64 },
            { h: "Margen", w: 52, title: "Lo que queda tras el coste de compra del producto" },
            { h: compMode === "yoy" ? "Vs año pasado" : "Cambio", w: 64, title: `Frente a ${labelRange(rangeA)}` },
          ]}
          rows={tableRows}
        />
      )}
    </EvidenceCard>
  );
}
