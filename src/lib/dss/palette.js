/**
 * palette.js — DOS colores y una escala entre ambos.
 *   • Predominante: azul  #2563EB  hsl(221,83%,53%)
 *   • Neutro:       gris   #64748B  hsl(215,16%,47%)
 * Todo lo demás son pasos interpolados entre el neutro y el predominante.
 * No hay ningún otro tono (ni verde, ni rojo, ni ámbar).
 */

// Escala neutro → predominante (5 pasos), para series y multi-serie.
export const SCALE = [
  "hsl(221,83%,53%)",  // 4 · predominante (máx. énfasis)
  "hsl(220,55%,62%)",  // 3
  "hsl(218,33%,70%)",  // 2
  "hsl(216,20%,78%)",  // 1
  "hsl(220,13%,85%)",  // 0 · casi neutro
];

export const PREDOMINANT = "hsl(221,83%,53%)";
export const NEUTRAL     = "hsl(215,16%,55%)";

export const CHART = {
  primary:  "hsl(221,83%,53%)",  // predominante
  positive: "hsl(220,55%,62%)",  // paso 3 de la escala
  warning:  "hsl(218,33%,70%)",  // paso 2
  accent:   "hsl(224,76%,42%)",  // predominante oscuro (énfasis)
  danger:   "hsl(224,76%,42%)",  // sin rojo: énfasis en predominante oscuro
  neutral:  "hsl(215,16%,62%)",  // neutro
  grid:     "hsl(220,13%,91%)",  // neutro claro
  axis:     "hsl(220,10%,50%)",  // neutro medio
};

// Compat: series categóricas usan la escala.
export const SERIES = SCALE;

// Variación ↑/↓ dentro de la escala de dos colores (predominante vs. neutro).
export const DELTA = { up: "hsl(221,83%,53%)", down: "hsl(215,16%,55%)" };
