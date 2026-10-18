// issues/172: a mother's figures are its children's, added up; what it has on
// itself doesn't count, and a list that sums its rows doesn't count it twice
import { describe, it, expect } from 'vitest'
import { withoutMothers, ownFiguresIgnored } from '@/domain/motherFigures'

const mother = { id: 1, name: 'Mare', is_mother: true, total_estimated_hours: 4, incomes_expenses: -75.59, total_real_incomes_expenses: 10, activities: [{ hours: 1065 }], invoice_hours_price: 30 }
const child = { id: 2, name: 'Filla', mother: { id: 1 }, total_estimated_hours: 672.15, incomes_expenses: 17815.76, activities: [{ hours: 2 }] }

describe('mother figures', () => {
  it('a list sums the children, not the mothers', () => {
    expect(withoutMothers([mother, child])).toEqual([child])
    expect(withoutMothers(undefined)).toEqual([])
  })

  it('the Panell ignores what a mother has on itself', () => {
    const row = ownFiguresIgnored(mother)
    expect(row).toMatchObject({ name: 'Mare', total_estimated_hours: 0, incomes_expenses: 0, total_real_incomes_expenses: 0, activities: [] })
    expect(row.invoice_hours_price).toBe(30)
    expect(ownFiguresIgnored(child)).toBe(child)
  })
})
