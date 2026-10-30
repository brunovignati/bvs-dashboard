/**
 * PosZoneCard (Tiendas · Clientes) — ¿De qué zona viene el cliente de cada tienda? Código postal del cliente identificado
 * (dirección en PrestaShop) de los tickets del periodo. Origen: PrestaShop POS (pos_zone).
 * Vista B: zonas compartidas, donde dos tiendas se reparten los tickets de un mismo código postal.
 */
import { useState } from "react";
import EvidenceCard from "../EvidenceCard";
import PosStoreChips from "./PosStoreChips";
import { usePosZone } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber } from "@/lib/dashboardData";
import { COLORS, num } from "./posUtils";

const MIN_SHARED = 20; // tickets mínimos de cada tienda para hablar de zona compartida

export default function PosZoneCard({ delay }) {
  const { data: raw = [] } = usePosZone();
  const { rangeB, inRange, labelRange } = useComparison();
  const [sel, setSel] = useState("Todas");

  const inP = raw.filter((r) => inRange(rangeB, r) && r.cp);
  const tkByStore = {};
  for (const r of inP) tkByStore[r.store] = (tkByStore[r.store] || 0) + num(r.tickets);
  const stores = Object.entries(tkByStore).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const store = stores.includes(sel) ? sel : "Todas";

  const sub = store === "Todas" ? inP : inP.filter((r) => r.store === store);
  const cps = {};
  for (const r of sub) {
    const c = (cps[r.cp] ||= { cp: r.cp, city: r.city || "", tickets: 0, revenue: 0 });
    c.tickets += num(r.tickets); c.revenue += num(r.revenue);
    if (!c.city && r.city) c.city = r.city;
  }
  const list = Object.values(cps).sort((a, b) => b.tickets - a.tickets);
  const total = list.reduce((s, c) => s + c.tickets, 0);
  const hasData = total > 0;
  const top = list.slice(0, 8);
  const maxT = top[0]?.tickets || 1;
  const top3 = list.slice(0, 3).reduce((s, c) => s + c.tickets, 0);
  const cityOf = (c) => (c?.city ? `${c.cp} · ${c.city}` : c?.cp || "—");

  // Vista B: zonas compartidas (todas las tiendas del periodo)
  const byCp = {};
  for (const r of inP) {
    const c = (byCp[r.cp] ||= { cp: r.cp, city: r.city || "", total: 0, st: {} });
    c.total += num(r.tickets); c.st[r.store] = (c.st[r.store] || 0) + num(r.tickets);
    if (!c.city && r.city) c.city = r.city;
  }
  const shared = Object.values(byCp).map((c) => {
    const s = Object.entries(c.st).sort((a, b) => b[1] - a[1]);
    return { ...c, s, second: s[1]?.[1] || 0 };
  }).filter((c) => c.s.length >= 2 && c.s[0][1] >= MIN_SHARED && c.second >= MIN_SHARED && c.second / c.total >= 0.2)
    .sort((a, b) => b.total - a.total).slice(0, 8);
  const altView = shared.length ? (
    <div className="space-y-2">
      {shared.map((c) => (
        <div key={c.cp}>
          <div className="flex justify-between text-xs mb-0.5"><span>{cityOf(c)}</span><span className="font-mono text-muted-foreground">{fmtNumber(c.total)} tk</span></div>
          <div className="flex h-3 rounded overflow-hidden bg-muted/50">
            {c.s.slice(0, 4).map(([s, n], i) => <div key={s} style={{ width: `${(n / c.total) * 100}%`, background: COLORS[i % COLORS.length] }} title={`${s}: ${fmtNumber(n)} tickets (${((n / c.total) * 100).toFixed(0)}%)`} />)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{c.s.slice(0, 3).map(([s, n]) => `${s} ${((n / c.total) * 100).toFixed(0)}%`).join(" · ")}</div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-muted-foreground">Ningún código postal está repartido entre dos tiendas con peso suficiente en este periodo.</p>
  );

  const hiShared = shared[0];
  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿De qué zona viene el cliente de cada tienda?"
      kpis={hasData ? [
        { value: top[0] ? top[0].cp : "—", label: `Zona más fuerte${top[0]?.city ? ` · ${top[0].city}` : ""} · ${((top[0].tickets / total) * 100).toFixed(0)}% de los tickets` },
        { value: `${((top3 / total) * 100).toFixed(0)}%`, label: "De los tickets vienen de las 3 zonas más fuertes" },
        { value: fmtNumber(shared.length), label: `Zonas compartidas por dos tiendas (≥ ${MIN_SHARED} tk cada una)` },
      ] : undefined}
      answer={!hasData ? "Sin tickets con zona en el periodo" : undefined}
      context={hasData ? `${labelRange(rangeB)} · ${fmtNumber(total)} tickets${store !== "Todas" ? ` de ${store}` : ""} de clientes identificados con dirección. ${hiShared ? `Zona más repartida: ${cityOf(hiShared)} (${hiShared.s.slice(0, 2).map(([s, n]) => `${s} ${((n / hiShared.total) * 100).toFixed(0)}%`).join(" y ")}).` : ""}` : undefined}
      maturity={hasData ? "amber" : "amber"}
      actions={[
        { verb: "cruzar", rationale: hiShared ? `En ${cityOf(hiShared)} dos tiendas se reparten al mismo cliente: antes de promocionar en las dos, comprobar en la tarjeta de movimiento si el cliente salta de una a otra.` : "Cruza las zonas con la tarjeta de movimiento entre tiendas para ver si hay canibalización." },
        { verb: "dirigir", rationale: top[0] ? `Las 3 zonas más fuertes aportan ${((top3 / total) * 100).toFixed(0)}% de los tickets: concentrar buzoneo, redes locales o acciones de barrio ahí rinde más que repartirlas.` : "Concentra las acciones locales en las zonas que más aportan." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Zonas por tienda", b: "Zonas compartidas" }}
      note="Fuente: PrestaShop · pos_zone (código postal de la dirección del cliente identificado; excluye caja genérica y clientes sin dirección, así que es una muestra, no el total de tickets). Zona compartida = código postal con ≥ 20 tickets de cada una de las dos tiendas principales y la segunda con ≥ 20% de los tickets de esa zona. Que dos tiendas compartan zona no prueba canibalización: cruzar con el movimiento entre tiendas."
    >
      {hasData && (
        <div>
          <PosStoreChips stores={stores.slice(0, 9)} value={store} onChange={setSel} />
          <div className="space-y-1.5">
            {top.map((c, i) => (
              <div key={c.cp}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-foreground truncate max-w-[60%]">{cityOf(c)}</span>
                  <span className="font-mono text-muted-foreground">{fmtNumber(c.tickets)} tk · {((c.tickets / total) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2.5 rounded bg-muted/50 overflow-hidden"><div className="h-full rounded" style={{ width: `${Math.max(1, (c.tickets / maxT) * 100)}%`, background: COLORS[i % COLORS.length] }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </EvidenceCard>
  );
}
