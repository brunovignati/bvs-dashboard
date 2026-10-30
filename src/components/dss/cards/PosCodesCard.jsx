/**
 * PosCodesCard (Tiendas · Códigos) — Qué códigos de descuento se usan más en tienda (cupones de caja y
 * promos del TPV), cuánto descuentan y cómo evolucionan mes a mes. Origen: PrestaShop POS.
 * Vista B: evolución mensual de los 5 códigos más usados (análisis por meses).
 */
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePosCodesMonthly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, num, ym, ymLabel, isNotPromo, lastMonths } from "./posUtils";

const SRC = { cupon: "cupón", promo_pos: "promo de tienda" };
const cut = (s, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function PosCodesCard({ delay }) {
  const { data: raw = [] } = usePosCodesMonthly();
  const { rangeB, inRange, labelRange } = useComparison();

  const valid = raw.filter((r) => !isNotPromo(r.code));
  const agg = {};
  for (const r of valid) {
    if (!inRange(rangeB, r)) continue;
    const a = (agg[r.code] ||= { code: r.code, src: r.src, tickets: 0, discount: 0, revenue: 0 });
    a.tickets += num(r.tickets); a.discount += num(r.discount); a.revenue += num(r.revenue);
  }
  const all = Object.values(agg).filter((a) => a.tickets > 0).sort((a, b) => b.tickets - a.tickets);
  const ranked = all.slice(0, 10).map((a) => ({
    ...a, name: cut(a.code), avgDto: a.tickets > 0 ? a.discount / a.tickets : 0,
    pct: a.revenue + a.discount > 0 ? (a.discount / (a.revenue + a.discount)) * 100 : 0,
  }));
  const totalTk = all.reduce((s, a) => s + a.tickets, 0);
  const totalDto = all.reduce((s, a) => s + a.discount, 0);
  const hasData = ranked.length > 0;
  const top = ranked[0];
  const top3Share = totalTk > 0 ? (all.slice(0, 3).reduce((s, a) => s + a.tickets, 0) / totalTk) * 100 : 0;

  // ── Vista B: evolución mensual de los 5 códigos líderes del periodo (12 meses hasta el corte) ──
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const top5 = all.slice(0, 5).map((a) => a.code);
  const months = lastMonths(valid, cutoff, 12);
  const evo = months.map((k) => {
    const o = { name: ymLabel(k) };
    for (const c of top5) o[cut(c, 22)] = valid.filter((r) => ym(r) === k && r.code === c).reduce((s, r) => s + num(r.tickets), 0);
    return o;
  });
  const altView = evo.length >= 2 && top5.length ? (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={evo} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(evo.length / 8))} />
          <YAxis {...AXIS} />
          <Tooltip formatter={(v, n) => [`${fmtNumber(v)} usos`, n]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          {top5.map((c, i) => <Line key={c} type="monotone" dataKey={cut(c, 22)} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]} kpiGrid
      question="¿Qué códigos se usan más en tienda?"
      kpis={hasData ? [
        { value: cut(top.code, 18), label: "Más usado" },
        { value: fmtNumber(top.tickets), label: `Usos de ${cut(top.code, 14)}` },
        { value: fmtCurrency(totalDto), label: `Descontado en total` },
      ] : undefined}
      answer={!hasData ? "Sin códigos usados en el periodo" : undefined}
      context={hasData ? `${labelRange(rangeB)} · ${fmtNumber(all.length)} códigos distintos. Los 3 más usados suman el ${top3Share.toFixed(0)}% de los usos. No cuenta vales de devolución ni descuento de empleado.` : undefined}
      maturity="amber"
      actions={[
        { verb: "revisar", rationale: top ? `${top.code} concentra los usos. Antes de repetirlo, mira en «¿Qué códigos hacen volver más al cliente?» si además hace volver al cliente.` : "Revisa qué códigos concentran los usos." },
        { verb: "limpiar", rationale: "Los códigos que casi nadie usa complican la caja y no mueven ventas: son candidatos a retirar." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Ranking", b: "Mes a mes" }}
      note="Fuente: PrestaShop · pos_codes_monthly. Cupones de caja (ps_order_cart_rule, normalizados: '20% apertura', 'Descuento manual en caja') + promos del TPV (ps_prestapos_discount_log, desde 11-jun-2026, una por línea de descuento). Usos = tickets que llevan el código. % descuento = descuento / (ticket pagado + descuento). Vista 'Por meses': tickets mensuales de los 5 códigos líderes del periodo, 12 meses hasta su fin."
    >
      {hasData && (
        <div style={{ height: Math.max(200, ranked.length * 28 + 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ranked} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" {...AXIS} tick={{ fontSize: 8, fill: AXIS.tick.fill }} />
              <YAxis type="category" dataKey="name" width={150} {...AXIS} />
              <Tooltip
                formatter={(v, n, p) => [`${fmtNumber(v)} usos · ${fmtCurrency(p?.payload?.discount)} descontados · ${p?.payload?.avgDto.toFixed(2)} € por uso · ${p?.payload?.pct.toFixed(1)}% de la compra`, SRC[p?.payload?.src] || "código"]}
                labelFormatter={(l, p) => p?.[0]?.payload?.code || l} labelStyle={{ fontSize: 10 }} />
              <Bar dataKey="tickets" radius={[0, 4, 4, 0]}>
                {ranked.map((r, i) => <Cell key={i} fill={r.src === "promo_pos" ? COLORS[3] : COLORS[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 justify-end text-[10px] text-muted-foreground -mt-1">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[0] }} />cupón de caja</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[3] }} />promo de tienda</span>
          </div>
        </div>
      )}
    </EvidenceCard>
  );
}
