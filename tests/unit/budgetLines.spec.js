// issues/194: budget lines stored quantity and price with 2 decimals while the
// form accepted more: a typed 0,0357 × 98.750 showed 3.525,38 € on the line,
// Resum added up 3.950 € and the next save rewrote the total. The API keeps 4
// decimals now; the form stores at most 4 and every total is quantity × price
// rounded to cents, as the API computes it.
import { describe, it, expect, vi } from 'vitest'
import { budgetLineTotal, budgetLineValue } from '@/domain/budgetLines'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import ProjectPhases from '@/components/ProjectPhases.vue'

describe('budget line total (issues/194)', () => {
  it('is quantity × price rounded to cents', () => {
    expect(budgetLineTotal({ quantity: '0.0357', amount: '98750' })).toBe(3525.38)
    expect(budgetLineTotal({ quantity: 2, amount: 1234.565 })).toBe(2469.13)
    expect(budgetLineTotal({ quantity: 'abc', amount: 3 })).toBe(0)
    expect(budgetLineTotal({})).toBe(0)
  })

  it('adds up the phase as the lines show it', () => {
    const phase = { incomes: [{ quantity: 1, amount: 0.005 }, { quantity: 1, amount: 0.005 }], expenses: [] }
    expect(ProjectPhases.methods.subTotalIncomes(phase)).toBe(0.02)
  })
})

describe('typed quantity or price (issues/194)', () => {
  it('keeps up to 4 decimals and takes a decimal comma', () => {
    expect(budgetLineValue('0,0357')).toBe('0.0357')
    expect(budgetLineValue('1234.565')).toBe('1234.565')
    expect(budgetLineValue(12)).toBe(12)
    expect(budgetLineValue('3')).toBe('3')
  })

  it('rounds a 5th decimal away, so what you see is what is stored', () => {
    expect(budgetLineValue('0,03575')).toBe('0.0358')
    expect(budgetLineValue('-1.23456')).toBe('-1.2346')
  })

  it('leaves half-typed or non-numeric text alone', () => {
    expect(budgetLineValue('')).toBe('')
    expect(budgetLineValue('0,')).toBe('0.')
    expect(budgetLineValue('-')).toBe('-')
    expect(budgetLineValue('12 u')).toBe('12 u')
    expect(budgetLineValue(null)).toBe(null)
  })

  it('the form stores the cleaned value', () => {
    const subphase = { quantity: '0,03575' }
    const vm = { phases: [], mode: 'phases', form: { id: 1 }, $emit: vi.fn() }
    ProjectPhases.methods.changeSubPhase.call(vm, subphase, 'quantity', subphase.quantity)
    expect(subphase.quantity).toBe('0.0358')
    expect(subphase.dirty).toBe(true)
  })
})
