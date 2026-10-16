// Justificacions threw while drawing when a project had a grantable year
// without its year (see src/domain/grantable.js).
import { describe, it, expect } from 'vitest'
import { grantableAmountForYear } from '@/domain/grantable.js'

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
