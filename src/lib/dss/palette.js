/**
 * palette.js — DOS colores y una escala entre ambos.
 *   • Predominante: azul  #2563EB  hsl(16,79%,57%)
 *   • Neutro:       gris   #64748B  hsl(32,10%,45%)
 * Todo lo demás son pasos interpolados entre el neutro y el predominante.
 * No hay ningún otro tono (ni verde, ni rojo, ni ámbar).
 */

// Escala neutro → predominante (5 pasos), para series y multi-serie.
export const SCALE = [
  "hsl(16,79%,57%)",  // 4 · predominante (máx. énfasis)
  "hsl(30,72%,66%)",  // 3
  "hsl(37,42%,74%)",  // 2
  "hsl(40,20%,80%)",  // 1
  "hsl(38,16%,86%)",  // 0 · casi neutro
];

export const PREDOMINANT = "hsl(16,79%,57%)";
export const NEUTRAL     = "hsl(32,9%,52%)";

export const CHART = {
  primary:  "hsl(16,79%,57%)",  // predominante
  positive: "hsl(30,72%,66%)",  // paso 3 de la escala
  warning:  "hsl(37,42%,74%)",  // paso 2
  accent:   "hsl(186,32%,26%)",  // predominante oscuro (énfasis)
  danger:   "hsl(186,32%,26%)",  // sin rojo: énfasis en predominante oscuro
  neutral:  "hsl(34,10%,60%)",  // neutro
  grid:     "hsl(36,16%,89%)",  // neutro claro
  axis:     "hsl(32,7%,48%)",  // neutro medio
};

// Compat: series categóricas usan la escala.
export const SERIES = SCALE;

// Variación ↑/↓ dentro de la escala de dos colores (predominante vs. neutro).
export const DELTA = { up: "hsl(16,79%,57%)", down: "hsl(32,9%,52%)" };
