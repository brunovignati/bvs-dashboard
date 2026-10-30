/**
 * PosHourlyCard (Tiendas · Cuándo) — ¿A qué día y hora vende cada tienda? Mapa de calor día × hora de los tickets
 * del periodo activo, con selector de tienda. Origen: PrestaShop POS (hora del ticket en el servidor).
 * Vista B: por tienda, su día fuerte, su hora punta y el peso del sábado.
 */
import { Fragment, useState } from "react";
import EvidenceCard from "../EvidenceCard";
import PosStoreChips from "./PosStoreChips";
import { usePosHourly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber } from "@/lib/dashboardData";
import { num, DOW, DOW_FULL } from "./posUtils";

const heat = (v, max) => `hsla(16,79%,57%,${(0.06 + 0.94 * (max > 0 ? v / max : 0)).toFixed(2)})`;
const topKey = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0];

function analyse(rows) {
  const g = {}, dayT = {}, hourT = {};
  let total = 0, rev = 0;
  for (const r of rows) {
    const d = num(r.dow), h = num(r.hour), t = num(r.tickets);
    const c = ((g[d] ||= {})[h] ||= { t: 0, rev: 0 });
    c.t += t; c.rev += num(r.revenue);
    dayT[d] = (dayT[d] || 0) + t; hourT[h] = (hourT[h] || 0) + t; total += t; rev += num(r.revenue);
  }
  const dayTop = +(topKey(dayT) || 0), hourTop = +(topKey(hourT) || 0);
  return { g, dayT, hourT, total, rev, dayTop, hourTop };
}

