import { createContext, useContext, useState, useMemo } from 'react'

export const VARIABLES = [
  { key: 'purchases',   label: 'Compras' },
  { key: 'revenue',     label: 'Revenue (€)' },
  { key: 'avgPurchase', label: 'Ticket Medio (€)' },
  { key: 'emailAttr',   label: 'Atrib. Email' },
  { key: 'pushAttr',    label: 'Atrib. Push' },
  { key: 'webAttr',     label: 'Atrib. Web' },
]

const ComparisonContext = createContext(null)

// Período activo por defecto = ÚLTIMO MES CERRADO (no el mes en curso, que está
// incompleto y produciría deltas falsos al compararlo con meses completos).
const _now = new Date()
let LAST_CLOSED_YEAR  = _now.getFullYear()
let LAST_CLOSED_MONTH = _now.getMonth() + 1 - 1  // mes anterior al actual (1-based)
if (LAST_CLOSED_MONTH === 0) { LAST_CLOSED_MONTH = 12; LAST_CLOSED_YEAR -= 1 }

export function ComparisonProvider({ children }) {
  // periodB = periodo activo (último mes cerrado)  |  periodA = referencia (YoY)
  const [periodA, setPeriodA] = useState({ year: LAST_CLOSED_YEAR - 1, month: LAST_CLOSED_MONTH })
  const [periodB, setPeriodB] = useState({ year: LAST_CLOSED_YEAR,     month: LAST_CLOSED_MONTH })
  const [selectedVars, setSelectedVars] = useState(['purchases', 'revenue', 'avgPurchase', 'emailAttr', 'pushAttr', 'webAttr'])

  const toggleVar = (key) =>
    setSelectedVars((prev) =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter((v) => v !== key) : prev
        : [...prev, key]
    )

  // Helpers que los componentes usan para filtrar datos
  const isInPeriodA = (year, month) => year === periodA.year && month === periodA.month
  const isInPeriodB = (year, month) => year === periodB.year && month === periodB.month
  const isInEitherPeriod = (year, month) => isInPeriodA(year, month) || isInPeriodB(year, month)

  // Presets rápidos
  const applyPreset = (preset) => {
    // Base = último mes cerrado (coherente con el período por defecto).
    const b = { year: LAST_CLOSED_YEAR, month: LAST_CLOSED_MONTH }
    if (preset === 'prev_month') {
      const prevMonth = LAST_CLOSED_MONTH === 1 ? 12 : LAST_CLOSED_MONTH - 1
      const prevYear  = LAST_CLOSED_MONTH === 1 ? LAST_CLOSED_YEAR - 1 : LAST_CLOSED_YEAR
      setPeriodA({ year: prevYear, month: prevMonth })
      setPeriodB(b)
    } else if (preset === 'yoy') {
      setPeriodA({ year: LAST_CLOSED_YEAR - 1, month: LAST_CLOSED_MONTH })
      setPeriodB(b)
    }
  }

  // ·Están comparando o viendo un solo mes?
  const isComparing = periodA.year !== periodB.year || periodA.month !== periodB.month

  const value = useMemo(() => {
    const ymA = periodA.year * 12 + periodA.month
    const ymB = periodB.year * 12 + periodB.month
    // ── Rango global (Single Source of Truth) ──────────────────
    const startYM     = Math.min(ymA, ymB)
    const endYM       = Math.max(ymA, ymB)
    const periodStart = ymA <= ymB ? periodA : periodB   // extremo cronológicamente anterior
    const periodEnd   = ymA <= ymB ? periodB : periodA   // extremo cronológicamente posterior

    // Filtra cualquier array con {year, month, …} al rango global.
    // Todos los componentes usan esta función — nunca calculan su propio rango.
    const filterByPeriod = (arr) =>
      (arr || []).filter(r => {
        const ym = (r.year || 0) * 12 + (r.month || 0)
        return ym >= startYM && ym <= endYM
      })

    return {
      periodA, setPeriodA,
      periodB, setPeriodB,
      activeMonth: periodB,       // alias semántico: el mes "en foco"
      selectedVars, toggleVar,
      VARIABLES,
      isInPeriodA, isInPeriodB, isInEitherPeriod,
      isComparing,
      applyPreset,
      // ── Período global ──────────────────────────────────────
      startYM,
      endYM,
      periodStart,
      periodEnd,
      filterByPeriod,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodA, periodB, selectedVars])

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  )
}

export const useComparison = () => useContext(ComparisonContext)
