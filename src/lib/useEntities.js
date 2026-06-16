/**
 * useEntities.js — reemplaza la integración con Base44
 * Ahora usa Supabase directamente con la misma interfaz de hooks
 * que el código original esperaba: { data: [], isLoading, error }
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

async function fetchTable(table, orderBy = 'year,month', limit = 500) {
  const parts = orderBy.split(',').map(p => p.trim())
  let query = supabase.from(table).select('*').limit(limit)

  for (const part of parts) {
    const desc = part.startsWith('-')
    const col  = desc ? part.slice(1) : part
    // Mapeo de nombres camelCase (Base44) → snake_case (Supabase)
    const colMapped = COLUMN_MAP[col] || col
    query = query.order(colMapped, { ascending: !desc })
  }

  const { data, error } = await query
  if (error) throw error

  // Re-mapear columnas de snake_case a camelCase para que el código original funcione sin cambios
  return (data || []).map(mapRow)
}

// Mapeo de nombres Base44 → Supabase
const COLUMN_MAP = {
  emailName:     'email_name',
  emailWorkflow: 'email_workflow',
  avgPurchase:   'avg_purchase',
  emailAttr:     'email_attr',
  pushAttr:      'push_attr',
  webAttr:       'web_attr',
  firstTime:     'first_time',
}

// Mapeo inverso Supabase → Base44 para que los componentes no necesiten cambios
function mapRow(row) {
  if (!row) return row
  const mapped = { ...row }
  // MonthlyMetrics
  if ('avg_purchase'   in row) { mapped.avgPurchase   = row.avg_purchase;   }
  if ('email_attr'     in row) { mapped.emailAttr     = row.email_attr;     }
  if ('push_attr'      in row) { mapped.pushAttr      = row.push_attr;      }
  if ('web_attr'       in row) { mapped.webAttr       = row.web_attr;       }
  // EmailCampaign / CartAbandonment
  if ('email_name'     in row) { mapped.emailName     = row.email_name;     }
  if ('email_workflow' in row) { mapped.emailWorkflow = row.email_workflow; }
  // BuyerCohort
  if ('first_time'     in row) { mapped.firstTime     = row.first_time;     }
  // Subscribers
  if ('conv_rate'      in row) { mapped.convRate      = row.conv_rate;      }
  if ('day_of_week'    in row) { mapped.dayOfWeek     = row.day_of_week;    }
  if ('day_name'       in row) { mapped.dayName       = row.day_name;       }
  return mapped
}

// ── Hooks idénticos a la interfaz original ──────────────────

export function useMonthlyMetrics() {
  return useQuery({
    queryKey: ['monthly_metrics'],
    queryFn:  () => fetchTable('monthly_metrics', '-year,-month'),
    initialData: [],
  })
}

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ['email_campaigns'],
    queryFn:  () => fetchTable('email_campaigns', '-year,-month'),
    initialData: [],
  })
}

export function useCartAbandonment() {
  return useQuery({
    queryKey: ['cart_abandonment'],
    queryFn:  () => fetchTable('cart_abandonment', '-year,-month'),
    initialData: [],
  })
}

export function useBuyerCohorts() {
  return useQuery({
    queryKey: ['buyer_cohorts'],
    queryFn:  () => fetchTable('buyer_cohorts', '-year,-month'),
    initialData: [],
  })
}

export function usePushCampaigns() {
  return useQuery({
    queryKey: ['push_campaigns'],
    queryFn:  () => fetchTable('push_campaigns', '-year,-month'),
    initialData: [],
  })
}

export function useSubscribers() {
  return useQuery({
    queryKey: ['subscribers'],
    queryFn:  () => fetchTable('subscribers', 'year,month'),
    initialData: [],
  })
}

export function usePushSubscribers() {
  return useQuery({
    queryKey: ['push_subscribers'],
    queryFn:  () => fetchTable('push_subscribers', 'year,month'),
    initialData: [],
  })
}

export function useSegments() {
  return useQuery({
    queryKey: ['segments'],
    queryFn:  () => fetchTable('segments', '-contacts'),
    initialData: [],
  })
}

export function useCompradores() {
  return useQuery({
    queryKey: ['compradores'],
    queryFn:  () => fetchTable('compradores', '-year,-month'),
    initialData: [],
  })
}

export function useStickyData() {
  return useQuery({
    queryKey: ['sticky'],
    queryFn:  () => fetchTable('sticky', 'workflow'),
    initialData: [],
  })
}

export function useEnvios() {
  return useQuery({
    queryKey: ['envios'],
    queryFn:  () => fetchTable('envios', 'day_of_week'),
    initialData: [],
  })
}

export function useVentasPush() {
  return useQuery({
    queryKey: ['ventas_push'],
    queryFn:  () => fetchTable('ventas_push', '-year,-month'),
    initialData: [],
  })
}
