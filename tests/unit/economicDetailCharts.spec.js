// The charts of Informes › Ingressos i despeses add up the same rows as its pivot:
// the result is the pivot's «Resultat exec/prev» (income + expenses + VAT + hours).
import { describe, it, expect } from 'vitest'
import { rowAmounts, totals, byPeriod, byProject, byExpenseType } from '@/domain/economicDetailCharts'

const income = (project, month, real, esti = real) => ({ type: 'income', project_name: project, year: '2026', month, row_type: 'Factura', income_real: real, income_esti: esti, income_orig: 0 })
const expense = (project, month, real, vat = 0, type = 'Carburant') => ({ type: 'expense', project_name: project, year: '2026', month, row_type: type, expense_real: -real, expense_real_vat: -vat, expense_esti: -real, expense_esti_vat: 0 })
const hours = (project, month, cost) => ({ type: 'real_hours', project_name: project, year: '2026', month, row_type: 'Hores reals', total_real_hours_price: -cost, total_estimated_hours_price: 0 })

const rows = [
  income('A', '01', 1000),
  expense('A', '01', 200, 42),
  hours('A', '02', 300),
  income('B', '03', 50, 80),
  expense('B', '03', 400, 0, 'Gestoria')
]

describe('economic detail charts', () => {
  it('reads a row as the pivot does: expenses with their VAT, hours as a cost', () => {
    expect(rowAmounts(expense('A', '01', 200, 42), 'exec')).toEqual({ income: 0, expenses: 242, hours: 0, result: -242 })
    expect(rowAmounts(hours('A', '02', 300), 'exec')).toEqual({ income: 0, expenses: 0, hours: 300, result: -300 })
  })

  it('totals each scenario', () => {
    expect(totals(rows, 'exec')).toEqual({ income: 1050, expenses: 642, hours: 300, result: 108 })
    expect(totals(rows, 'prev')).toEqual({ income: 1080, expenses: 600, hours: 0, result: 480 })
  })

  it('splits a year into its twelve months, with the accumulated result', () => {
    const months = byPeriod(rows, 'exec')
    expect(months).toHaveLength(12)
    expect(months.slice(0, 3).map(m => [m.label, m.income, m.expenses, m.hours, m.result, m.accumulated])).toEqual([
      ['Gen', 1000, 242, 0, 758, 758],
      ['Febr', 0, 0, 300, -300, 458],
      ['Març', 50, 400, 0, -350, 108]
    ])
    expect(months[11].accumulated).toBe(108)
  })

  it('splits several years by year', () => {
    const years = byPeriod([...rows, { ...income('C', '05', 10), year: '2025' }], 'exec', { byYear: true })
    expect(years.map(y => [y.label, y.result, y.accumulated])).toEqual([['2025', 10, 10], ['2026', 108, 118]])
  })

  it('ranks projects by the size of their result, best first', () => {
    expect(byProject(rows, 'exec').map(p => [p.label, p.result])).toEqual([['A', 458], ['B', -350]])
    expect(byProject(rows, 'exec', 1).map(p => p.label)).toEqual(['A'])
  })

  it('groups expenses by type, hours included, and folds the tail into «Altres»', () => {
    expect(byExpenseType(rows, 'exec')).toEqual([
      { label: 'Gestoria', amount: 400 },
      { label: 'Hores', amount: 300 },
      { label: 'Carburant', amount: 242 }
    ])
    expect(byExpenseType(rows, 'exec', 2)).toEqual([
      { label: 'Gestoria', amount: 400 },
      { label: 'Altres', amount: 542 }
    ])
  })
})
