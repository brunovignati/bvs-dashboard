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
// Igual, pero con la palabra entera para las frases (los KPI usan «pts» para que quepan).
export const fmtPuntos = (p) => (p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(1)} puntos`);
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

// ── Margen de producto ───────────────────────────────────────────────────────────────────────────
// Las líneas del TPV ya van netas de cupón y promo, así que NO se resta ningún descuento más.
// Margen % = (venta sin IVA − coste de compra de catálogo) / venta sin IVA, solo sobre líneas con coste conocido (≈98%).
export const marginPct = (rk, cost) => (num(rk) > 0 ? ((num(rk) - num(cost)) / num(rk)) * 100 : null);
// Margen en € estimado sobre TODA la venta de líneas (se extrapola el % a las líneas sin coste).
export const marginEur = (rl, rk, cost) => (num(rk) > 0 ? ((num(rk) - num(cost)) / num(rk)) * num(rl) : 0);
export const coverPct = (rl, rk) => (num(rl) > 0 ? (num(rk) / num(rl)) * 100 : 0);
export const fmtPct1 = (p) => (p == null ? "—" : `${p.toFixed(1)}%`);

// ── Estadística ──────────────────────────────────────────────────────────────────────────────────
// CDF de la normal estándar (Abramowitz–Stegun 26.2.17).
export function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
export const pTwoSided = (z) => 2 * (1 - normCdf(Math.abs(z)));

// Corrección de Holm entre varias pruebas a la vez: devuelve true/false (significativa) alineado con pvals.
export function holmSig(pvals, alpha = 0.05) {
  const order = pvals.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(pvals.length).fill(false);
  const m = pvals.length;
  for (let k = 0; k < m; k++) {
    if (order[k][0] <= alpha / (m - k)) out[order[k][1]] = true;
    else break;
  }
  return out;
}

// z de "vuelven más de lo esperado". Con ss (Σ residuo² por cliente, errores agrupados por cliente) la varianza
// cuenta que un mismo cliente aparece en varios tickets; sin ss (filas antiguas) cae a la binomial.
export function retentionZ(real, exp, n, ss) {
  const s = num(ss);
  if (s > 0) return (real - exp) / Math.sqrt(s);
  const p = n > 0 ? exp / n : 0;
  return (real - exp) / (Math.sqrt(n * p * (1 - p)) || 1);
}

// ── Trimestres y días ────────────────────────────────────────────────────────────────────────────
export const qKey = (r) => num(r.year) * 4 + num(r.quarter) - 1;
export const qLabel = (k) => `T${(k % 4) + 1} ${String(Math.floor(k / 4)).slice(2)}`;
// Trimestre en palabras para las frases: «3.er trimestre 2026».
export const qLong = (k) => `${(k % 4) + 1}.${(k % 4) === 2 ? "er" : "º"} trimestre ${Math.floor(k / 4)}`;
export const DOW = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DOW_FULL = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

// Trimestre natural de una fecha (año*4 + 0..3) y trimestre elegido a partir del periodo activo del Comparador.
export const qOfYM = (year, month) => num(year) * 4 + Math.floor((num(month) - 1) / 3);
export function currentQ(meta) {
  const v = (meta || []).find((m) => m.key === "pos")?.value;
  const d = v?.today ? new Date(v.today) : new Date();
  return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
}
// Último trimestre con dato que no pase del fin del periodo activo.
export function pickQ(keys, rangeB) {
  const target = qOfYM(rangeB.end.year, rangeB.end.month);
  return [...keys].filter((k) => k <= target).sort((a, b) => b - a)[0] ?? null;
}
