// The project summary figures must equal what the "Resum financer projecte" card
// computed in ProjectForm's template (the expressions are copied below, as they were).
import { describe, it, expect } from 'vitest'
import { projectSummary, indirectPercent } from '@/domain/projectSummary'

// the card's template expressions, kind = original | estimated | real
const card = (totals, kind) => {
  const p = { original: 'original', estimated: 'estimated', real: 'real' }[kind]
  const result = { original: 'original_incomes_expenses', estimated: 'estimated_incomes_expenses', real: 'total_real_incomes_expenses' }[kind]
  const incomes = totals[`total_${p}_incomes`] || 0
  const invoices = totals[`total_${p}_expenses`] || 0
  const hours = totals && totals[`total_${p}_hours`] ? totals[`total_${p}_hours`] : 0
  return {
    result: totals[result] || 0,
    incomes,
    expenses: (totals[`total_${p}_expenses`] || 0) + (totals[`total_${p}_hours_price`] || 0) + (totals[`total_${p}_expenses_vat`] || 0),
    invoices,
    prorata: totals[`total_${p}_expenses_vat`] || 0,
    hoursCost: totals[`total_${p}_hours_price`] || 0,
    hours,
    costPerHour: totals && totals[`total_${p}_hours`] ? (totals[`total_${p}_hours_price`] || 0) / totals[`total_${p}_hours`] : 0,
    pricePerHour: totals && totals[`total_${p}_hours`] ? ((totals[`total_${p}_incomes`] || 0) - (totals[`total_${p}_expenses`] || 0)) / totals[`total_${p}_hours`] : 0
  }
}

// seeded PRNG, like the other domain tests: reproducible random totals
function prng (seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

function randomTotals (rand) {
  const t = {}
  const fields = ['original_incomes_expenses', 'estimated_incomes_expenses', 'total_real_incomes_expenses']
  for (const p of ['original', 'estimated', 'real']) {
    fields.push(`total_${p}_incomes`, `total_${p}_expenses`, `total_${p}_expenses_vat`, `total_${p}_hours_price`, `total_${p}_hours`)
  }
  for (const f of fields) {
    const r = rand()
    // some missing, some zero, some negative
    t[f] = r < 0.1 ? undefined : r < 0.2 ? 0 : r < 0.3 ? null : Math.round((rand() * 200000 - 20000)) / 100
  }
  return t
}

describe('projectSummary', () => {
  it('equals the summary card for 500 random projects', () => {
    const rand = prng(20261016)
    for (let i = 0; i < 500; i++) {
      const totals = randomTotals(rand)
      const summary = projectSummary(totals)
      for (const kind of ['original', 'estimated', 'real']) {
        const expected = card(totals, kind)
        for (const [key, value] of Object.entries(expected)) {
          expect(summary[kind][key], `${kind}.${key} #${i}`).toBe(value)
        }
      }
    }
  })

  it('gives zeros for an empty project', () => {
    const summary = projectSummary(null)
    expect(summary.real).toEqual({ result: 0, incomes: 0, invoices: 0, prorata: 0, hoursCost: 0, expenses: 0, indirect: 0, expensesWithIndirect: 0, hours: 0, costPerHour: 0, pricePerHour: 0 })
  })

  it('adds invoices, prorata and hours into the expenses', () => {
    const summary = projectSummary({ total_real_expenses: 100, total_real_expenses_vat: 21, total_real_hours_price: 300, total_real_hours: 20, total_real_incomes: 900 })
    expect(summary.real.expenses).toBe(421)
    expect(summary.real.costPerHour).toBe(15)
    expect(summary.real.pricePerHour).toBe(40)
  })
})

// issues/420: the project's indirect expenses %, only shown in the «Resum»
describe('projectSummary indirect expenses (issues/420)', () => {
  const totals = {
    total_original_expenses: 1000, total_original_hours_price: 500, total_original_expenses_vat: 0,
    total_estimated_expenses: 2000, total_estimated_hours_price: 1000, total_estimated_expenses_vat: 33.33,
    total_real_expenses: 800, total_real_hours_price: 200, total_real_expenses_vat: 0,
    original_incomes_expenses: 100, estimated_incomes_expenses: 200, total_real_incomes_expenses: 300
  }

  it('is the % of the expenses total of each column, in cents, added to the expenses', () => {
    const s = projectSummary(totals, 10)
    expect(s.original.indirect).toBe(150)
    expect(s.estimated.indirect).toBe(303.33) // 10 % of 3033,33
    expect(s.real.indirect).toBe(100)
    expect(s.original.expensesWithIndirect).toBe(1650)
    expect(s.real.expensesWithIndirect).toBe(1100)
  })

  it('changes neither the expenses total nor the result', () => {
    const s = projectSummary(totals, 25)
    const without = projectSummary(totals)
    for (const kind of ['original', 'estimated', 'real']) {
      expect(s[kind].expenses).toBe(without[kind].expenses)
      expect(s[kind].result).toBe(without[kind].result)
      expect(s[kind].pricePerHour).toBe(without[kind].pricePerHour)
    }
  })

  it('is 0 without a %, and takes what the form types', () => {
    for (const pct of [undefined, null, '', 0, '0', -5, 'abc']) {
      const s = projectSummary(totals, pct)
      expect(s.real.indirect, String(pct)).toBe(0)
      expect(s.real.expensesWithIndirect).toBe(s.real.expenses)
    }
    expect(projectSummary(totals, '12,5').original.indirect).toBe(187.5)
    expect(projectSummary(totals, '12.5').original.indirect).toBe(187.5)
    expect(indirectPercent('7,25')).toBe(7.25)
  })
})
