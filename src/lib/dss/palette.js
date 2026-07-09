/**
 * palette.js — paleta única de gráficos del dashboard DSS.
 * Fuente de verdad de color para todas las tarjetas de evidencia.
 * Alineada con los componentes existentes (azul primario, verde positivo,
 * ámbar atención, púrpura acento). Usa siempre estos tokens, nunca hex sueltos.
 */
export const CHART = {
  primary:  "hsl(217,91%,60%)",  // azul — serie principal / revenue
  positive: "hsl(160,84%,39%)",  // verde — positivo / conversión / ganador
  warning:  "hsl(35,92%,56%)",   // ámbar — atención / tráfico
  accent:   "hsl(262,83%,60%)",  // púrpura — acento / push / social
  danger:   "hsl(0,84%,60%)",    // rojo — riesgo / caída
  neutral:  "hsl(220,13%,65%)",  // gris — secundario / no atribuido
  grid:     "hsl(220,13%,91%)",  // rejilla
  axis:     "hsl(220,10%,50%)",  // texto de ejes
};

// Orden estable para series categóricas (multi-línea / multi-barra)
export const SERIES = [CHART.primary, CHART.positive, CHART.warning, CHART.accent, CHART.danger, CHART.neutral];
