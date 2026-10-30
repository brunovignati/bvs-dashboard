/**
 * PosCodeSuccessCard (Tiendas · Códigos) — Qué códigos funcionan mejor: ¿el cliente que lo usó vuelve
 * más de lo que habría vuelto sin código? Se compara con clientes iguales (mismo mes y misma frecuencia
 * de compra previa) que NO usaron código. Origen: PrestaShop POS, ventana fija desde 11-jun-2026
 * (no depende del selector: el seguimiento necesita 60 días). Vista B: gasto en los 60 días siguientes.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePosCodeRetention } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, GOOD, BAD, MUTED, num, fmtPts, isNotPromo } from "./posUtils";

const MIN_N = 100;
const cut = (s, n = 24) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function PosCodeSuccessCard({ delay }) {
  const { data: raw = [] } = usePosCodeRetention();

  const rows = raw
    .filter((r) => !isNotPromo(r.code) && num(r.n60) >= MIN_N)
    .map((r) => {
      const n = num(r.n60), real = num(r.r60), exp = num(r.e60);
      const p = n > 0 ? exp / n : 0;
      const se = Math.sqrt(n * p * (1 - p)) || 1;
      const z = (real - exp) / se;
      const ns = num(r.ns) || 1;
      return {
        code: r.code, name: cut(r.code), n, tickets: num(r.tickets), customers: num(r.customers),
        real: (real / n) * 100, exp: (exp / n) * 100, diff: ((real - exp) / n) * 100, z,
        sig: Math.abs(z) >= 2,
        spend: num(r.s60) / ns, spendExp: num(r.es60) / ns,
      };
    })
    .sort((a, b) => b.diff - a.diff);

  const hasData = rows.length > 0;
  const winners = rows.filter((r) => r.sig && r.diff > 0);
  const losers = rows.filter((r) => r.sig && r.diff < 0);
  const best = winners[0], worst = losers[losers.length - 1]; // solo diferencias claras (|z| ≥ 2)
  const barColor = (r) => (!r.sig ? MUTED : r.diff > 0 ? GOOD : BAD);

  const bySpend = [...rows].sort((a, b) => b.tickets - a.tickets).slice(0, 8).map((r) => ({ name: r.name, code: r.code, "Con código": Math.round(r.spend), "Esperado sin código": Math.round(r.spendExp) }));
  const altView = bySpend.length ? (
    <div style={{ height: Math.max(220, bySpend.length * 34 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bySpend} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
          <XAxis type="number" {...AXIS} tickFormatter={(v) => `${v} €`} />
          <YAxis type="category" dataKey="name" width={150} {...AXIS} />
          <Tooltip formatter={(v, n) => [`${v} €`, n]} labelFormatter={(l, p) => p?.[0]?.payload?.code || l} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Con código" fill={COLORS[0]} radius={[0, 3, 3, 0]} />
          <Bar dataKey="Esperado sin código" fill={COLORS[1]} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
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
        ? `Diferencia en puntos entre el % que vuelve en 60 días con el código y el % esperado sin él. ${best ? `Mejor: ${best.code} (${fmtPts(best.diff)}).` : "Ninguno sube la vuelta de forma clara."} ${worst ? `Peor: ${worst.code} (${fmtPts(worst.diff)}).` : ""} Gris = diferencia dentro del ruido. Solo clientes identificados; ventana fija jun–oct 2026.`
        : undefined}
      maturity="amber"
      actions={[
        { verb: "mantener", rationale: winners.length ? `Los códigos en verde (${winners.slice(0, 3).map((w) => w.code).join(", ")}) traen al cliente de vuelta más que lo normal: son los candidatos a repetir.` : "Ningún código sube la vuelta de forma clara: el descuento, por sí solo, no está fidelizando." },
        { verb: "revisar", rationale: losers.length ? `Los códigos en rojo (${losers.slice(0, 3).map((w) => w.code).join(", ")}) adelantan compras: el cliente compró con descuento y vuelve menos. Sustituir por regalo o venta cruzada.` : "Vigila los códigos que adelantan compras sin aumentar la vuelta." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Vuelta a 60 días", b: "Gasto en 60 días" }}
      note="Fuente: PrestaShop · pos_code_retention. Método observacional: por ticket con código, se mira si el cliente vuelve a cualquier tienda en 60 días y se compara con lo esperado para tickets SIN código del mismo mes y la misma frecuencia de compra previa (1ª compra, 0, 1-2, 3-5, 6+ tickets en 180 días). Gris = |z| < 2. Excluye clientes de caja genérica (≈44% de los tickets con promo, no rastreables), vales de devolución y empleado. Ventana desde 11-jun-2026 (inicio del registro de promos POS). No es un experimento: orienta, no prueba causalidad."
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
                formatter={(v, n, p) => [`${p?.payload?.real.toFixed(1)}% vuelve · esperado ${p?.payload?.exp.toFixed(1)}% · ${fmtNumber(p?.payload?.n)} tickets medidos`, `${fmtPts(v)}${p?.payload?.sig ? "" : " (ruido)"}`]}
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
