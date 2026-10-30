/**
 * PosRetentionCard (Tiendas · ¿Vuelven?) — ¿Vuelven más los clientes que usaron un código que los que
 * no? Compara la vuelta a tienda (30/60/90 días) de los tickets con código con lo esperado para tickets
 * sin código del mismo mes y la misma frecuencia de compra previa. Origen: PrestaShop POS, desde 11-jun-2026.
 * Vista B: diferencia en puntos mes a mes.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePosRetentionMonthly } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, MUTED, num, fmtPts, ym, ymLabel, retentionZ } from "./posUtils";

const MIN_N = 100;
const sum = (rows, f) => rows.reduce((s, r) => s + num(r[f]), 0);

export default function PosRetentionCard({ delay }) {
  const { data: raw = [] } = usePosRetentionMonthly();
  const { rangeB, inRange, labelRange } = useComparison();

  const con = raw.filter((r) => r.grp === "con_codigo");
  const inPeriod = con.filter((r) => inRange(rangeB, r));
  // El seguimiento necesita 60 días: si el periodo elegido es muy reciente se muestra la ventana completa.
  const enough = sum(inPeriod, "n60") >= MIN_N;
  const used = enough ? inPeriod : con;
  const keys = used.map(ym);
  const winLabel = keys.length
    ? labelRange({ start: { year: Math.floor((Math.min(...keys) - 1) / 12), month: ((Math.min(...keys) - 1) % 12) + 1 }, end: { year: Math.floor((Math.max(...keys) - 1) / 12), month: ((Math.max(...keys) - 1) % 12) + 1 } })
    : "";

  const hz = [30, 60, 90].map((h) => {
    const n = sum(used, `n${h}`), r = sum(used, `r${h}`), e = sum(used, `e${h}`);
    return { h, n, real: n > 0 ? (r / n) * 100 : null, exp: n > 0 ? (e / n) * 100 : null, diff: n > 0 ? ((r - e) / n) * 100 : null, r, e };
  });
  const h60 = hz[1];
  const hasData = h60.n >= MIN_N;
  // z con errores agrupados por cliente (Σ residuo² por cliente de cada mes; el mismo cliente puede repetir mes: ligero optimismo)
  const z = h60.n > 0 ? retentionZ(h60.r, h60.e, h60.n, sum(used, "ss60")) : 0;
  const clear = Math.abs(z) >= 2;
  const ns = sum(used, "ns") || 1;
  const spend = sum(used, "s60") / ns, spendExp = sum(used, "es60") / ns;

  const chart = hz.filter((x) => x.n >= 50).map((x) => ({ name: `${x.h} días`, "Con código": Math.round(x.real * 10) / 10, "Esperado sin código": Math.round(x.exp * 10) / 10, n: x.n }));

  // ── Vista B: diferencia en puntos por mes de compra (todos los meses con seguimiento hasta el corte) ──
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const evo = [...con].filter((r) => ym(r) <= cutoff && num(r.n30) >= 50).sort((a, b) => ym(a) - ym(b)).map((r) => ({
    name: ymLabel(ym(r)),
    "A 30 días": num(r.n30) > 0 ? Math.round(((num(r.r30) - num(r.e30)) / num(r.n30)) * 1000) / 10 : 0,
    "A 60 días": num(r.n60) >= 50 ? Math.round(((num(r.r60) - num(r.e60)) / num(r.n60)) * 1000) / 10 : null,
  }));
  const altView = evo.length >= 1 ? (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={evo} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} />
          <YAxis {...AXIS} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} />
          <ReferenceLine y={0} stroke={MUTED} />
          <Tooltip formatter={(v, n) => [v == null ? "sin seguimiento aún" : fmtPts(v), n]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="A 30 días" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
          <Bar dataKey="A 60 días" fill={COLORS[3]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Vuelven más los clientes que usaron un código?"
      kpis={hasData ? [
        { value: `${h60.real.toFixed(1)}%`, label: "Vuelven en 60 días con código" },
        { value: `${h60.exp.toFixed(1)}%`, label: "Esperado sin código" },
        { value: fmtPts(h60.diff), label: clear ? "Diferencia clara" : "Diferencia (ruido)" },
      ] : undefined}
      answer={!hasData ? "Aún no hay 60 días de seguimiento en este periodo" : undefined}
      context={hasData
        ? `${enough ? labelRange(rangeB) : `Ventana completa ${winLabel} (el periodo elegido aún no tiene seguimiento)`} · ${fmtNumber(h60.n)} tickets con código y cliente identificado. Gasto en los 60 días siguientes: ${spend.toFixed(0)} € con código frente a ${spendExp.toFixed(0)} € esperado. ${clear ? "" : "La diferencia está dentro del ruido: el código, en conjunto, no cambia si el cliente vuelve."}`
        : undefined}
      maturity="amber"
      actions={[
        { verb: "decidir", rationale: hasData && !clear ? "En conjunto el descuento no hace volver más: usarlo para captar o mover stock, no como herramienta de fidelización. Mirar la tarjeta de códigos para ver cuáles sí funcionan." : "Hay efecto claro: mirar la tarjeta de códigos para saber cuáles lo aportan y repetirlos." },
        { verb: "esperar", rationale: "El seguimiento crece cada semana (el registro de promos empieza el 11-jun-2026): releer cuando los meses recientes completen 60 y 90 días." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Con vs sin código", b: "Por mes" }}
      note="Fuente: PrestaShop · pos_retention_monthly. Observacional: por ticket con código (cupón o promo TPV), el cliente 'vuelve' si compra de nuevo en cualquier tienda en 30/60/90 días. Esperado = tasa de los tickets SIN código del mismo mes y misma frecuencia previa (1ª compra, 0, 1-2, 3-5, 6+ tickets en 180 días). Solo clientes identificados (los tickets a caja genérica, ≈44% de los de promo, no se pueden seguir). Excluye empleado y vales de devolución. Ventana desde 11-jun-2026. Diferencia clara = |z| ≥ 2 con errores agrupados por cliente (un cliente con varios tickets cuenta una sola vez)."
    >
      {hasData && (
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis {...AXIS} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v, n) => [`${v}%`, n]} labelStyle={{ fontSize: 10 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Con código" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Esperado sin código" fill={COLORS[1]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
