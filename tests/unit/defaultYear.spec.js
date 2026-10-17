// issues/064: Bestretes, Saldo hores, Hores anuals and Preu hora opened on the
// first year of a descending list (2027, empty) instead of this year.
import { describe, it, expect } from 'vitest'
import { defaultYear } from '@/domain/years'

const years = [{ id: 3, year: 2027 }, { id: 2, year: 2026 }, { id: 1, year: 2025 }]

describe('defaultYear (issues/064)', () => {
  it('picks this year', () => {
    expect(defaultYear(years, 2026)).toEqual({ id: 2, year: 2026 })
    expect(defaultYear([{ id: 0, year: 'Tots' }, ...years], 2026).year).toBe(2026)
  })

  it('without this year, the latest one before it', () => {
    expect(defaultYear(years, 2030).year).toBe(2027)
    expect(defaultYear([{ year: 2027 }, { year: 2024 }], 2026).year).toBe(2024)
  })

  it('otherwise the first, or none', () => {
    expect(defaultYear([{ year: 2030 }], 2026).year).toBe(2030)
    expect(defaultYear([], 2026)).toBeNull()
  })
})
