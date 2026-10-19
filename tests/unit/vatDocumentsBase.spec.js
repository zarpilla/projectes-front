// issues/209: on the IVA page the pending documents' «Base» showed the total
// with VAT, «IVA deduïble» of the executed quarters showed the quarter balance,
// and the deductible % showed on emitted documents too.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import VatTable from '@/components/VatTable.vue'

const c = VatTable.computed

const documents = [
  { id: 1, type: 'emitted-invoices', date: '2026-08-01', total: 2405.48, total_vat: 417.48, total_base: 1988 },
  { id: 2, type: 'received-invoices', date: '2026-08-02', total: 121, total_vat: 21, total_base: 100 },
  { id: 3, type: 'received-expenses', date: '2026-08-03', total: 110, total_vat: 10 } // older API: no total_base
]

describe('IVA pending documents (issues/209)', () => {
  const rows = c.documentsWithSearchableFields.call({ vat: { documents }, getTypeLabel: t => t })

  it('shows the base, not the total with VAT', () => {
    expect(rows.map(r => r.base)).toEqual([1988, 100, 100])
  })

  it('adds up bases in the totals', () => {
    const ctx = { filteredDocuments: rows }
    expect(c.totalBaseRepercutit.call(ctx)).toBe(1988)
    expect(c.totalBaseSuportat.call(ctx)).toBe(200)
  })

  it('marks only received documents as deductible', () => {
    expect(rows.map(r => r.supported)).toEqual([false, true, true])
  })
})

describe('IVA executed quarters (issues/209)', () => {
  it('«IVA deduïble» is the deductible supported VAT, apart from the balance', () => {
    const [q] = c.executedVatQuarters.call({
      vat_by_quarter: {
        '2026-Q3': { year: 2026, quarter: 3, paid: 2883.91, received: 5688.88, deductible_paid: 2307.13, deductible_vat: -3381.75, deductible_vat_pct_sum: 0.8, deductible_vat_pct_n: 1 }
      }
    })
    expect(q.deductible_paid).toBe(2307.13)
    expect(q.quarterBalance).toBe(-3381.75)
  })
})
