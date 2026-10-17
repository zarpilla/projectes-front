// issues/059: searching an invoice in Justificacions threw on invoices without
// a code (option.code.toString()).
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import Justification from '@/components/Justification.vue'

describe('Justificacions invoice search (issues/059)', () => {
  it('searches invoices without a code too', () => {
    const ctx = { invoiceSearch: '5', invoices: [{ id: 1, code: null, total_base: 5 }, { id: 2, code: 'F-2026-12', total_base: 9 }, { id: 3, code: 'F-2026-5', total_base: 1 }] }
    expect(Justification.computed.filteredInvoices.call(ctx).map(i => i.id)).toEqual([1, 3])
  })
})
