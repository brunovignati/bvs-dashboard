/**
 * dssUtils.js — utilidades compartidas del Decision Support System (Fase 1)
 *
 * No accede a datos. Solo configuración del modelo de decisión (modos, verbos,
 * madurez, prioridad) y helpers estadísticos/temporales usados por las tarjetas.
 * Los datos siguen viniendo exclusivamente de los hooks de useEntities.js.
 */
import { LayoutDashboard, Wrench, TrendingUp, Compass, Library } from "lucide-react";

// ── Modos de decisión (el eje organizador del producto) ─────────────
export const MODES = [
  { id: "pulso",     label: "Pulso",     cadence: "Diario · 2 min",   icon: LayoutDashboard,
    question: "¿Algo se rompió hoy?" },
  { id: "operador",  label: "Operador",  cadence: "Semanal · 20 min", icon: Wrench,
    question: "¿Qué detengo, escalo o investigo?" },
  { id: "estratega", label: "Estratega", cadence: "Mensual · 1 h",    icon: TrendingUp,
    question: "¿Reasigno esfuerzo? ¿mix y retención sanos?" },
  { id: "direccion", label: "Dirección", cadence: "Trimestral",       icon: Compass,
    question: "¿Cumplo objetivo? ¿marca? ¿dónde invierto?" },
  { id: "biblioteca",label: "Biblioteca",cadence: "Bajo demanda",     icon: Library,
    question: "Exploración libre de los datos" },
];

// ── Verbos de acción (capa prescriptiva) — clases Tailwind literales ─
export const VERBS = {
  detener:    { label: "Detener",    cls: "bg-red-500/10 text-red-600 border-red-500/20" },
  escalar:    { label: "Escalar",    cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  investigar: { label: "Investigar", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  crear:      { label: "Crear",      cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  mantener:   { label: "Mantener",   cls: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  reasignar:  { label: "Reasignar",  cls: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
};

// ── Puerta del dato / semáforo de madurez ───────────────────────────
export const MATURITY = {
  green: { symbol: "●", label: "Responde hoy",   cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  amber: { symbol: "◐", label: "Madura",          cls: "bg-blue-400/10 text-blue-500 border-blue-400/20" },
  red:   { symbol: "○", label: "Falta dato",      cls: "bg-slate-400/10 text-slate-500 border-slate-400/20" },
};

// ── Severidad de señales (para la cinta de alertas) ─────────────────
export const SEVERITY = {
  high:   { rank: 3, cls: "border-l-blue-700",   dot: "bg-blue-700" },
  medium: { rank: 2, cls: "border-l-blue-400",   dot: "bg-blue-400" },
  low:    { rank: 1, cls: "border-l-slate-400",  dot: "bg-slate-400" },
  ok:     { rank: 0, cls: "border-l-blue-500",   dot: "bg-blue-500" },
};

// ── Helpers temporales ──────────────────────────────────────────────
export function sortByYMD(arr) {
  return [...arr].sort((a, b) =>
    a.year !== b.year ? a.year - b.year :
    a.month !== b.month ? a.month - b.month :
    (a.day || 0) - (b.day || 0));
}
export function sortByYM(arr) {
  return [...arr].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}
export function latestMonthRows(arr, cutoff = Infinity) {
  const rows = (arr || []).filter(r => (r.year * 12 + r.month) <= cutoff);
  if (!rows.length) return [];
  const maxYm = Math.max(...rows.map(r => r.year * 12 + r.month));
  return rows.filter(r => r.year * 12 + r.month === maxYm);
}

// year*12+month de una fila, soportando {year,month} o date_str "YYYY-MM-DD".
export const rowYM = (r) => {
  if (r && r.year && r.month) return r.year * 12 + r.month;
  if (r && r.date_str) { const p = String(r.date_str).split("-"); return (+p[0]) * 12 + (+p[1]); }
  return 0;
};
// Recorta un array temporal al final del período principal del comparador (cutoff = year*12+month).
export const upToCutoff = (arr, cutoff) => (arr || []).filter(r => rowYM(r) <= cutoff);
export function ymLabel(row, monthLabelFn) {
  return `${monthLabelFn(row.month)} ${String(row.year).slice(2)}`;
}

// ── Estadística de banda (media móvil ± desviación) ─────────────────
export function trailingStats(values) {
  const n = values.length;
  if (!n) return { mean: 0, std: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(variance) };
}
export function pctDelta(current, base) {
  if (!base) return null;
  return ((current - base) / base) * 100;
}

// ── Intervalo de confianza de Wilson para una proporción ─────────────
// Para tasas (apertura, conversión) con n pequeño: no se sale de [0,1] y
// es fiable con pocos casos. Devuelve porcentajes {low, mid, high, half}.
export function wilson(successes, n, z = 1.96) {
  if (!n || n <= 0) return { low: 0, mid: 0, high: 0, half: 0 };
  const p = Math.min(1, Math.max(0, successes / n));
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  const low = Math.max(0, center - margin);
  const high = Math.min(1, center + margin);
  return { low: low * 100, mid: p * 100, high: high * 100, half: ((high - low) / 2) * 100 };
}

// ── Prioridad = impacto × urgencia × reversibilidad (0..1 c/u) ──────
export function priorityScore({ impact = 0.5, urgency = 0.5, reversibility = 0.5 }) {
  // reversibilidad alta favorece ejecutar; se pondera positivamente
  return impact * 0.5 + urgency * 0.35 + reversibility * 0.15;
}

// Filtra filas cuyo nombre (workflow/emailName) matchea un patrón (reactivación, etc.)
export function matchName(row, regex) {
  const s = `${row.workflow || ""} ${row.emailName || ""} ${row.emailWorkflow || ""}`.toLowerCase();
  return regex.test(s);
}
