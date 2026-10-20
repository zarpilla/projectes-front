// issues/295: a document line's quantity is stored with 2 decimals (decimal(10,2),
// Facturae prints 2) but the Quantitat input computed with a 3rd: 1,255 × 99,9999
// showed a base of 143,01 € and saved 143,51 €, and the budget line created with
// «Sí, associar» kept 143,01 €.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Buefy from 'buefy'
import DocumentLines from '@/components/DocumentLines.vue'
import { documentLineQuantity } from '@/domain/budgetLines.js'
import { storeLineQuantities, totalBase } from '@/domain/documentTotals.js'

const ticketLines = () => [
  { concept: 'A', quantity: '1,255', base: '99.9999', discount: 0, vat: 21, irpf: 15 },
  { concept: 'B', quantity: '2', base: '10.005', discount: 12.5, vat: 10, irpf: 0 }
]

afterEach(() => vi.useRealTimers())

describe('document line quantities keep 2 decimals (issues/295)', () => {
  it('reads Catalan decimals and thousands, rounding a 3rd decimal away', () => {
    expect(documentLineQuantity('1,255')).toBe('1.26')
    expect(documentLineQuantity('1,25')).toBe('1.25')
    expect(documentLineQuantity('1.000,5')).toBe('1000.5')
    expect(documentLineQuantity('1.234')).toBe('1.23')
    expect(documentLineQuantity('-0,125')).toBe('-0.13')
    expect(documentLineQuantity(3)).toBe(3)
    expect(documentLineQuantity('abc')).toBe('abc')
  })

  it('the Quantitat input rounds to 2 decimals 300ms after typing', async () => {
    vi.useFakeTimers()
    const lines = [{ concept: 'A', base: 10, quantity: 1, discount: 0, vat: 21, irpf: 0, comments: '', show: false }]
    const w = mount(DocumentLines, { props: { lines, newLine: () => ({}) }, global: { plugins: [Buefy] } })
    await w.findAll('li.subphase input')[1].setValue('1,255')
    vi.advanceTimersByTime(300)
    expect(lines[0].quantity).toBe('1.26')
    await w.findAll('li.subphase input')[1].setValue('2,5')
    vi.advanceTimersByTime(300)
    expect(lines[0].quantity).toBe('2.5')
  })

  it('on saving, the shown base is the stored one and the new assigned budget line follows it', () => {
    const lines = ticketLines()
    lines[0].quantity = '1.255' // the comma already turned into a dot, as before the fix
    const shown = totalBase(lines)
    expect(shown).toBe(143.01)
    const budgetLine = { assign: true, amount: shown, quantity: 1 }
    const other = { assign: false, amount: shown, quantity: 1 }
    const saved = { id: 9, assign: true, amount: shown, quantity: 1 }
    const projects = [{ project_phases: [{ incomes: [], expenses: [budgetLine, other, saved] }] }]
    expect(storeLineQuantities(lines, projects, documentLineQuantity)).toBe(true)
    expect(lines[0].quantity).toBe('1.26')
    expect(totalBase(lines)).toBe(143.51)
    expect(budgetLine.amount).toBe(143.51)
    expect(other.amount).toBe(143.01)
    expect(saved.amount).toBe(143.01)
  })

  it('leaves 2-decimal lines and their budget lines alone', () => {
    const lines = [{ quantity: '1.26', base: '99.9999', discount: 0 }]
    const budgetLine = { assign: true, amount: 126 }
    expect(storeLineQuantities(lines, [{ project_phases: [{ expenses: [budgetLine] }] }], documentLineQuantity)).toBe(false)
    expect(lines[0].quantity).toBe('1.26')
    expect(budgetLine.amount).toBe(126)
  })
})
