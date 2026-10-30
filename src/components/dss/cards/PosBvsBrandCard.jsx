/**
 * PosBvsBrandCard (Tiendas · Ventas) — Venta de la marca propia BVS Vet Shop en cada tienda física
 * y su peso sobre la venta total de la tienda. Origen: PrestaShop POS (líneas de ticket × fabricante).
 * Vista B: evolución mensual del peso de BVS en toda la red de tiendas.
 */
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePosBvsMonthly, usePosStoreMonthly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, num, pctChange, fmtG, gColor, ym, ymLabel, cmpWord, sumByKey, lastMonths } from "./posUtils";

const BRAND = "BVS Vet Shop";

export default function PosBvsBrandCard({ delay }) {
  const { data: bvsRaw = [] } = usePosBvsMonthly();
  const { data: storeRaw = [] } = usePosStoreMonthly();
  const { rangeA, rangeB, compMode, inRange, labelRange } = useComparison();

  const bvs = bvsRaw.filter((r) => r.brand === BRAND);
  const cur = sumByKey(bvs, inRange, rangeB, (r) => r.store, ["revenue", "units"]);
  const prev = sumByKey(bvs, inRange, rangeA, (r) => r.store, ["revenue", "units"]);
  const sales = sumByKey(storeRaw, inRange, rangeB, (r) => r.store, ["revenue"]);
  const salesPrev = sumByKey(storeRaw, inRange, rangeA, (r) => r.store, ["revenue"]);

  const rows = Object.entries(cur)
    .map(([store, a]) => {
      const tot = sales[store]?.revenue || 0;
      const pr = prev[store]?.revenue || 0;
      const totPrev = salesPrev[store]?.revenue || 0;
      return {
        store, revenue: a.revenue, units: a.units, share: tot > 0 ? (a.revenue / tot) * 100 : 0,
        prev: pr, g: pctChange(a.revenue, pr), sharePrev: totPrev > 0 ? (pr / totPrev) * 100 : null,
      };
    })
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const total = rows.reduce((s, r) => s + r.revenue, 0);
  const units = rows.reduce((s, r) => s + r.units, 0);
  const prevTotal = Object.values(prev).reduce((s, a) => s + a.revenue, 0);
  const prevUnits = Object.values(prev).reduce((s, a) => s + a.units, 0);
  const allSales = Object.values(sales).reduce((s, a) => s + a.revenue, 0);
  const allSalesPrev = Object.values(salesPrev).reduce((s, a) => s + a.revenue, 0);
  const share = allSales > 0 ? (total / allSales) * 100 : 0;
  const sharePrev = allSalesPrev > 0 ? (prevTotal / allSalesPrev) * 100 : null;
  const hasData = rows.length > 0;
  const maxRev = rows[0]?.revenue || 1;
  const topShare = [...rows].sort((a, b) => b.share - a.share)[0];
  const lowShare = [...rows].filter((r) => r.revenue > 500).sort((a, b) => a.share - b.share)[0];

  // ── Vista B: evolución mensual del peso de BVS en la red (12 meses hasta el corte) ──
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const months = lastMonths(storeRaw, cutoff, 12);
  const evo = months.map((k) => {
    const b = bvs.filter((r) => ym(r) === k).reduce((s, r) => s + num(r.revenue), 0);
    const t = storeRaw.filter((r) => ym(r) === k).reduce((s, r) => s + num(r.revenue), 0);
    return { name: ymLabel(k), "BVS €": b, "Peso %": t > 0 ? Math.round((b / t) * 1000) / 10 : 0 };
  });
  const altView = evo.length >= 2 ? (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={evo} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(evo.length / 8))} />
          <YAxis yAxisId="l" {...AXIS} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
          <YAxis yAxisId="r" orientation="right" {...AXIS} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v, n) => [n === "Peso %" ? `${v}%` : fmtCurrency(v), n]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          <Bar yAxisId="l" dataKey="BVS €" fill={COLORS[1]} radius={[3, 3, 0, 0]} />
          <Line yAxisId="r" type="monotone" dataKey="Peso %" stroke={COLORS[0]} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Cuánto vende la marca BVS Vet Shop en cada tienda y qué peso tiene?"
      kpis={hasData ? [
        { value: fmtCurrency(total), label: `Venta marca BVS · ${labelRange(rangeB)}`, delta: pctChange(total, prevTotal) ?? undefined },
        { value: `${share.toFixed(1)}%`, label: "Peso sobre la venta de tienda", delta: sharePrev != null ? share - sharePrev : undefined, deltaSuffix: " pts" },
        { value: fmtNumber(units), label: "Unidades", delta: pctChange(units, prevUnits) ?? undefined },
      ] : undefined}
      answer={!hasData ? "Sin ventas de marca BVS en el periodo" : undefined}
      context={hasData
        ? `Variación vs ${labelRange(rangeA)} (${cmpWord(compMode)}).${topShare ? ` Mayor peso: ${topShare.store} (${topShare.share.toFixed(1)}%).` : ""}${lowShare && lowShare.store !== topShare?.store ? ` Menor peso: ${lowShare.store} (${lowShare.share.toFixed(1)}%).` : ""}`
        : undefined}
      maturity={hasData ? "green" : "amber"}
      actions={[
        { verb: "empujar", rationale: lowShare ? `${lowShare.store} vende poca marca BVS en proporción: probar exposición en mostrador y una recomendación activa del equipo.` : "Empuja la marca propia en las tiendas donde pesa menos." },
        { verb: "copiar", rationale: topShare ? `Mira qué hace distinto ${topShare.store} (mayor peso de BVS) y llévalo a las demás.` : "Replica lo que hacen las tiendas con mayor peso de BVS." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Por tienda", b: "Peso en la red" }}
      note="Fuente: PrestaShop · pos_bvs_monthly (líneas de ticket TPV → producto → fabricante BVS Vet Shop; ingreso de línea con IVA) sobre pos_store_monthly (total ticket pagado). Peso = venta BVS / venta total de la tienda en el periodo. Excluye Bawi (menos de 1K€ en tiendas). Vista 'Peso en la red': venta mensual BVS y su peso sobre todas las tiendas."
    >
      {hasData && (
        <div className="mt-1 space-y-1.5">
          <div className="flex justify-end text-[10px] uppercase tracking-wide text-muted-foreground gap-4">
            <span className="w-12 text-right">Peso</span>
            <span className="w-14 text-right">{compMode === "yoy" ? "YoY" : "Var."}</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.store}>
              <div className="flex items-baseline justify-between text-xs mb-0.5">
                <span className="text-foreground truncate max-w-[40%]">{r.store}</span>
                <span className="font-mono text-muted-foreground flex items-baseline gap-4">
                  <span>{fmtCurrency(r.revenue)}</span>
                  <span className="w-12 text-right text-foreground font-semibold">{r.share.toFixed(1)}%</span>
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
