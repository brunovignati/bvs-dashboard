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

// Mes más reciente disponible — se actualiza en runtime
const NOW_YEAR  = new Date().getFullYear()
const NOW_MONTH = new Date().getMonth() + 1  // 1-based

export function ComparisonProvider({ children }) {
  // periodB = periodo activo/actual  |  periodA = periodo de referencia
  const [periodA, setPeriodA] = useState({ year: NOW_YEAR - 1, month: NOW_MONTH })
  const [periodB, setPeriodB] = useState({ year: NOW_YEAR,     month: NOW_MONTH })
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
    const b = { year: NOW_YEAR, month: NOW_MONTH }
    if (preset === 'prev_month') {
      const prevMonth = NOW_MONTH === 1 ? 12 : NOW_MONTH - 1
      const prevYear  = NOW_MONTH === 1 ? NOW_YEAR - 1 : NOW_YEAR
      setPeriodA({ year: prevYear, month: prevMonth })
      setPeriodB(b)
    } else if (preset === 'yoy') {
      setPeriodA({ year: NOW_YEAR - 1, month: NOW_MONTH })
      setPeriodB(b)
    }
  }

  // ¿Están comparando o viendo un solo mes?
  const isComparing = periodA.year !== periodB.year || periodA.month !== periodB.month

  const value = useMemo(() => ({
    periodA, setPeriodA,
    periodB, setPeriodB,
    activeMonth: periodB,       // alias semántico: el mes "en foco"
    selectedVars, toggleVar,
    VARIABLES,
    isInPeriodA, isInPeriodB, isInEitherPeriod,
    isComparing,
    applyPreset,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [periodA, periodB, selectedVars])

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  )
}

export const useComparison = () => useContext(ComparisonContext)
