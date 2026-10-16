// pricePerHour must give the same figures as the old PricePerHourDetail template
// (its expressions are copied below as the reference), over random projects.
import { describe, it, expect } from 'vitest'
import { pricePerHour, priceBands } from '@/domain/pricePerHour.js'

const keys = { expense: 'total_expense_esti', vat: 'expense_esti_vat', hours: 'total_estimated_hours' }

// seeded PRNG
let seed = 7
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
const randomGroups = n => Array.from({ length: n }, (_, i) => ({
  id: String(i + 1),
  project_name: `P${i + 1}`,
  structural_expenses: rand() < 0.15 ? true : (rand() < 0.5 ? null : false),
  total_expense_esti: -Math.round(rand() * 5000000) / 100,
  expense_esti_vat: -Math.round(rand() * 100000) / 100,
  total_estimated_hours: rand() < 0.1 ? 0 : Math.round(rand() * 200000) / 100
}))

// the old template
const old = (groups, margin) => {
  const p = g => g.total_expense_esti + g.expense_esti_vat
  const nonStruct = groups.filter(g => g.structural_expenses !== true)
  const ExpenseTotal = nonStruct.reduce((a, g) => a + p(g), 0)
  const StructuralTotal = groups.filter(g => g.structural_expenses).reduce((a, g) => a + p(g), 0)
  const EstimatedHoursTotal = nonStruct.reduce((a, g) => a + g.total_estimated_hours, 0)
  return {
    rows: nonStruct.map(project => ({
      direct: -1 * p(project),
      pct: (100 * p(project)) / ExpenseTotal,
      indirect: -1 * (p(project) / ExpenseTotal) * StructuralTotal,
      hours: project.total_estimated_hours,
      price: ((-1 * p(project) + -1 * (p(project) / ExpenseTotal) * StructuralTotal) * (1 + margin / 100)) / project.total_estimated_hours
    })),
    total: ((-1 * ExpenseTotal + -1 * StructuralTotal) * (1 + margin / 100)) / EstimatedHoursTotal
  }
}

describe('pricePerHour', () => {
  it('matches the old table on random projects', () => {
    for (let run = 0; run < 50; run++) {
      const groups = randomGroups(3 + Math.floor(rand() * 40))
      const margin = Math.round(rand() * 20)
      const { rows, totals } = pricePerHour(groups, keys, margin)
      const ref = old(groups, margin)
      expect(rows).toHaveLength(ref.rows.length)
      rows.forEach((r, i) => {
        expect(r.direct).toBeCloseTo(ref.rows[i].direct, 6)
        expect(r.share * 100).toBeCloseTo(ref.rows[i].pct, 6)
        expect(r.indirect).toBeCloseTo(ref.rows[i].indirect, 6)
        expect(r.hours).toBe(ref.rows[i].hours)
        // the old table divided by 0 hours (Infinity / NaN): now no price
        if (ref.rows[i].hours) expect(r.price).toBeCloseTo(ref.rows[i].price, 6)
        else expect(r.price).toBeNull()
      })
      expect(totals.price).toBeCloseTo(ref.total, 6)
    }
  })

  it('takes the margin as text too (the input gives a string)', () => {
    const groups = [{ id: '1', project_name: 'A', total_expense_esti: -100, expense_esti_vat: 0, total_estimated_hours: 10 }]
    expect(pricePerHour(groups, keys, '5').rows[0].price).toBeCloseTo(10.5, 10)
  })

  it('counts projects per price band', () => {
    const rows = [{ price: 10 }, { price: 25 }, { price: 29.9 }, { price: 150 }, { price: null }]
    expect(priceBands(rows).map(b => b.count)).toEqual([1, 2, 0, 0, 0, 1])
  })
})
