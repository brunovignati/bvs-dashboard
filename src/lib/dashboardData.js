/**
 * dashboardData.js
 *
 * IMPORTANTE: Este archivo ya NO contiene datos hardcodeados.
 * Los datos reales vienen de Supabase via los hooks de useEntities.js.
 *
 * Lo que sí contiene:
 * - Funciones de formato compartidas (igual que el original)
 * - Arrays vacíos como fallback para componentes que aún no migraron
 * - La lógica de helpers estadísticos
 */

// ── Helpers de formato (idénticos al original) ──────────────

export const fmtCurrency = (val) => {
  if (val === undefined || val === null) return '—'
  if (val >= 1000000) return `€${(val / 1000000).toFixed(1)}M`
  if (val >= 1000)    return `€${(val / 1000).toFixed(1)}K`
  return `€${Number(val).toFixed(2)}`
}

export const fmtNumber = (val) => {
  if (val === undefined || val === null) return '—'
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
  if (val >= 1000)    return `${(val / 1000).toFixed(1)}K`
  return Number(val).toLocaleString('es-ES')
}

export const fmtPct = (val) => {
  if (val === undefined || val === null) return '—'
  return `${Number(val).toFixed(2)}%`
}

export const monthLabel = (m) => {
  const months = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return months[m] || String(m)
}

export const monthLabelFull = (m) => {
  const months = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return months[m] || String(m)
}

// ── Normal CDF — aproximación Abramowitz & Stegun (usado en Bayesian A/B) ─
export function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf  = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf  = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

// ── Pearson correlation (usado en CorrelationMatrix) ────────

export function pearsonCorrelation(x, y) {
  const n = x.length
  if (n === 0) return 0
  const sumX  = x.reduce((a, b) => a + b, 0)
  const sumY  = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0)
  const sumX2 = x.reduce((a, b) => a + b * b, 0)
  const sumY2 = y.reduce((a, b) => a + b * b, 0)
  const num   = n * sumXY - sumX * sumY
  const den   = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  return den === 0 ? 0 : num / den
}

// ── Arrays vacíos como fallback (los datos reales vienen de Supabase) ──

/**
 * NOTA PARA DESARROLLADORES:
 * Los componentes que importaban datos directamente de este archivo
 * (AuditComparison, CorrelationMatrix, AttributionAnalysis, etc.)
 * han sido actualizados para usar los hooks de useEntities.js.
 *
 * Si ves algún componente que todavía importa datos de aquí,
 * significa que aún necesita ser migrado al hook correspondiente.
 */

export const nutraceuticosMonthly  = []  // → useMonthlyMetrics()
export const emailMetrics          = []  // → useEmailCampaigns()
export const auditNewsletters      = []  // → useEmailCampaigns()
export const buyerCohorts          = []  // → useBuyerCohorts()
export const bvsBrandMonthly       = []  // → useCompradores()
export const cartRecoveryTotals    = []  // → useCartAbandonment()
export const subscriberEvolution   = []  // → useSubscribers()
export const pushSubscribers       = []  // → usePushSubscribers()
export const pushSales             = []  // → useVentasPush()
export const pushCampaigns         = []  // → usePushCampaigns()
export const stickyData            = []  // → useStickyData()
export const sendsByDay            = []  // → useEnvios()
export const topSegments           = []  // → useSegments()
