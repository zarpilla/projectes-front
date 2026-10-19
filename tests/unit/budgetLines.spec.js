// issues/194: budget lines stored quantity and price with 2 decimals while the
// form accepted more: a typed 0,0357 × 98.750 showed 3.525,38 € on the line,
// Resum added up 3.950 € and the next save rewrote the total. The API keeps 4
// decimals now; the form stores at most 4 and every total is quantity × price
// rounded to cents, as the API computes it.
import { describe, it, expect, vi } from 'vitest'
import { budgetLineDisplay, budgetLineTotal, budgetLineValue } from '@/domain/budgetLines'

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

// issues/224: a typed 1.000,5 was kept as "1.000.5" (total 0,00 € and a 500 on
// save), and the inputs showed dot decimals (7.25, 333.3333).
describe('Catalan quantity or price (issues/224)', () => {
  it('with a comma, reads "." as thousands and "," as decimals', () => {
    expect(budgetLineValue('1.000,5')).toBe('1000.5')
    expect(budgetLineValue('12.345.678,25')).toBe('12345678.25')
    expect(budgetLineValue('−1.000,5')).toBe('-1000.5')
    expect(budgetLineValue('1.000,03575')).toBe('1000.0358')
    expect(budgetLineTotal({ quantity: budgetLineValue('1.000,5'), amount: '2' })).toBe(2001)
  })

  it('without a comma, a single "." is the decimal point as before', () => {
    expect(budgetLineValue('1.000')).toBe('1.000')
    expect(budgetLineValue('1.234')).toBe('1.234')
    expect(budgetLineValue('7.25')).toBe('7.25')
    expect(budgetLineValue('1234.565')).toBe('1234.565')
  })

  it('several dots without a comma can only be thousands', () => {
    expect(budgetLineValue('1.000.000')).toBe('1000000')
    expect(budgetLineValue('-12.345.678')).toBe('-12345678')
  })

  it('leaves badly grouped text alone, for the API to refuse', () => {
    expect(budgetLineValue('1.00.000')).toBe('1.00.000')
    expect(budgetLineValue('1.00,5')).toBe('1.00,5')
    expect(budgetLineValue('1,0,5')).toBe('1,0,5')
  })

  it('shows Catalan decimals', () => {
    expect(budgetLineDisplay('7.25')).toBe('7,25')
    expect(budgetLineDisplay(333.3333)).toBe('333,3333')
    expect(budgetLineDisplay('1000.5000')).toBe('1.000,5')
    expect(budgetLineDisplay(1)).toBe('1')
    expect(budgetLineDisplay(budgetLineValue(budgetLineDisplay(-1234.5)))).toBe('−1.234,5')
    expect(budgetLineDisplay('12 u')).toBe('12 u')
    expect(budgetLineDisplay('')).toBe('')
    expect(budgetLineDisplay(null)).toBe(null)
    expect(budgetLineDisplay('1000.5', { grouped: false })).toBe('1000,5')
    expect(budgetLineDisplay(1000, { grouped: false })).toBe('1000')
  })

  it('the input shows what is typed while editing, Catalan decimals otherwise', () => {
    const row = { quantity: 1000, amount: 2 }
    const vm = { phases: [], mode: 'phases', form: { id: 1 }, $emit: vi.fn(), editingLine: null }
    vm.changeSubPhase = ProjectPhases.methods.changeSubPhase.bind(vm)
    const { lineInputText, lineInputFocus, lineInput } = ProjectPhases.methods
    expect(lineInputText.call(vm, row, 'quantity')).toBe('1.000')
    lineInputFocus.call(vm, row, 'quantity')
    // no thousands dot to edit: 1.000 would read back as 1
    expect(lineInputText.call(vm, row, 'quantity')).toBe('1000')
    lineInput.call(vm, row, 'quantity', '1.000,')
    expect(lineInputText.call(vm, row, 'quantity')).toBe('1.000,')
    lineInput.call(vm, row, 'quantity', '1.000,5')
    expect(row.quantity).toBe('1000.5')
    expect(lineInputText.call(vm, row, 'amount')).toBe('2')
    vm.editingLine = null
    expect(lineInputText.call(vm, row, 'quantity')).toBe('1.000,5')
  })
})
