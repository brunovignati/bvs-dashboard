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
  green: { symbol: "●", label: "Responde hoy",   cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  amber: { symbol: "◐", label: "Madura",          cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  red:   { symbol: "○", label: "Falta dato",      cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

// ── Severidad de señales (para la cinta de alertas) ─────────────────
export const SEVERITY = {
  high:   { rank: 3, cls: "border-l-red-500",    dot: "bg-red-500" },
  medium: { rank: 2, cls: "border-l-amber-500",  dot: "bg-amber-500" },
  low:    { rank: 1, cls: "border-l-slate-400",  dot: "bg-slate-400" },
  ok:     { rank: 0, cls: "border-l-emerald-500",dot: "bg-emerald-500" },
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
export function latestMonthRows(arr) {
  if (!arr.length) return [];
  const maxYm = Math.max(...arr.map(r => r.year * 12 + r.month));
  return arr.filter(r => r.year * 12 + r.month === maxYm);
}
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
