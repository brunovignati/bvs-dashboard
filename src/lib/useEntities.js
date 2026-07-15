import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

// Mapeo snake_case (Supabase) → camelCase (componentes originales de Base44)
function mapRow(row) {
  if (!row) return row
  return {
    ...row,
    avgPurchase:   row.avg_purchase   ?? row.avgPurchase,
    emailAttr:     row.email_attr     ?? row.emailAttr,
    pushAttr:      row.push_attr      ?? row.pushAttr,
    webAttr:       row.web_attr       ?? row.webAttr,
    smsAttr:       row.sms_attr       ?? row.smsAttr,
    emailName:     row.email_name     ?? row.emailName,
    emailWorkflow: row.email_workflow ?? row.emailWorkflow,
    firstTime:     row.first_time     ?? row.firstTime,
    convRate:      row.conv_rate      ?? row.convRate,
    dayOfWeek:     row.day_of_week    ?? row.dayOfWeek,
    dayName:       row.day_name       ?? row.dayName,
    purchasesAttr: row.purchases_attr ?? row.purchasesAttr,
    contentName:   row.content_name   ?? row.contentName,
    openRate:      row.open_rate      ?? row.openRate,
    cohortYear:    row.cohort_year    ?? row.cohortYear,
    cohortMonth:   row.cohort_month   ?? row.cohortMonth,
    lifeMonth:     row.life_month     ?? row.lifeMonth,
    cohortSize:    row.cohort_size    ?? row.cohortSize,
  }
}

async function fetchTable(table, column = 'year', ascending = false, limit = 2000) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(column, { ascending })
    .limit(limit)
  if (error) throw error
  return (data || []).map(mapRow)
}

// Supabase limita cada respuesta a 1000 filas. Para tablas grandes (email_campaigns,
// daily_email, daily_push) hay que paginar con .range() hasta reunir todas las filas
// necesarias; si no, un simple .limit() ordenado por año devuelve solo las más antiguas
// y las secciones que filtran por período reciente aparecen vacías.
// orderCols: array de [columna, ascending] para un orden estable (evita duplicar/saltar
// filas entre páginas). Usa una clave única o casi-única (id, o year+month+day+nombre).
async function fetchPaged(table, orderCols, limit = 20000) {
  const PAGE = 1000
  const all = []
  for (let from = 0; from < limit; from += PAGE) {
    const to = Math.min(from + PAGE, limit) - 1
    let q = supabase.from(table).select('*')
    for (const [col, asc] of orderCols) q = q.order(col, { ascending: asc })
    const { data, error } = await q.range(from, to)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all.map(mapRow)
}

export function useMonthlyMetrics() {
  return useQuery({
    queryKey: ['monthly_metrics'],
    queryFn: () => fetchTable('monthly_metrics', 'year', true),
    initialData: [],
  })
}

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ['email_campaigns'],
    // 25k+ filas: paginar por id (clave única) para traer todo el histórico.
    queryFn: () => fetchPaged('email_campaigns', [['id', true]], 60000),
    initialData: [],
  })
}

export function useCartAbandonment() {
  return useQuery({
    queryKey: ['cart_abandonment'],
    queryFn: () => fetchTable('cart_abandonment', 'year', true),
    initialData: [],
  })
}

export function useBuyerCohorts() {
  return useQuery({
    queryKey: ['buyer_cohorts'],
    queryFn: () => fetchTable('buyer_cohorts', 'year', true),
    initialData: [],
  })
}

export function useCohortRetention() {
  return useQuery({
    queryKey: ['cohort_retention'],
    queryFn: () => fetchTable('cohort_retention', 'cohort_year', true),
    initialData: [],
  })
}

export function usePushCampaigns() {
  return useQuery({
    queryKey: ['push_campaigns'],
    queryFn: () => fetchTable('push_campaigns', 'year', true),
    initialData: [],
  })
}

export function useSubscribers() {
  return useQuery({
    queryKey: ['subscribers'],
    queryFn: () => fetchTable('subscribers', 'year', true),
    initialData: [],
  })
}

export function usePushSubscribers() {
  return useQuery({
    queryKey: ['push_subscribers'],
    queryFn: () => fetchTable('push_subscribers', 'year', true),
    initialData: [],
  })
}

export function useSegments() {
  return useQuery({
    queryKey: ['segments'],
    queryFn: () => fetchTable('segments', 'contacts', false),
    initialData: [],
  })
}

export function useCompradores() {
  return useQuery({
    queryKey: ['compradores'],
    queryFn: () => fetchTable('compradores', 'year', true),
    initialData: [],
  })
}

export function useStickyData() {
  return useQuery({
    queryKey: ['sticky'],
    queryFn: () => fetchTable('sticky', 'revenue', false),
    initialData: [],
  })
}

export function useEnvios() {
  return useQuery({
    queryKey: ['envios'],
    queryFn: () => fetchTable('envios', 'day_of_week', true),
    initialData: [],
  })
}

export function useVentasPush() {
  return useQuery({
    queryKey: ['ventas_push'],
    queryFn: () => fetchTable('ventas_push', 'year', true),
    initialData: [],
  })
}

export function useRendimientoPush() {
  return useQuery({
    queryKey: ['rendimiento_push'],
    queryFn: () => fetchTable('rendimiento_push', 'year', true),
    initialData: [],
  })
}

export function useCarrito() {
  return useQuery({
    queryKey: ['carrito'],
    queryFn: () => fetchTable('carrito', 'year', true),
    initialData: [],
  })
}

