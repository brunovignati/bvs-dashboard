/**
 * PosFlowCard (Tiendas · Clientes) — ¿Dónde compra hoy el cliente que compró en una tienda hace un año?
 * Para el trimestre elegido (el del fin del periodo activo), toma los clientes identificados que compraron en la
 * tienda X en el MISMO trimestre del año anterior y mira si este trimestre compran en la misma tienda, en otra,
 * solo en la web o no se les ve comprar. Origen: PrestaShop POS (pos_flow). Vista B: saldo entre tiendas.
 */
import EvidenceCard from "../EvidenceCard";
import { usePosFlow, usePosMeta } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber } from "@/lib/dashboardData";
import { COLORS, GOOD, MUTED, num, qKey, qLabel, pickQ, currentQ } from "./posUtils";

const KINDS = [["same", "Misma tienda", GOOD], ["other", "Otra tienda", COLORS[0]], ["web", "Solo web", COLORS[3]], ["none", "No se les ve", MUTED]];
const MIN_BASE = 100;

export default function PosFlowCard({ delay }) {
  const { data: raw = [] } = usePosFlow();
  const { data: meta = [] } = usePosMeta();
  const { rangeB } = useComparison();

  const keys = [...new Set(raw.map(qKey))];
  const Q = pickQ(keys, rangeB);
  const rowsQ = Q == null ? [] : raw.filter((r) => qKey(r) === Q);
  const partial = Q != null && Q === currentQ(meta);

  const by = {}, inflow = {}, pairs = [];
  for (const r of rowsQ) {
    const a = (by[r.store_from] ||= { same: 0, other: 0, web: 0, none: 0, to: {} });
    const n = num(r.customers);
    a[r.dest_kind] += n;
    if (r.dest_kind === "other" && r.dest_store) {
      a.to[r.dest_store] = (a.to[r.dest_store] || 0) + n;
      inflow[r.dest_store] = (inflow[r.dest_store] || 0) + n;
      pairs.push({ from: r.store_from, to: r.dest_store, n });
    }
  }
  const rows = Object.entries(by).map(([store, a]) => ({ store, ...a, base: a.same + a.other + a.web + a.none }))
    .filter((r) => r.base >= MIN_BASE).sort((a, b) => b.base - a.base);
  const hasData = rows.length > 0;
  const T = rows.reduce((t, r) => { for (const [k] of KINDS) t[k] += r[k]; t.base += r.base; return t; }, { same: 0, other: 0, web: 0, none: 0, base: 0 });
  const pct = (x, b) => (b > 0 ? (x / b) * 100 : 0);

  // Tienda que más cliente cede a otra y destino principal
  const worst = [...rows].filter((r) => r.base >= 200).sort((a, b) => pct(b.other, b.base) - pct(a.other, a.base))[0];
  const worstTo = worst ? Object.entries(worst.to).sort((a, b) => b[1] - a[1])[0] : null;

  // Vista B: saldo (gana − pierde) por tienda y pares principales
  const stores = [...new Set([...Object.keys(by), ...Object.keys(inflow)])];
  const bal = stores.map((s) => ({ s, out: by[s]?.other || 0, inn: inflow[s] || 0 })).map((r) => ({ ...r, net: r.inn - r.out })).filter((r) => r.out + r.inn >= 20).sort((a, b) => b.net - a.net);
  const topPairs = pairs.sort((a, b) => b.n - a.n).slice(0, 5);
  const altView = bal.length ? (
    <div className="space-y-3">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground text-right">
            <th className="text-left font-normal pb-1">Tienda</th><th className="font-normal pb-1">Pierde hacia otras</th><th className="font-normal pb-1">Gana desde otras</th><th className="font-normal pb-1">Saldo</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {bal.map((r) => (
            <tr key={r.s} className="text-right border-b border-border/30">
              <td className="text-left py-1 font-sans">{r.s}</td><td>{fmtNumber(r.out)}</td><td>{fmtNumber(r.inn)}</td>
              <td style={{ color: r.net >= 0 ? GOOD : "hsl(4,60%,45%)" }}>{r.net >= 0 ? "+" : ""}{fmtNumber(r.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[11px]">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Trasvases más grandes (clientes)</div>
        {topPairs.map((p, i) => <div key={i} className="flex justify-between font-mono"><span className="font-sans">{p.from} → {p.to}</span><span>{fmtNumber(p.n)}</span></div>)}
      </div>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Dónde compra hoy el cliente que compraba en cada tienda hace un año?"
      kpis={hasData ? [
        { value: `${pct(T.same, T.base).toFixed(0)}%`, label: "Sigue comprando en su misma tienda" },
        { value: `${pct(T.other, T.base).toFixed(0)}%`, label: "Compra ahora en otra tienda" },
        { value: `${pct(T.web, T.base).toFixed(0)}%`, label: "Compra solo en la web" },
      ] : undefined}
      answer={!hasData ? "Aún no hay trimestres comparables (hace falta un año de histórico)" : undefined}
      context={hasData ? `${qLabel(Q)} frente a ${qLabel(Q - 4)}: ${fmtNumber(T.base)} clientes identificados que compraron en una tienda en ${qLabel(Q - 4)}.${worst ? ` Cede más a otra tienda: ${worst.store} (${pct(worst.other, worst.base).toFixed(0)}% de su clientela${worstTo ? `, sobre todo hacia ${worstTo[0]}` : ""}).` : ""}${partial ? ` Ojo: ${qLabel(Q)} aún no ha terminado, 'No se les ve' está inflado.` : ""} Un cliente que paga como caja genérica no se puede seguir: 'No se les ve' no significa que se haya perdido.` : undefined}
      maturity={hasData && !partial ? "green" : "amber"}
      actions={[
        { verb: "revisar", rationale: worst ? `${worst.store} pierde ${pct(worst.other, worst.base).toFixed(0)}% de su clientela hacia otra tienda${worstTo ? ` (sobre todo ${worstTo[0]})` : ""}: mirar en la tarjeta de zona si comparten barrio antes de duplicar promos en las dos.` : "Mira qué tienda cede más clientes a otra y si comparten barrio." },
        { verb: "medir", rationale: "El movimiento entre tiendas no es pérdida si el cliente sigue comprando en BVS: el saldo (vista B) dice quién gana y quién cede; la vuelta total se lee en 'Misma tienda' + 'Otra tienda'." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Por tienda", b: "Saldo entre tiendas" }}
      note={`Fuente: PrestaShop · pos_flow. Base = clientes identificados (no caja genérica) con ticket en la tienda X en ${Q != null ? qLabel(Q - 4) : "el mismo trimestre del año anterior"}; si compraron en varias, cuentan en cada una. Destino en ${Q != null ? qLabel(Q) : "el trimestre"}: misma tienda = compró en X; otra tienda = no en X pero sí en otra (la de más tickets); solo web = solo pedidos web; no se les ve = ninguna compra identificada. Trimestres naturales; el trimestre es el del fin del periodo del selector. Tiendas con menos de ${MIN_BASE} clientes no se muestran.`}
    >
      {hasData && (
        <div className="mt-1 space-y-2">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            {KINDS.map(([k, l, c]) => <span key={k} className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}
          </div>
          {rows.map((r) => (
            <div key={r.store}>
              <div className="flex items-baseline justify-between text-xs mb-0.5">
                <span className="text-foreground">{r.store}</span>
                <span className="font-mono text-muted-foreground">{fmtNumber(r.base)} clientes · {pct(r.same, r.base).toFixed(0)}% se quedan</span>
              </div>
              <div className="flex h-3 rounded overflow-hidden bg-muted/50">
                {KINDS.map(([k, l, c]) => <div key={k} style={{ width: `${pct(r[k], r.base)}%`, background: c }} title={`${l}: ${fmtNumber(r[k])} (${pct(r[k], r.base).toFixed(0)}%)`} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </EvidenceCard>
  );
}
