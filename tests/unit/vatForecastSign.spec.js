// issues/072: in the IVA page the executed quarters showed VAT to pay as a
// negative balance and the forecast ones as a positive one. Both are negative
// now; forecast lines dated before the current quarter are only listed apart.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import VatTable from '@/components/VatTable.vue'

const c = VatTable.computed

describe('VAT forecast (issues/072)', () => {
  it('shows VAT to pay as a negative balance, like the executed one', () => {
    const rows = c.expectedVatQuarters.call({
      me: { options: { deductible_vat_pct: 100 } },
      vat_expected_by_quarter: {
        '2026-Q4': { year: 2026, quarter: 4, paid: 0, received: 21 },
        '2027-Q1': { year: 2027, quarter: 1, paid: 30, received: 0 },
        '2027-Q2': { year: 2027, quarter: 2, paid: 0, received: 10 }
      }
    })
    expect(rows.map(r => [r.quarterBalance, r.cumulativeBalance, r.willCreateEntry, r.paymentAmount])).toEqual([
      [-21, -21, true, -21],
      [30, 30, false, 0], // credit carried forward
      [-10, 20, false, 0]
    ])
  })

  it('lists the outdated lines apart from the forecast documents', () => {
    const ctx = { vat_expected: { documents: [{ id: 1, date: '2026-11-02', type: 'phase-income' }, { id: 2, date: '2001-05-01', type: 'phase-expense', outdated: true }] } }
    expect(c.outdatedExpectedDocuments.call(ctx).map(d => d.id)).toEqual([2])
    expect(c.expectedDocumentsWithSearchableFields.call(ctx).map(d => d.id)).toEqual([1])
  })
})
