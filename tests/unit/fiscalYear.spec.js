// Fiscal year (Configuració general › Projectes): an entity whose year runs
// September–August sees its project economics grouped by «2026/27».
import { describe, it, expect } from 'vitest'
import {
  fiscalStartMonth,
  fiscalYearOf,
  fiscalYearLabel,
  fiscalYearRange,
  fiscalMonthOrder,
  fiscalPivotRows,
  projectStartYearLabel
} from '@/domain/years'
import { byPeriod } from '@/domain/economicDetailCharts'

describe('fiscal year helpers', () => {
  it('reads the start month of me, January when unset', () => {
    expect(fiscalStartMonth({ options: { fiscal_year_start_month: 9 } })).toBe(9)
    expect(fiscalStartMonth({ options: { fiscal_year_start_month: null } })).toBe(1)
    expect(fiscalStartMonth(null)).toBe(1)
  })

  it('names a fiscal year by the year it starts in', () => {
    expect(fiscalYearOf('2026-08-31', 9)).toBe(2025)
    expect(fiscalYearOf('2026-09-01', 9)).toBe(2026)
    expect(fiscalYearOf('2027-02-10', 9)).toBe(2026)
    expect(fiscalYearOf('2027-02-10', 1)).toBe(2027)
    expect(fiscalYearOf(null, 9)).toBeNull()
  })

  it('labels, ranges and month order', () => {
    expect(fiscalYearLabel(2026, 9)).toBe('2026/27')
    expect(fiscalYearLabel('2099', 9)).toBe('2099/00')
    expect(fiscalYearLabel(2026, 1)).toBe('2026')
    expect(fiscalYearLabel('Tots', 9)).toBe('Tots')
    expect(fiscalYearRange(2026, 9)).toEqual({ from: '2026-09-01', to: '2027-08-31' })
    expect(fiscalYearRange(2026, 1)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
    expect(fiscalMonthOrder(9)).toEqual([9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('pivot rows read «2026/27» and the months sort in fiscal order', () => {
    const rows = [{ year: '2026', month: '09' }, { year: '2026', month: '01' }, { year: '9999', month: '12' }]
    expect(fiscalPivotRows(rows, 9)).toEqual([
      { year: '2026/27', month: '01 Set' },
      { year: '2026/27', month: '05 Gen' },
      { year: '9999', month: '04 Des' }
    ])
    expect(fiscalPivotRows(rows, 1)).toBe(rows)
  })

  it('«Any inici» of a project', () => {
    expect(projectStartYearLabel({ date_start: '2026-10-01' }, 9)).toBe('2026/27')
    expect(projectStartYearLabel({ date_start: '2026-07-01' }, 9)).toBe('2025/26')
    expect(projectStartYearLabel({ date_start: null, created_at: '2026-07-01T10:00:00Z' }, 1)).toBe('2026')
  })
})

describe('economic charts by fiscal month', () => {
  const rows = [
    { year: '2026', month: '09', income_esti: 100 },
    { year: '2026', month: '01', income_esti: 50 }
  ]

  it('starts the months at the fiscal year', () => {
    const months = byPeriod(rows, 'prev', { startMonth: 9 })
    expect(months.map(m => m.label).slice(0, 5)).toEqual(['Set', 'Oct', 'Nov', 'Des', 'Gen'])
    expect(months[0].accumulated).toBe(100)
    expect(months[4].accumulated).toBe(150)
  })

  it('calendar months by default', () => {
    expect(byPeriod(rows, 'prev')[0].label).toBe('Gen')
  })

  it('labels years «2026/27»', () => {
    expect(byPeriod(rows, 'prev', { byYear: true, startMonth: 9 }).map(y => y.label)).toEqual(['2026/27'])
  })
})
