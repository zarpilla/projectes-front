// issues/101: migrated documents without lines (313 received invoices on La
// Diligència) showed «Total 0,00 €» in the form, since the totals were computed
// from no lines; the preview printed a 0 € total as «-€».
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import DocumentForm from '@/components/DocumentForm.vue'
import Invoice from '@/views/Invoice.vue'

const totals = form => {
  const c = DocumentForm.computed
  const vm = { form }
  vm.usesStoredTotals = c.usesStoredTotals.call(vm)
  for (const k of ['totalBase', 'totalVat', 'totalIrpf']) vm[k] = c[k].call(vm)
  return { base: vm.totalBase, vat: vm.totalVat, irpf: vm.totalIrpf, total: c.total.call(vm) }
}

describe('documents without lines (issues/101)', () => {
  it('show the totals stored on them', () => {
    expect(totals({ id: 320, lines: [], total_base: '82.30', total_vat: '17.28', total_irpf: 0 }))
      .toEqual({ base: 82.3, vat: 17.28, irpf: -0, total: 99.58 })
  })

  it('compute them from the lines otherwise, and for a new document', () => {
    const line = { quantity: 1, base: 10, vat: 21, irpf: 0 }
    expect(totals({ id: 5, lines: [line], total_base: 999 }).base).toBe(10)
    expect(totals({ id: null, lines: [], total_base: 999 }).base).toBe(0)
  })

  it('the preview prints 0 as an amount', () => {
    expect(Invoice.methods.formatCurrency(0)).toBe('0,00')
    expect(Invoice.methods.formatCurrency(null)).toBe('-')
    expect(Invoice.methods.formatCurrency(1234.5)).toBe('1.234,50')
  })
})
