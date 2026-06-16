import { createContext, useContext, useState } from 'react'

const VARIABLES = [
  { key: 'purchases',    label: 'Compras' },
  { key: 'revenue',      label: 'Revenue (€)' },
  { key: 'avgPurchase',  label: 'Ticket Medio (€)' },
  { key: 'emailAttr',    label: 'Atrib. Email' },
  { key: 'pushAttr',     label: 'Atrib. Push' },
  { key: 'webAttr',      label: 'Atrib. Web' },
]

const ComparisonContext = createContext(null)

export function ComparisonProvider({ children }) {
  const [periodA, setPeriodA] = useState({ year: 2025, month: 3 })
  const [periodB, setPeriodB] = useState({ year: 2026, month: 3 })
  const [selectedVars, setSelectedVars] = useState(['purchases', 'revenue', 'avgPurchase'])

  const toggleVar = (key) => {
    setSelectedVars((prev) =>
      prev.includes(key)
        ? (prev.length > 1 ? prev.filter((v) => v !== key) : prev)
        : [...prev, key]
    )
  }

  return (
    <ComparisonContext.Provider value={{ periodA, setPeriodA, periodB, setPeriodB, selectedVars, toggleVar, VARIABLES }}>
      {children}
    </ComparisonContext.Provider>
  )
}

export const useComparison = () => useContext(ComparisonContext)
