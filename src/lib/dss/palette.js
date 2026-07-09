/**
 * palette.js — paleta única del dashboard, estilo Meta Ads / Apollo.
 * UN solo color de acento (azul) con tintes del mismo tono para series apiladas.
 * Verde y rojo se reservan EXCLUSIVAMENTE a variaciones ↑/↓ (deltas).
 * Todo lo demás es gris neutro. Sin más hues.
 */
export const CHART = {
  primary:  "hsl(221,83%,53%)",  // azul acento (#2563EB)
  positive: "hsl(214,95%,68%)",  // azul claro — 2ª serie (NO es verde: es tinte del acento)
  warning:  "hsl(213,96%,80%)",  // azul más claro — 3ª serie
  accent:   "hsl(226,71%,40%)",  // azul oscuro — 4ª serie / énfasis
  danger:   "hsl(0,72%,51%)",    // rojo — solo variaciones negativas
  neutral:  "hsl(220,9%,60%)",   // gris — series secundarias sin peso
  grid:     "hsl(220,13%,91%)",
  axis:     "hsl(220,10%,50%)",
};

// Rampa monocromática (un solo hue) para series categóricas.
export const SERIES = [CHART.primary, CHART.positive, CHART.warning, CHART.accent, CHART.neutral];

// Semánticos de variación (idéntico criterio que Meta: verde sube, rojo baja).
export const DELTA = { up: "hsl(142,71%,45%)", down: "hsl(0,72%,51%)" };