export function useDailyRevenue() {
  return useQuery({
    queryKey: ['daily_revenue'],
    // Una fila por día: paginar por fecha para no toparse con el tope de 1000 al crecer.
    queryFn: () => fetchPaged('daily_revenue', [['year', true], ['month', true], ['day', true]], 8000),
    initialData: [],
  })
}

export function useDailyEmail() {
  return useQuery({
    queryKey: ['daily_email'],
    // 150k+ filas: traer las MÁS RECIENTES (orden descendente) para las tendencias diarias.
    queryFn: () => fetchPaged('daily_email', [['year', false], ['month', false], ['day', false], ['email_name', true]], 20000),
    initialData: [],
  })
}

export function useDailyPush() {
  return useQuery({
    queryKey: ['daily_push'],
    // 7k+ filas: paginar por fecha (descendente) para incluir los días recientes.
    queryFn: () => fetchPaged('daily_push', [['year', false], ['month', false], ['day', false], ['workflow', true]], 12000),
    initialData: [],
  })
}

export function useDailySticky() {
  return useQuery({
    queryKey: ['daily_sticky'],
    // 20k+ filas: paginar por fecha DESC para incluir los días recientes en las tendencias.
    queryFn: () => fetchPaged('daily_sticky', [['year', false], ['month', false], ['day', false], ['content_name', true]], 24000),
    initialData: [],
  })
}

// ── Vistas de agregación (perf): ~745 filas por día en una sola petición, en vez de
// paginar decenas de miles. Ver sql/create_agg_views.sql.
export function useEmailDiario() {
  return useQuery({
    queryKey: ['v_daily_email_diario'],
    queryFn: () => fetchTable('v_daily_email_diario', 'year', true, 3000),
    initialData: [],
  })
}

export function usePushDiario() {
  return useQuery({
    queryKey: ['v_daily_push_diario'],
    queryFn: () => fetchTable('v_daily_push_diario', 'year', true, 3000),
    initialData: [],
  })
}

export function useStickyDiario() {
  return useQuery({
    queryKey: ['v_daily_sticky_diario'],
    queryFn: () => fetchTable('v_daily_sticky_diario', 'year', true, 3000),
    initialData: [],
  })
}

export function useChannelSegmentation() {
  return useQuery({
    queryKey: ['channel_segmentation'],
    queryFn: () => fetchTable('channel_segmentation', 'year', true),
    initialData: [],
  })
}

export function usePrestashopMonthly() {
  // Pedidos y revenue reales por mes desde PrestaShop (source of truth), separados por
  // canal (web / Amazon / TPV). Origen: Gestor SQL "Embudo mensual BVS" → Supabase.
  return useQuery({
    queryKey: ['prestashop_monthly'],
    queryFn: () => fetchTable('prestashop_monthly', 'year', true, 5000),
    initialData: [],
  })
}

export function useBrandSales() {
  // brand_sales supera las 1000 filas (Supabase corta cada respuesta a 1000). Con un
  // fetchTable simple solo llegaban los meses más antiguos (2024) y los recientes faltaban
  // → hay que paginar con fetchPaged, igual que email_campaigns/daily_*.
  return useQuery({
    queryKey: ['brand_sales'],
    queryFn: () => fetchPaged('brand_sales', [['year', true], ['month', true], ['brand', true]], 20000),
    initialData: [],
  })
}


// ─── Social Media (Metricool) ──────────────────────────────

export function useIgDaily() {
  return useQuery({
    queryKey: ['ig_daily'],
    queryFn: () => fetchTable('ig_daily', 'date_str', true, 5000),
    initialData: [],
  })
}

export function useIgReels() {
  return useQuery({
    queryKey: ['ig_reels'],
    queryFn: () => fetchTable('ig_reels', 'date_str', false, 500),
    initialData: [],
  })
}

export function useFbDaily() {
  return useQuery({
    queryKey: ['fb_daily'],
    queryFn: () => fetchTable('fb_daily', 'date_str', true, 5000),
    initialData: [],
  })
}

export function useTkDaily() {
  return useQuery({
    queryKey: ['tk_daily'],
    queryFn: () => fetchTable('tk_daily', 'date_str', true, 5000),
    initialData: [],
  })
}

// ─── GA4 (tráfico web) ────────────────────────────────────

export function useGa4Daily() {
  return useQuery({
    queryKey: ['ga4_daily'],
    queryFn: () => fetchTable('ga4_daily', 'date_str', true, 5000),
    initialData: [],
  })
}

export function useGa4ChannelDaily() {
  return useQuery({
    queryKey: ['ga4_channel_daily'],
    queryFn: () => fetchTable('ga4_channel_daily', 'date_str', true, 20000),
    initialData: [],
  })
}

export function useGa4DeviceDaily() {
  return useQuery({
    queryKey: ['ga4_device_daily'],
    queryFn: () => fetchTable('ga4_device_daily', 'date_str', true, 20000),
    initialData: [],
  })
}

// ─── Contenido por pieza (Metricool: Facebook posts / TikTok vídeos) ──

export function useFbPosts() {
  return useQuery({
    queryKey: ['fb_posts'],
    queryFn: () => fetchTable('fb_posts', 'date_str', false, 500),
    initialData: [],
  })
}

export function useTkVideos() {
  return useQuery({
    queryKey: ['tk_videos'],
    queryFn: () => fetchTable('tk_videos', 'date_str', false, 500),
    initialData: [],
  })
}
