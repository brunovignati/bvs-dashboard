import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

// Mapeo snake_case (Supabase) â camelCase (componentes originales de Base44)
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
    queryFn: () => fetchTable('email_campaigns', 'year', true),
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

export function useDailyRevenue() {
  return useQuery({
    queryKey: ['daily_revenue'],
    queryFn: () => fetchTable('daily_revenue', 'year', true, 5000),
    initialData: [],
  })
}

export function useDailyEmail() {
  return useQuery({
    queryKey: ['daily_email'],
    queryFn: () => fetchTable('daily_email', 'year', true, 10000),
    initialData: [],
  })
}

export function useDailyPush() {
  return useQuery({
    queryKey: ['daily_push'],
    queryFn: () => fetchTable('daily_push', 'year', true, 5000),
    initialData: [],
  })
}

export function useDailySticky() {
  return useQuery({
    queryKey: ['daily_sticky'],
    queryFn: () => fetchTable('daily_sticky', 'year', true, 10000),
    initialData: [],
  })
}
