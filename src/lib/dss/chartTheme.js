/**
 * chartTheme — sistema de estilo ÚNICO para todos los gráficos del dashboard.
 * Alturas, ejes, rejilla, leyenda, tooltip y colores de serie idénticos en cada bloque.
 * No definir estos estilos ad-hoc en las tarjetas: importar de aquí.
 */

// Altura estándar del contenedor de gráfico (Tailwind).
export const CHART_H = "h-56";

// Ejes: mismo tamaño/peso/color en todo el dashboard.
export const AXIS = { tick: { fontSize: 10, fill: "hsl(32,7%,48%)" }, axisLine: false, tickLine: false };

// Rejilla horizontal tenue.
export const GRID = { strokeDasharray: "3 3", stroke: "hsl(36,16%,89%)", vertical: false };

// Leyenda.
export const LEGEND = { iconType: "circle", iconSize: 8, wrapperStyle: { fontSize: 11 } };

// Tooltip.
export const TIP = { labelStyle: { fontSize: 11 } };

// Paleta de series cálida (estilo ventriloc): naranja predominante + categóricos.
// Usar SIEMPRE en este orden para que el color signifique lo mismo en todo el panel.
export const SERIES = [
  "hsl(16,79%,57%)",  // 1 · naranja (predominante)
  "hsl(45,35%,46%)",  // 2 · oliva / oro
  "hsl(186,32%,22%)", // 3 · teal oscuro
  "hsl(4,39%,45%)",   // 4 · granate
  "hsl(37,26%,72%)",  // neutro · tan (p.ej. "no atribuido")
];
export const PRIMARY = SERIES[0];
export const NEUTRAL = SERIES[4];
export const AREA_FILL_OPACITY = 0.14;   // relleno de áreas de una sola serie
export const STACK_FILL_OPACITY = 0.7;   // relleno de áreas apiladas
