// Figures of the charts of Informes › Ingressos i despeses, from the rows of
// projects/economic-detail (the same rows as its pivot). Amounts follow the pivot's
// measures: expenses and the cost of the hours come negative; the result is
// income + expenses + their VAT + hours, as «Resultat orig/prev/exec».

import { fiscalMonthOrder, fiscalYearLabel } from './years'

export const SCENARIOS = {
  orig: { income: 'income_orig', expense: 'expense_orig', vat: 'expense_orig_vat', hours: 'total_original_hours_price', label: 'Original' },
  prev: { income: 'income_esti', expense: 'expense_esti', vat: 'expense_esti_vat', hours: 'total_estimated_hours_price', label: 'Previst' },
  exec: { income: 'income_real', expense: 'expense_real', vat: 'expense_real_vat', hours: 'total_real_hours_price', label: 'Executat' }
}

const MONTHS = ['Gen', 'Febr', 'Març', 'Abr', 'Maig', 'Juny', 'Jul', 'Ag', 'Set', 'Oct', 'Nov', 'Des']
const num = v => Number(v) || 0
const round = v => Math.round(v * 100) / 100

// income, expenses (documents and their VAT) and hours as positive amounts, and the result
export function rowAmounts (row, scenario) {
  const f = SCENARIOS[scenario]
  const income = num(row[f.income])
  const expense = num(row[f.expense]) + num(row[f.vat])
  const hours = num(row[f.hours])
  return { income, expenses: 0 - expense, hours: 0 - hours, result: income + expense + hours }
}

const empty = () => ({ income: 0, expenses: 0, hours: 0, result: 0 })
const add = (acc, a) => {
  acc.income += a.income
  acc.expenses += a.expenses
  acc.hours += a.hours
  acc.result += a.result
  return acc
}
const rounded = t => ({ ...t, income: round(t.income), expenses: round(t.expenses), hours: round(t.hours), result: round(t.result) })

export function totals (rows, scenario) {
  return rounded(rows.reduce((acc, r) => add(acc, rowAmounts(r, scenario)), empty()))
}

// per month of one year (all twelve, empty ones too), or per year when the rows span
// several; each period also carries the result accumulated up to it. With a fiscal
// year (`startMonth` > 1, Configuració general) the months run from its first one
// and the years read «2026/27».
export function byPeriod (rows, scenario, { byYear = false, startMonth = 1 } = {}) {
  const groups = new Map()
  const order = fiscalMonthOrder(startMonth)
  if (!byYear) order.forEach(m => groups.set(String(m).padStart(2, '0'), { key: String(m).padStart(2, '0'), label: MONTHS[m - 1], ...empty() }))
  for (const r of rows) {
    const key = byYear ? String(r.year) : String(r.month).padStart(2, '0')
    if (!groups.has(key)) groups.set(key, { key, label: byYear ? fiscalYearLabel(key, startMonth) : key, ...empty() })
    add(groups.get(key), rowAmounts(r, scenario))
  }
  const rank = g => (byYear ? 0 : order.indexOf(Number(g.key)))
  let accumulated = 0
  return [...groups.values()]
    .sort((a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key))
    .map(g => {
      accumulated += g.result
      return { ...rounded(g), accumulated: round(accumulated) }
    })
}

// the projects with the largest results, positive or negative, best first
export function byProject (rows, scenario, limit = 10) {
  const groups = new Map()
  for (const r of rows) {
    const key = r.project_name || '-'
    if (!groups.has(key)) groups.set(key, { label: key, ...empty() })
    add(groups.get(key), rowAmounts(r, scenario))
  }
  return [...groups.values()]
    .map(rounded)
    .filter(g => g.income || g.expenses || g.hours)
    .sort((a, b) => Math.abs(b.result) - Math.abs(a.result))
    .slice(0, limit)
    .sort((a, b) => b.result - a.result)
}

// expenses by type, the cost of the hours as one more type; past `limit`, «Altres»
export function byExpenseType (rows, scenario, limit = 8) {
  const groups = new Map()
  for (const r of rows) {
    const a = rowAmounts(r, scenario)
    if (a.expenses) groups.set(r.row_type || '-', (groups.get(r.row_type || '-') || 0) + a.expenses)
    if (a.hours) groups.set('Hores', (groups.get('Hores') || 0) + a.hours)
  }
  const sorted = [...groups.entries()]
    .map(([label, amount]) => ({ label, amount: round(amount) }))
    .filter(g => g.amount)
    .sort((a, b) => b.amount - a.amount)
  if (sorted.length <= limit) return sorted
  const rest = sorted.slice(limit - 1).reduce((s, g) => s + g.amount, 0)
  return [...sorted.slice(0, limit - 1), { label: 'Altres', amount: round(rest) }]
}
