/**
 * PosLatasCard (Tiendas · ¿Vuelven?) — Las latas BVS promocionadas en tienda (5+1 y lata de regalo):
 * ¿el cliente volvió a la tienda y volvió a comprar latas? Frente a quien compró latas sin promo.
 * Origen: PrestaShop POS, primer ticket de latas de cada cliente identificado desde 11-jun-2026 con ≥ 60 días
 * de seguimiento (ventana fija, no depende del selector). Vista B: tamaño de la compra.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePosLatas } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, num } from "./posUtils";

const GRP = { "5+1 latas": "5+1 latas BVS", "lata de regalo": "Lata de regalo", "latas sin promo": "Latas sin promo" };
const SEG = { nuevo: "nuevo en latas", "ya compraba": "ya compraba latas" };
const ORDER = ["5+1 latas", "lata de regalo", "latas sin promo"];

export default function PosLatasCard({ delay }) {
  const { data: raw = [] } = usePosLatas();

  const rows = raw
    .filter((r) => GRP[r.grp] && SEG[r.seg])
    .map((r) => {
      const n = num(r.n);
      return {
        grp: r.grp, seg: r.seg, n,
        name: `${GRP[r.grp]} · ${SEG[r.seg]}`,
        vuelve: n > 0 ? (num(r.ret60) / n) * 100 : 0,
        repite: n > 0 ? (num(r.again60) / n) * 100 : 0,
        units: num(r.units_avg), ticket: num(r.ticket_avg),
      };
    })
    .sort((a, b) => ORDER.indexOf(a.grp) - ORDER.indexOf(b.grp) || (a.seg === "nuevo" ? -1 : 1));

  const hasData = rows.length > 0;
  const grpAgg = (g) => {
    const rs = raw.filter((r) => r.grp === g);
    const n = rs.reduce((s, r) => s + num(r.n), 0);
    return { n, vuelve: n > 0 ? (rs.reduce((s, r) => s + num(r.ret60), 0) / n) * 100 : null, repite: n > 0 ? (rs.reduce((s, r) => s + num(r.again60), 0) / n) * 100 : null };
  };
  const promo = grpAgg("5+1 latas"), base = grpAgg("latas sin promo");
  const nuevos51 = raw.find((r) => r.grp === "5+1 latas" && r.seg === "nuevo");
  const nuevosBase = rows.find((r) => r.grp === "latas sin promo" && r.seg === "nuevo");
  const nuevos51Row = rows.find((r) => r.grp === "5+1 latas" && r.seg === "nuevo");
  const regalo51 = nuevos51Row ? rows.find((r) => r.grp === "lata de regalo" && r.seg === "nuevo" && r.n >= 20) : null;
  const r51 = rows.filter((r) => r.grp === "5+1 latas");
  const n51 = r51.reduce((s, r) => s + r.n, 0);
  const u51 = n51 > 0 ? r51.reduce((s, r) => s + r.units * r.n, 0) / n51 : 0;

  const chart = rows.map((r) => ({ name: r.name, "Volvió a tienda": Math.round(r.vuelve * 10) / 10, "Volvió a comprar latas": Math.round(r.repite * 10) / 10, n: r.n }));
  const size = rows.map((r) => ({ name: r.name, "Unidades por ticket": Math.round(r.units * 10) / 10, "Ticket medio €": Math.round(r.ticket) }));
  const altView = hasData ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[["Unidades por ticket", "Unidades por ticket", COLORS[0], ""], ["Ticket medio €", "Ticket medio (€)", COLORS[1], " €"]].map(([key, title, color, suf]) => (
        <div key={key}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
          <div style={{ height: Math.max(220, rows.length * 38 + 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={size} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" {...AXIS} tickFormatter={(v) => `${v}${suf}`} />
                <YAxis type="category" dataKey="name" width={key === "Ticket medio €" ? 30 : 150} {...AXIS} tick={key === "Ticket medio €" ? false : AXIS.tick} />
                <Tooltip formatter={(v) => [`${v}${suf}`, title]} labelStyle={{ fontSize: 10 }} />
                <Bar dataKey={key} fill={color} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Volvieron los clientes que compraron latas BVS en promo?"
      kpis={hasData ? [
        { value: fmtNumber(promo.n), label: "Compradores de 5+1 con seguimiento" },
        { value: promo.vuelve != null ? `${promo.vuelve.toFixed(0)}%` : "—", label: "Volvieron a tienda en 60 días" },
        { value: promo.repite != null ? `${promo.repite.toFixed(0)}%` : "—", label: "Repitieron latas en 60 días" },
      ] : undefined}
      answer={!hasData ? "Sin datos de latas con seguimiento" : undefined}
      context={hasData
        ? `Sin promo: ${base.vuelve != null ? base.vuelve.toFixed(0) : "—"}% volvió y ${base.repite != null ? base.repite.toFixed(0) : "—"}% repitió latas.${nuevos51 && nuevos51Row && nuevosBase ? ` De los ${fmtNumber(num(nuevos51.n))} compradores de 5+1 que eran nuevos en latas, ${nuevos51Row.vuelve.toFixed(0)}% volvió a tienda (${nuevosBase.vuelve.toFixed(0)}% sin promo) y ${nuevos51Row.repite.toFixed(0)}% repitió latas (${nuevosBase.repite.toFixed(0)}% sin promo).` : ""} Ventana fija jun–oct 2026.`
        : undefined}
      maturity="amber"
      actions={[
        { verb: "leer", rationale: u51 > 0 ? `El 5+1 se lleva de golpe unas ${u51.toFixed(0)} latas por ticket: quien ya tiene la despensa llena tarda más en volver. Antes de repetirlo, mirar el ciclo de compra de cada cliente.` : "Mirar cuánto compra de golpe cada promo antes de repetirla." },
        { verb: "probar", rationale: regalo51 ? `Comparar 5+1 con la lata de regalo en clientes nuevos en latas: vuelven ${nuevos51Row.vuelve.toFixed(0)}% con 5+1 y ${regalo51.vuelve.toFixed(0)}% con regalo (${fmtNumber(regalo51.n)} clientes).` : "Comparar 5+1 con la lata de regalo en clientes nuevos en latas cuando haya más muestra." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Vuelta", b: "Tamaño de compra" }}
      note="Fuente: PrestaShop · pos_latas. Latas BVS = productos del fabricante BVS Vet Shop en las categorías de latas (534-539). Se toma el primer ticket de latas de cada cliente identificado desde 11-jun-2026 con al menos 60 días de seguimiento. 5+1 = código '5+1 latas BVS'; regalo = códigos 'Lata … -Regalo' (sin Purina); sin promo = compró latas sin ningún código. 'Volvió' = cualquier compra en tienda en 60 días. 'Nuevo en latas' = sin latas en los 180 días previos. Observacional; excluye caja genérica."
    >
      {hasData && (
        <div style={{ height: Math.max(240, rows.length * 44 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" {...AXIS} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={170} {...AXIS} />
              <Tooltip formatter={(v, n, p) => [`${v}% · ${fmtNumber(p?.payload?.n)} clientes`, n]} labelStyle={{ fontSize: 10 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Volvió a tienda" fill={COLORS[0]} radius={[0, 3, 3, 0]} />
              <Bar dataKey="Volvió a comprar latas" fill={COLORS[3]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
