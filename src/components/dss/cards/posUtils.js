/**
 * posUtils — utilidades compartidas por las tarjetas de Tiendas (TPV / Presta POS).
 * Sin datos: solo formato, paleta y agregaciones pequeñas.
 */
export const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const COLORS = [
  "hsl(16,79%,57%)", "hsl(30,72%,66%)", "hsl(45,35%,46%)", "hsl(186,32%,42%)", "hsl(4,39%,55%)",
  "hsl(152,45%,38%)", "hsl(260,30%,55%)", "hsl(210,40%,50%)", "hsl(32,7%,48%)",
];
export const GRID = "hsl(36,16%,89%)";
export const AXIS = { tick: { fontSize: 9, fill: "hsl(32,7%,48%)" }, axisLine: false, tickLine: false };
export const GOOD = "hsl(152,45%,32%)";
export const BAD = "hsl(4,60%,45%)";
export const MUTED = "hsl(32,7%,48%)";

export const num = (v) => Number(v) || 0;
export const pctChange = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
export const fmtG = (g) => (g == null ? "—" : `${g >= 0 ? "+" : ""}${g.toFixed(0)}%`);
export const gColor = (g) => (g == null ? MUTED : g >= 0 ? GOOD : BAD);
export const fmtPts = (p) => (p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(1)} pts`);
export const eur = (v, d = 0) => `${num(v).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })} €`;

// Mes como entero (año*12 + mes) y su etiqueta corta ("Sep 26").
export const ym = (r) => num(r.year) * 12 + num(r.month);
export const ymLabel = (k) => `${M[((k - 1) % 12) + 1]} ${String(Math.floor((k - 1) / 12)).slice(2)}`;

// Etiqueta del periodo de comparación según el modo del Comparador.
export const cmpWord = (compMode) => (compMode === "yoy" ? "mismo mes del año anterior" : "periodo de comparación");

// Los vales de devolución y el descuento de empleado no son promociones: se excluyen de los rankings de códigos.
export const isNotPromo = (code) => /^vale|devoluci|empleado/i.test(code || "");

// Suma de campos de las filas que caen en un rango, agrupadas por clave.
export function sumByKey(rows, inRangeFn, range, keyFn, fields) {
  const out = {};
  for (const r of rows) {
    if (!inRangeFn(range, r)) continue;
    const k = keyFn(r);
    const a = (out[k] ||= Object.fromEntries(fields.map((f) => [f, 0])));
    for (const f of fields) a[f] += num(r[f]);
  }
  return out;
}

// Últimos 12 meses (o los que haya) hasta el corte del periodo activo → eje X de las vistas de evolución.
export function lastMonths(rows, cutoff, n = 12) {
  const set = new Set();
  for (const r of rows) { const k = ym(r); if (k <= cutoff) set.add(k); }
  return [...set].sort((a, b) => a - b).slice(-n);
}
