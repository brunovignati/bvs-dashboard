import { createContext, useContext, useState, useMemo } from 'react'
import { monthLabel } from './dashboardData'

export const VARIABLES = [
  { key: 'purchases',   label: 'Compras' },
  { key: 'revenue',     label: 'Revenue (€)' },
  { key: 'avgPurchase', label: 'Ticket Medio (€)' },
  { key: 'emailAttr',   label: 'Atrib. Email' },
  { key: 'pushAttr',    label: 'Atrib. Push' },
  { key: 'webAttr',     label: 'Atrib. Web' },
]

const ComparisonContext = createContext(null)

// ── Utilidades de mes (year*12 + month) ────────────────────────────
const ymOf   = (p) => p.year * 12 + p.month
const fromYM = (n) => ({ year: Math.floor((n - 1) / 12), month: ((n - 1) % 12) + 1 })
const addMonths = (p, k) => fromYM(ymOf(p) + k)
const rangeLen  = (r) => ymOf(r.end) - ymOf(r.start) + 1

// Mes en curso y último mes cerrado (el mes en curso está incompleto).
const _now = new Date()
const CUR = { year: _now.getFullYear(), month: _now.getMonth() + 1 }
const LAST_CLOSED = addMonths(CUR, -1)

export function ComparisonProvider({ children }) {
  // rangeB = período PRINCIPAL (activo) · rangeA = período de COMPARACIÓN (referencia)
  const [rangeB, setRangeB] = useState({ start: LAST_CLOSED, end: LAST_CLOSED })
  const [rangeA, setRangeA] = useState({ start: addMonths(LAST_CLOSED, -12), end: addMonths(LAST_CLOSED, -12) })
  const [compMode, setCompMode] = useState('yoy') // 'yoy' | 'prev' | 'custom'
  const [selectedVars, setSelectedVars] = useState(['purchases', 'revenue', 'avgPurchase', 'emailAttr', 'pushAttr', 'webAttr'])

  const toggleVar = (key) =>
    setSelectedVars((prev) =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter((v) => v !== key) : prev
        : [...prev, key]
    )

  // Recalcula el rango de comparación según el modo activo.
  const compFor = (rB, mode) => {
    if (mode === 'prev') { const len = rangeLen(rB); return { start: addMonths(rB.start, -len), end: addMonths(rB.end, -len) } }
    if (mode === 'yoy')  { return { start: addMonths(rB.start, -12), end: addMonths(rB.end, -12) } }
    return null // custom → no se toca
  }

  // Fija el período principal (y arrastra el de comparación si el modo es automático).
  const setPrimary = (rB) => {
    // normaliza para que start ≤ end
    const norm = ymOf(rB.start) <= ymOf(rB.end) ? rB : { start: rB.end, end: rB.start }
    setRangeB(norm)
    const c = compFor(norm, compMode)
    if (c) setRangeA(c)
  }

  const setMode = (mode) => {
    setCompMode(mode)
    const c = compFor(rangeB, mode)
    if (c) setRangeA(c)
  }

  const setComparison = (rA) => {
    setCompMode('custom')
    const norm = ymOf(rA.start) <= ymOf(rA.end) ? rA : { start: rA.end, end: rA.start }
    setRangeA(norm)
  }

  // Presets de rango principal (estilo GA4).
  const applyRangePreset = (id) => {
    const end = LAST_CLOSED
    const map = {
      this_month: { start: CUR, end: CUR },
      last_month: { start: end, end },
      last_3:     { start: addMonths(end, -2),  end },
      last_6:     { start: addMonths(end, -5),  end },
      last_12:    { start: addMonths(end, -11), end },
      ytd:        { start: { year: end.year, month: 1 }, end },
    }
    if (map[id]) setPrimary(map[id])
  }

  // ── Compatibilidad con la API anterior (mes único) ────────────────
  const applyPreset = (preset) => {
    if (preset === 'prev_month') { applyRangePreset('last_month'); setMode('prev') }
    else if (preset === 'yoy')   { applyRangePreset('last_month'); setMode('yoy') }
  }
  const setPeriodB = (p) => { setRangeB({ start: p, end: p }); const c = compFor({ start: p, end: p }, compMode); if (c) setRangeA(c) }
  const setPeriodA = (p) => { setCompMode('custom'); setRangeA({ start: p, end: p }) }

  const labelRange = (r) =>
    ymOf(r.start) === ymOf(r.end)
      ? `${monthLabel(r.start.month)} ${r.start.year}`
      : `${monthLabel(r.start.month)} ${String(r.start.year).slice(2)}–${monthLabel(r.end.month)} ${String(r.end.year).slice(2)}`

  const value = useMemo(() => {
    const startYM = Math.min(ymOf(rangeA.start), ymOf(rangeB.start))
    const endYM   = Math.max(ymOf(rangeA.end),   ymOf(rangeB.end))
    const periodStart = fromYM(startYM)  // extremo global anterior (para gráficas de contexto)
    const periodEnd   = fromYM(endYM)    // extremo global posterior
    const periodB = rangeB.end           // alias mes único (compat)
    const periodA = rangeA.end

    const inRange = (r, row) => { const n = (row.year || 0) * 12 + (row.month || 0); return n >= ymOf(r.start) && n <= ymOf(r.end) }
    const filterByPeriod = (arr) => (arr || []).filter(r => { const n = (r.year || 0) * 12 + (r.month || 0); return n >= startYM && n <= endYM })
    const sumRange = (arr, range, field) => (arr || []).reduce((s, r) => s + (inRange(range, r) ? (Number(r[field]) || 0) : 0), 0)

    const isInPeriodA = (y, m) => inRange(rangeA, { year: y, month: m })
    const isInPeriodB = (y, m) => inRange(rangeB, { year: y, month: m })
    const isInEitherPeriod = (y, m) => isInPeriodA(y, m) || isInPeriodB(y, m)
    const isComparing = ymOf(rangeA.start) !== ymOf(rangeB.start) || ymOf(rangeA.end) !== ymOf(rangeB.end)

    return {
      // ── Modelo de rangos (nuevo) ──
      rangeA, rangeB, compMode,
      setPrimary, setComparison, setMode, applyRangePreset,
      labelRange, inRange, sumRange,
      // ── Compat (mes único) ──
      periodA, setPeriodA, periodB, setPeriodB, activeMonth: periodB,
      selectedVars, toggleVar, VARIABLES,
      isInPeriodA, isInPeriodB, isInEitherPeriod, isComparing, applyPreset,
      // ── Rango global ──
      startYM, endYM, periodStart, periodEnd, filterByPeriod,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeA, rangeB, compMode, selectedVars])

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  )
}

export const useComparison = () => useContext(ComparisonContext)
