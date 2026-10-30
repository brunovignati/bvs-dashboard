/**
 * PosCodeSuccessCard (Tiendas · Códigos) — Qué códigos funcionan mejor: ¿el cliente que lo usó vuelve
 * más de lo que habría vuelto sin código? Se compara con clientes iguales (mismo mes y misma frecuencia
 * de compra previa) que NO usaron código. Origen: PrestaShop POS, ventana fija desde 11-jun-2026
 * (no depende del selector: el seguimiento necesita 60 días).
 * Prueba estadística (v2): errores agrupados por cliente (un cliente con varios tickets cuenta una vez) y
 * corrección de Holm entre códigos (se miran varios a la vez). Vista B: margen y gasto por código.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePosCodeRetention, usePosMeta } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";
import { GRID, AXIS, GOOD, BAD, MUTED, num, fmtPts, fmtPuntos, isNotPromo, marginPct, marginEur, retentionZ, pTwoSided, holmSig } from "./posUtils";

const MIN_N = 100;
const cut = (s, n = 24) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function PosCodeSuccessCard({ delay }) {
  const { data: raw = [] } = usePosCodeRetention();
  const { data: meta = [] } = usePosMeta();
  const mb = meta.find((m) => m.key === "pos")?.value?.margin_base;
  const mgBase = mb ? marginPct(mb.rev_known, mb.cost) : null;
  const eurBase = mb && num(mb.tickets) > 0 && num(mb.rev_known) > 0 ? marginEur(mb.rev, mb.rev_known, mb.cost) / mb.tickets : null;

  const base = raw
    .filter((r) => !isNotPromo(r.code) && num(r.n60) >= MIN_N)
    .map((r) => {
      const n = num(r.n60), real = num(r.r60), exp = num(r.e60);
      const z = retentionZ(real, exp, n, r.ss60);
      const ns = num(r.ns) || 1;
      const tk = num(r.tickets_all);
      return {
        code: r.code, name: cut(r.code), n, tickets: num(r.tickets), customers: num(r.customers), tkAll: tk,
        real: (real / n) * 100, exp: (exp / n) * 100, diff: ((real - exp) / n) * 100, z, p: pTwoSided(z),
        spend: num(r.s60) / ns, spendExp: num(r.es60) / ns,
        mg: marginPct(r.rev_known, r.cost),
        eurTk: tk > 0 && num(r.rev_known) > 0 ? marginEur(r.rev_all, r.rev_known, r.cost) / tk : null,
      };
    });
  // Holm: con varios códigos a la vez, alguno saldría "claro" por pura casualidad; Holm lo corrige.
  const holm = holmSig(base.map((r) => r.p));
  const rows = base.map((r, i) => ({ ...r, sig: holm[i] })).sort((a, b) => b.diff - a.diff);

  const hasData = rows.length > 0;
  const winners = rows.filter((r) => r.sig && r.diff > 0);
  const losers = rows.filter((r) => r.sig && r.diff < 0);
  const best = winners[0], worst = losers[losers.length - 1];
  const barColor = (r) => (!r.sig ? MUTED : r.diff > 0 ? GOOD : BAD);
  const mgTxt = (r) => (r && r.mg != null ? `margen ${r.mg.toFixed(0)}%${mgBase != null ? ` frente a ${mgBase.toFixed(0)}% sin código` : ""}` : "");

  // Vista B: margen y gasto por código (los 10 con más tickets)
  const byTk = [...rows].sort((a, b) => b.tkAll - a.tkAll).slice(0, 10);
  const altView = byTk.length ? (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground text-right">
            <th className="text-left font-normal pb-1">Código</th>
            <th className="font-normal pb-1">Compras</th>
            <th className="font-normal pb-1">Margen</th>
            <th className="font-normal pb-1" title="Margen en euros de cada compra con este código">Margen por compra</th>
            <th className="font-normal pb-1" title="Gasto medio del cliente en los 60 días siguientes; entre paréntesis, lo que gastaría sin código">Gasto en 60 días</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {mb && mgBase != null && (
            <tr className="text-right border-b border-border/60 text-foreground">
              <td className="text-left py-1 font-sans font-medium">Sin código</td>
              <td>{fmtNumber(num(mb.tickets))}</td>
              <td>{mgBase.toFixed(1)}%</td>
              <td>{eurBase != null ? `${eurBase.toFixed(2)} €` : "—"}</td>
              <td>—</td>
            </tr>
          )}
          {byTk.map((r) => {
            const d = r.mg != null && mgBase != null ? r.mg - mgBase : null;
            return (
              <tr key={r.code} className="text-right border-b border-border/30">
                <td className="text-left py-1 font-sans truncate max-w-[150px]" title={r.code}>{r.name}</td>
                <td>{fmtNumber(r.tkAll)}</td>
                <td title={d != null ? fmtPts(d) + " vs sin código" : ""}>{r.mg != null ? `${r.mg.toFixed(1)}%` : "—"}{d != null && <span style={{ color: d >= 0 ? GOOD : BAD }}> {d >= 0 ? "▲" : "▼"}</span>}</td>
                <td>{r.eurTk != null ? `${r.eurTk.toFixed(2)} €` : "—"}</td>
                <td>{r.spend.toFixed(0)} € <span className="text-muted-foreground">({r.spendExp.toFixed(0)})</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-1.5">Margen sobre toda la venta del código. Entre paréntesis, lo que gastaría el cliente sin código.</p>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]} kpiGrid
      question="¿Qué códigos hacen volver más al cliente?"
      kpis={hasData ? [
        { value: fmtNumber(winners.length), label: "Hacen volver más" },
        { value: fmtNumber(losers.length), label: "Hacen volver menos" },
        { value: fmtNumber(rows.length), label: "Códigos medidos" },
      ] : undefined}
      answer={!hasData ? "Aún no hay códigos con datos suficientes" : undefined}
      context={hasData
        ? `${best ? `Mejor: ${best.code} (${fmtPuntos(best.diff)}${best.mg != null ? `, ${mgTxt(best)}` : ""}).` : "Ninguno hace volver más al cliente."} ${worst ? `Peor: ${worst.code} (${fmtPuntos(worst.diff)}).` : ""} Cada barra: puntos más (o menos) de clientes que vuelven en 60 días frente a quien no usó código. Gris = sin diferencia clara.`
        : undefined}
      maturity="amber"
      actions={[
        { verb: "mantener", rationale: winners.length ? `Los códigos en verde (${winners.slice(0, 3).map((w) => w.code).join(", ")}) traen de vuelta al cliente más de lo normal: son los que merece repetir. Mira su margen en «Margen y gasto» antes de ampliarlos.` : "Ningún código hace volver más al cliente: el descuento, por sí solo, no fideliza." },
        { verb: "revisar", rationale: losers.length ? `Los códigos en rojo (${losers.slice(0, 3).map((w) => w.code).join(", ")}) adelantan compras: el cliente compra con descuento y vuelve menos. Cámbialos por un regalo o una venta cruzada.` : "Vigila los códigos que adelantan compras sin hacer volver más al cliente." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Cuánto vuelven", b: "Margen y gasto" }}
      note="Fuente: PrestaShop · pos_code_retention + pos_meta. Método observacional: por ticket con código, se mira si el cliente vuelve a cualquier tienda en 60 días y se compara con lo esperado para tickets SIN código del mismo mes y la misma frecuencia de compra previa (1ª compra, 0, 1-2, 3-5, 6+ tickets en 180 días). Prueba: z = (reales − esperados) / √Σ(residuo por cliente)², de modo que un cliente con varios tickets cuenta una sola vez; con la corrección de Holm porque se comparan varios códigos a la vez (5%). Gris = no distinguible del azar. Margen de producto = (venta sin IVA − coste de compra de catálogo) / venta sin IVA, línea ya neta de descuento; sobre todos los tickets del código. Excluye clientes de caja genérica en la vuelta (≈44% de los tickets con promo, no rastreables), vales de devolución y empleado. Ventana desde 11-jun-2026 (inicio del registro de promos POS). No es un experimento: orienta, no prueba causalidad."
    >
      {hasData && (
        <div style={{ height: Math.max(220, rows.length * 24 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" {...AXIS} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} />
              <YAxis type="category" dataKey="name" width={150} {...AXIS} />
              <ReferenceLine x={0} stroke={MUTED} />
              <Tooltip
                formatter={(v, n, p) => [`${p?.payload?.real.toFixed(1)}% vuelve · ${p?.payload?.exp.toFixed(1)}% sin código · ${fmtNumber(p?.payload?.n)} compras · ${fmtNumber(p?.payload?.customers)} clientes`, `${fmtPuntos(v)}${p?.payload?.sig ? "" : " (sin diferencia clara)"}`]}
                labelFormatter={(l, p) => p?.[0]?.payload?.code || l} labelStyle={{ fontSize: 10 }} />
              <Bar dataKey="diff" radius={[3, 3, 3, 3]}>
                {rows.map((r, i) => <Cell key={i} fill={barColor(r)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