export default function PosHourlyCard({ delay }) {
  const { data: raw = [] } = usePosHourly();
  const { rangeB, inRange, labelRange } = useComparison();
  const [sel, setSel] = useState("Todas");

  const inP = raw.filter((r) => inRange(rangeB, r));
  const tkByStore = {};
  for (const r of inP) tkByStore[r.store] = (tkByStore[r.store] || 0) + num(r.tickets);
  const stores = Object.entries(tkByStore).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const store = stores.includes(sel) ? sel : "Todas";
  const A = analyse(store === "Todas" ? inP : inP.filter((r) => r.store === store));
  const hasData = A.total > 0;

  // Horas con actividad real (≥ 2% de los tickets) → columnas del mapa
  const hrsAll = Object.keys(A.hourT).map(Number).filter((h) => A.hourT[h] >= A.total * 0.02).sort((a, b) => a - b);
  const hrs = hrsAll.length ? Array.from({ length: hrsAll[hrsAll.length - 1] - hrsAll[0] + 1 }, (_, i) => hrsAll[0] + i) : [];
  let max = 0, peak = null;
  for (const d of Object.keys(A.g)) for (const h of hrs) { const c = A.g[d]?.[h]; if (c && c.t > max) { max = c.t; peak = { d: +d, h, t: c.t }; } }
  // Valle: franja abierta (día y hora con actividad normal) con menos tickets
  const maxDay = Math.max(0, ...Object.values(A.dayT)), maxHour = Math.max(0, ...Object.values(A.hourT));
  let valley = null;
  for (const d of Object.keys(A.dayT)) {
    if (A.dayT[d] < maxDay * 0.15) continue; // día casi cerrado
    for (const h of hrs) {
      if ((A.hourT[h] || 0) < maxHour * 0.25) continue; // hora casi cerrada (comida, cierre)
      const t = A.g[d]?.[h]?.t || 0;
      if (!valley || t < valley.t) valley = { d: +d, h, t };
    }
  }
  const top3 = hrs.map((h) => A.hourT[h] || 0).sort((a, b) => b - a).slice(0, 3).reduce((s, x) => s + x, 0);
  const share = (x) => (A.total > 0 ? (x / A.total) * 100 : 0);

  // Vista B: una fila por tienda
  const perStore = stores.map((s) => {
    const a = analyse(inP.filter((r) => r.store === s));
    return { s, total: a.total, day: a.dayTop, dayShare: a.total ? ((a.dayT[a.dayTop] || 0) / a.total) * 100 : 0, hour: a.hourTop, hourShare: a.total ? ((a.hourT[a.hourTop] || 0) / a.total) * 100 : 0, sat: a.total ? ((a.dayT[6] || 0) / a.total) * 100 : 0 };
  }).filter((r) => r.total >= 200);
  const altView = perStore.length ? (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground text-right">
            <th className="text-left font-normal pb-1">Tienda</th><th className="font-normal pb-1">Compras</th><th className="font-normal pb-1">Día fuerte</th><th className="font-normal pb-1">Hora fuerte</th><th className="font-normal pb-1">Sábado</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {perStore.map((r) => (
            <tr key={r.s} className="text-right border-b border-border/30">
              <td className="text-left py-1 font-sans">{r.s}</td>
              <td>{fmtNumber(r.total)}</td>
              <td>{DOW[r.day]} <span className="text-muted-foreground">{r.dayShare.toFixed(0)}%</span></td>
              <td>{r.hour}:00 <span className="text-muted-foreground">{r.hourShare.toFixed(0)}%</span></td>
              <td>{r.sat.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-1.5">El % es la parte de las compras de la tienda que cae en ese día u hora.</p>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]} kpiGrid
      question="¿Qué días y a qué horas se vende más?"
      kpis={hasData ? [
        { value: DOW_FULL[A.dayTop] ? DOW_FULL[A.dayTop][0].toUpperCase() + DOW_FULL[A.dayTop].slice(1) : "—", label: "Día más fuerte" },
        { value: `${A.hourTop}–${A.hourTop + 1} h`, label: "Hora más fuerte" },
        { value: `${share(top3).toFixed(0)}%`, label: "En sus 3 mejores horas" },
      ] : undefined}
      answer={!hasData ? "Sin compras de tienda en el periodo" : undefined}
      context={hasData ? `${labelRange(rangeB)} · ${fmtNumber(A.total)} compras${store !== "Todas" ? ` en ${store}` : " en todas las tiendas"}. El ${DOW_FULL[A.dayTop]} concentra el ${share(A.dayT[A.dayTop] || 0).toFixed(0)}% y de ${A.hourTop} a ${A.hourTop + 1} h cae el ${share(A.hourT[A.hourTop] || 0).toFixed(0)}%. Mejor momento: ${peak ? `${DOW_FULL[peak.d]} a las ${peak.h}:00` : "—"}. Cuanto más oscuro el cuadro, más compras.` : undefined}
      maturity={hasData ? "green" : "amber"}
      actions={[
        { verb: "reforzar", rationale: peak ? `${DOW_FULL[peak.d]} a las ${peak.h}:00 es el momento con más compras (${fmtNumber(peak.t)}). Ahí hace falta personal en caja y producto repuesto antes.` : "Refuerza el personal en el momento con más compras." },
        { verb: "probar", rationale: valley ? `${DOW_FULL[valley.d]} a las ${valley.h}:00 es el momento con la tienda abierta y menos compras (${fmtNumber(valley.t)}). Prueba ahí una acción (promo de franja, cita, consulta) y mira si sube.` : "Prueba una acción en el momento abierto más flojo y mira si sube." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Día y hora", b: "Por tienda" }}
      note="Fuente: PrestaShop · pos_hourly (tickets TPV válidos; día y hora de date_add, hora del servidor). Periodo = el del selector. Cada celda = tickets de ese día de la semana y hora sumados en el periodo; más oscuro = más tickets. Columnas = horas con actividad real (≥ 2% de los tickets). Valle = franja con menos tickets entre días y horas en los que la tienda abre con normalidad (excluye cierres y pausas)."
    >
      {hasData && (
        <div>
          <PosStoreChips stores={stores.slice(0, 9)} value={store} onChange={setSel} />
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `34px repeat(${hrs.length}, minmax(0, 1fr))` }}>
            <div />
            {hrs.map((h) => <div key={h} className="text-[9px] text-center text-muted-foreground">{h}</div>)}
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <Fragment key={d}>
                <div className="text-[10px] text-muted-foreground flex items-center">{DOW[d]}</div>
                {hrs.map((h) => {
                  const c = A.g[d]?.[h];
                  return (
                    <div key={h} className="h-6 rounded-sm text-[8px] flex items-center justify-center text-foreground/80"
                      style={{ background: heat(c?.t || 0, max) }}
                      title={`${DOW_FULL[d]} ${h}:00 · ${fmtNumber(c?.t || 0)} compras${c && c.t > 0 ? ` · ${(c.rev / c.t).toFixed(0)} € de compra media` : ""}`}>
                      {c && c.t >= max * 0.35 ? c.t : ""}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </EvidenceCard>
  );
}
