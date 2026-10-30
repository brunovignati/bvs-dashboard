/**
 * PosBasketCard (Tiendas · Cesta) — ¿Qué se lleva el cliente cuando usa un código? Para el código elegido compara el
 * ticket medio, las unidades por ticket y las marcas que más aparecen frente a los tickets SIN código (ventana desde
 * 11-jun-2026, todos los clientes, también caja genérica). Origen: PrestaShop POS (pos_basket).
 * Vista B: marcas que más (y menos) se arrastran con el código, en veces frente a sin código.
 */
import { useState } from "react";
import EvidenceCard from "../EvidenceCard";
import { usePosBasket } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";
import { COLORS, GOOD, BAD, num, pctChange, fmtG, isNotPromo } from "./posUtils";

const BASE = "(sin código)";
const MIN_BRAND_TK = 20;
const cut = (s, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function PosBasketCard({ delay }) {
  const { data: raw = [] } = usePosBasket();
  const [sel, setSel] = useState(null);

  const tot = {}, br = {};
  for (const r of raw) { if (!r.brand) tot[r.code] = r; else (br[r.code] ||= []).push(r); }
  const base = tot[BASE];
  const codes = Object.values(tot).filter((r) => r.code !== BASE && !isNotPromo(r.code)).sort((a, b) => num(b.tickets) - num(a.tickets));
  // Un código que identifica un solo artículo (p. ej. SNACKBAR: el 100% de sus tickets lleva esa marca) no dice nada de la cesta.
  const own = (c) => (br[c.code] || []).some((b) => num(b.tickets) / num(c.tickets) >= 0.95);
  const code = codes.find((c) => c.code === sel)?.code || (codes.find((c) => !own(c)) || codes[0])?.code;
  const t = code ? tot[code] : null;
  const hasData = !!(t && base && num(base.tickets) > 0);

  let rows = [], kpi = {};
  if (hasData) {
    const baseShare = {};
    for (const b of br[BASE] || []) baseShare[b.brand] = num(b.tickets) / num(base.tickets);
    rows = (br[code] || []).map((b) => {
      const share = num(b.tickets) / num(t.tickets), bs = baseShare[b.brand];
      return { brand: b.brand, tickets: num(b.tickets), share: share * 100, baseShare: bs != null ? bs * 100 : null, lift: bs > 0 ? share / bs : null };
    });
    kpi = {
      tk: num(t.rev) / num(t.tickets), tkBase: num(base.rev) / num(base.tickets),
      u: num(t.units) / num(t.tickets), uBase: num(base.units) / num(base.tickets),
    };
  }
  const byShare = [...rows].sort((a, b) => b.share - a.share).slice(0, 8);
  const lifted = rows.filter((r) => r.lift != null && r.tickets >= MIN_BRAND_TK && r.baseShare >= 1 && r.share < 95).sort((a, b) => b.lift - a.lift);
  const up = lifted.slice(0, 6), down = [...lifted].reverse().filter((r) => r.lift < 0.8).slice(0, 3);
  const bestLift = up[0];

  const altView = hasData ? (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground text-right">
            <th className="text-left font-normal pb-1">Marca</th><th className="font-normal pb-1">Con código</th><th className="font-normal pb-1">Sin código</th><th className="font-normal pb-1">Arrastre</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {[...up, ...down].map((r) => (
            <tr key={r.brand} className="text-right border-b border-border/30">
              <td className="text-left py-1 font-sans truncate max-w-[150px]" title={r.brand}>{cut(r.brand, 22)}</td>
              <td>{r.share.toFixed(0)}%</td><td>{r.baseShare.toFixed(0)}%</td>
              <td style={{ color: r.lift >= 1 ? GOOD : BAD }}>{r.lift.toFixed(1)}×</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-1.5">% de las compras que llevan esa marca. Arrastre = cuántas veces más (o menos) aparece que sin código.</p>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]} kpiGrid
      question="¿Qué compra el cliente cuando usa un código?"
      kpis={hasData ? [
        { value: `${kpi.tk.toFixed(1)} €`, label: "Compra media", delta: pctChange(kpi.tk, kpi.tkBase) ?? undefined },
        { value: kpi.u.toFixed(1), label: "Unidades por compra", delta: pctChange(kpi.u, kpi.uBase) ?? undefined },
        { value: bestLift ? `${bestLift.lift.toFixed(1)}×` : "—", label: bestLift ? `Más ${cut(bestLift.brand, 14)}` : "Marca que más arrastra" },
      ] : undefined}
      answer={!hasData ? "Aún no hay cesta por código" : undefined}
      context={hasData ? `Con ${code} (${fmtNumber(num(t.tickets))} compras): compra media ${fmtG(pctChange(kpi.tk, kpi.tkBase))} y unidades por compra ${fmtG(pctChange(kpi.u, kpi.uBase))} frente a una compra sin código (${kpi.tkBase.toFixed(1)} € y ${kpi.uBase.toFixed(1)} unidades, ${fmtNumber(num(base.tickets))} compras). La compra ya lleva el descuento aplicado.${bestLift ? ` ${cut(bestLift.brand, 24)} aparece ${bestLift.lift.toFixed(1)} veces más que sin código.` : ""}` : undefined}
      maturity="amber"
      actions={[
        { verb: "aprovechar", rationale: bestLift ? `Con ${code}, ${cut(bestLift.brand, 24)} aparece ${bestLift.lift.toFixed(1)}× más que sin código: es la marca natural para completar la oferta (regalo o segunda unidad) en vez de descontar toda la compra.` : "Busca la marca que más se arrastra con cada código y úsala para completar la oferta." },
        { verb: "revisar", rationale: hasData && kpi.tk < kpi.tkBase ? `Con ${code} la compra media es menor que sin código (${kpi.tk.toFixed(1)} € frente a ${kpi.tkBase.toFixed(1)} €): el descuento no está subiendo la compra.` : "Comprueba que el código sube la compra y no solo regala descuento a quien ya compraba." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Marcas más frecuentes", b: "Qué marca arrastra" }}
      note="Fuente: PrestaShop · pos_basket + pos_meta. Tickets TPV válidos desde 11-jun-2026 (inicio del registro de promos POS), todos los clientes. 'Sin código' = tickets sin ningún cupón ni promo POS (se excluyen también los de vale de devolución y empleado). Marca = fabricante del producto; 'Sin marca' = productos sin fabricante. Un ticket con varios códigos cuenta en cada uno. El código se compara con la base completa sin ajustar por tienda, cliente ni mes: describe qué se vende con el código, no su causa. Solo se guardan los códigos con ≥ 100 tickets y sus 12 marcas más frecuentes."
    >
      {hasData && (
        <div>
          <div className="mb-2">
            <select value={code} onChange={(e) => setSel(e.target.value)} className="text-xs bg-background border border-border rounded px-2 py-1 max-w-full">
              {codes.map((c) => <option key={c.code} value={c.code}>{cut(c.code, 40)} · {fmtNumber(num(c.tickets))} compras</option>)}
            </select>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground mb-1.5">
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS[0] }} />Con código</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS[8] }} />Sin código</span>
          </div>
          <div className="space-y-1.5">
            {byShare.map((r) => (
              <div key={r.brand}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="truncate max-w-[60%]" title={r.brand}>{cut(r.brand)}</span>
                  <span className="font-mono text-muted-foreground">{r.share.toFixed(0)}%{r.baseShare != null ? ` · sin código ${r.baseShare.toFixed(0)}%` : ""}</span>
                </div>
                <div className="h-2 rounded bg-muted/50 overflow-hidden"><div className="h-full rounded" style={{ width: `${Math.max(1, r.share)}%`, background: COLORS[0] }} /></div>
                {r.baseShare != null && <div className="h-1 rounded bg-muted/30 overflow-hidden mt-0.5"><div className="h-full rounded" style={{ width: `${Math.max(1, r.baseShare)}%`, background: COLORS[8] }} /></div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </EvidenceCard>
  );
}
