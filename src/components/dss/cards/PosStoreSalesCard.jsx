/**
 * PosStoreSalesCard (Tiendas · Ventas) — Facturación de cada tienda física y su crecimiento frente
 * al periodo de comparación del selector (por defecto, el mismo mes del año anterior).
 * Origen: PrestaShop POS (tickets TPV válidos). Vista B: evolución mensual de las 5 tiendas líderes.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePosStoreMonthly, usePosMarginMonthly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, num, pctChange, fmtG, gColor, fmtPts, ym, ymLabel, cmpWord, sumByKey, lastMonths, marginPct, marginEur, coverPct } from "./posUtils";

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
  const mgEur = marginEur(mt.rev_lines, mt.rev_known, mt.cost);
  const hasMargin = mg != null;
  const withMg = rows.filter((r) => r.mg != null && r.cover >= 95);
  const mgHi = [...withMg].sort((a, b) => b.mg - a.mg)[0], mgLo = [...withMg].sort((a, b) => a.mg - b.mg)[0];

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

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Cuánto vende cada tienda y cómo crece frente al mismo mes del año pasado?"
      kpis={hasData ? [
        { value: fmtCurrency(total), label: `Facturación · ${labelRange(rangeB)}`, delta: pctChange(total, prevTotal) ?? undefined },
        hasMargin
          ? { value: `${mg.toFixed(1)}%`, label: `Margen de producto · ≈ ${fmtCurrency(mgEur)}`, delta: mgPrev != null ? mg - mgPrev : undefined, deltaSuffix: " pts" }
          : { value: fmtNumber(tickets), label: "Tickets", delta: pctChange(tickets, prevTickets) ?? undefined },
        { value: `${avg.toFixed(1)} €`, label: "Ticket medio", delta: pctChange(avg, prevAvg) ?? undefined },
      ] : undefined}
      answer={!hasData ? "Sin ventas de tienda en el periodo" : undefined}
      context={hasData
        ? `Variación vs ${labelRange(rangeA)} (${cmpWord(compMode)}).${sameG != null ? ` Con las mismas tiendas: ${fmtG(sameG)}.` : ""}${best && worst && best.store !== worst.store ? ` Sube más ${best.store} (${fmtG(best.g)}) y baja más ${worst.store} (${fmtG(worst.g)}).` : ""}${hasMargin && mgHi && mgLo && mgHi.store !== mgLo.store ? ` Margen: más en ${mgHi.store} (${mgHi.mg.toFixed(1)}%), menos en ${mgLo.store} (${mgLo.mg.toFixed(1)}%)${mgPrev != null ? `; total ${fmtPts(mg - mgPrev)} vs ${labelRange(rangeA)}` : ""}.` : ""} Los tickets del periodo: ${fmtNumber(tickets)} (${fmtG(pctChange(tickets, prevTickets))}).`
        : undefined}
      maturity={hasData ? "green" : "amber"}
      actions={[
        { verb: "revisar", rationale: worst && worst.g < 0 ? `${worst.store} cae ${fmtG(worst.g)} frente al año pasado: comprobar horario, personal, stock o competencia antes de lanzar más promos.` : "Compara el ticket medio de cada tienda: las que venden menos por ticket tienen margen para venta cruzada." },
        { verb: "vigilar", rationale: "Las tiendas abiertas hace menos de un año no tienen base de comparación; no mezclar su crecimiento con el de las demás." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Por tienda", b: "Evolución" }}
      note="Fuente: PrestaShop · pos_store_monthly (pedidos con módulo InnovaCommerceTPV, válidos; total pagado con IVA, ya neto de descuentos). Tienda = sufijo del módulo; sin sufijo = Barakaldo. Excluye web y Amazon. Margen de producto = (venta sin IVA − coste de compra de catálogo) / venta sin IVA, sobre las líneas con coste conocido (≈98% de la venta; * = menos del 95%); el precio de línea ya va neto de cupón y promo. No incluye personal, alquiler ni mermas. Variación frente al periodo de comparación del selector. Vista 'Evolución': 5 tiendas líderes, 12 meses hasta el fin del periodo."
    >
      {hasData && (
        <div className="mt-1 space-y-1.5">
          <div className="flex justify-end text-[10px] uppercase tracking-wide text-muted-foreground">
            <span className="w-14 text-right" title={`vs ${labelRange(rangeA)}`}>{compMode === "yoy" ? "YoY" : "Var."}</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.store}>
              <div className="flex items-baseline justify-between text-xs mb-0.5">
                <span className="text-foreground truncate max-w-[45%]">{r.store}</span>
                <span className="font-mono text-muted-foreground flex items-baseline">
                  {fmtCurrency(r.revenue)} · {fmtNumber(r.tickets)} tk · {r.avg.toFixed(0)} €/tk{r.mg != null && (
                    <span className="ml-1" title={`Margen de producto${r.cover < 95 ? ` — coste conocido solo en el ${r.cover.toFixed(0)}% de la venta (poco fiable)` : ""}`}> · {r.mg.toFixed(0)}% mg{r.cover < 95 ? "*" : ""}</span>
                  )}
                  <span className="w-14 text-right font-semibold" style={{ color: gColor(r.g) }}
                    title={`${labelRange(rangeA)}: ${fmtCurrency(r.prev)}`}>{r.prev > 0 ? fmtG(r.g) : "nueva"}</span>
                </span>
              </div>
              <div className="h-2.5 rounded bg-muted/50 overflow-hidden">
                <div className="h-full rounded" style={{ width: `${Math.max(1, (r.revenue / maxRev) * 100)}%`, background: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </EvidenceCard>
  );
}
