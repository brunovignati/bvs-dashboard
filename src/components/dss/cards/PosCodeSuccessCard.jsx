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
import { GRID, AXIS, GOOD, BAD, MUTED, num, fmtPts, isNotPromo, marginPct, marginEur, retentionZ, pTwoSided, holmSig } from "./posUtils";

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
            <th className="font-normal pb-1">Tickets</th>
            <th className="font-normal pb-1">Margen</th>
            <th className="font-normal pb-1">€ margen/tk</th>
            <th className="font-normal pb-1" title="Gasto medio del cliente en los 60 días siguientes frente a lo esperado sin código">Gasto 60 d</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {mb && mgBase != null && (
            <tr className="text-right border-b border-border/60 text-foreground">
              <td className="text-left py-1 font-sans font-medium">Sin código (base)</td>
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
      <p className="text-[10px] text-muted-foreground mt-1.5">Margen de producto sobre toda la venta del código (también caja genérica). Entre paréntesis, gasto esperado sin código.</p>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Qué códigos hacen volver más al cliente?"
      kpis={hasData ? [
        { value: best ? cut(best.code, 20) : "Ninguno claro", label: "Mejor código (vuelta a 60 días)" },
        { value: `${winners.length} / ${losers.length}`, label: "Suben / bajan la vuelta de forma clara" },
        { value: fmtNumber(rows.length), label: `Códigos medidos (≥ ${MIN_N} tickets)` },
      ] : undefined}
      answer={!hasData ? "Aún no hay códigos con seguimiento suficiente" : undefined}
      context={hasData
        ? `Diferencia en puntos entre el % que vuelve en 60 días con el código y el % esperado sin él. ${best ? `Mejor: ${best.code} (${fmtPts(best.diff)}${best.mg != null ? `, ${mgTxt(best)}` : ""}).` : "Ninguno sube la vuelta de forma clara."} ${worst ? `Peor: ${worst.code} (${fmtPts(worst.diff)}).` : ""} Gris = diferencia dentro del ruido (prueba por cliente con corrección de Holm). Solo clientes identificados; ventana fija jun–oct 2026.`
        : undefined}
      maturity="amber"
      actions={[
        { verb: "mantener", rationale: winners.length ? `Los códigos en verde (${winners.slice(0, 3).map((w) => w.code).join(", ")}) traen al cliente de vuelta más que lo normal incluso tras la corrección por comparar varios códigos a la vez: son los candidatos a repetir. Mira su margen en la vista B antes de ampliarlos.` : "Ningún código sube la vuelta de forma clara: el descuento, por sí solo, no está fidelizando." },
        { verb: "revisar", rationale: losers.length ? `Los códigos en rojo (${losers.slice(0, 3).map((w) => w.code).join(", ")}) adelantan compras: el cliente compró con descuento y vuelve menos. Sustituir por regalo o venta cruzada.` : "Vigila los códigos que adelantan compras sin aumentar la vuelta." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Vuelta a 60 días", b: "Margen y gasto" }}
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
                formatter={(v, n, p) => [`${p?.payload?.real.toFixed(1)}% vuelve · esperado ${p?.payload?.exp.toFixed(1)}% · ${fmtNumber(p?.payload?.n)} tickets medidos · ${fmtNumber(p?.payload?.customers)} clientes`, `${fmtPts(v)}${p?.payload?.sig ? "" : " (ruido)"}`]}
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
