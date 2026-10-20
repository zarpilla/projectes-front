// Justificacions threw while drawing when a project had a grantable year
// without its year (see src/domain/grantable.js).
import { describe, it, expect } from 'vitest'
import { grantableAmountForYear, grantableAmountAllYears } from '@/domain/grantable.js'

describe('grantableAmountForYear', () => {
  const project = {
    grantable_amount: 999,
    grantable_years: [
      { year: null, grantable_amount: 50 },
      { year: { year: 2025 }, grantable_amount: 1000 },
      { year: 2026, grantable_amount: 2000, grantable_cofinancing: 300 },
      { year: { id: 9 }, grantable_amount: 70 }
    ]
  }

  it('finds the year, as an object or an id-like value', () => {
    expect(grantableAmountForYear(project, '2025')).toBe(1000)
    expect(grantableAmountForYear(project, 2026)).toBe(2000)
    expect(grantableAmountForYear(project, 2026, 'grantable_cofinancing')).toBe(300)
  })

  it('skips entries without a year instead of throwing', () => {
    expect(() => grantableAmountForYear(project, 2027)).not.toThrow()
    expect(grantableAmountForYear(project, 2027)).toBe(0)
  })

  it('uses the project field when there are no per-year amounts', () => {
    expect(grantableAmountForYear({ grantable_amount: 5 }, 2026)).toBe(5)
    expect(grantableAmountForYear(null, 2026)).toBe(0)
  })
})

// issues/262: Subvencions read the old project fields, not «Imports per any».
describe('grantableAmountAllYears', () => {
  it('sums the per-year amounts of a field', () => {
    const project = {
      grantable_amount_total: 137481,
      grantable_years: [
        { year: { year: 2025 }, grantable_amount_total: 80000, grantable_amount: '1000.5', grantable_cofinancing: 100 },
        { year: { year: 2026 }, grantable_amount_total: 49300, grantable_amount: 2000 }
      ]
    }
    expect(grantableAmountAllYears(project, 'grantable_amount_total')).toBe(129300)
    expect(grantableAmountAllYears(project)).toBe(3000.5)
    expect(grantableAmountAllYears(project, 'grantable_cofinancing')).toBe(100)
  })

  it('uses the project field when there are no per-year amounts', () => {
    expect(grantableAmountAllYears({ grantable_amount_total: '1200' }, 'grantable_amount_total')).toBe(1200)
    expect(grantableAmountAllYears({ grantable_years: [] }, 'grantable_amount_total')).toBe(0)
    expect(grantableAmountAllYears(null)).toBe(0)
  })
})
