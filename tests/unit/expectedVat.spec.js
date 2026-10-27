// «IVA previst» deducts each quarter's year % (set by the API), Configuració's
// only as fallback — it used Configuració's always (issues/221).
import { describe, it, expect } from 'vitest'
import { expectedVatQuarterRows, expectedVatTotals, quarterDeductiblePct } from '@/domain/expectedVat'

// 2026 at 77 % (its year row), 2027 without a row → the API sends Configuració's 79
const byQuarter = {
  '2026-Q4': { year: 2026, quarter: 4, paid: 1000, received: 500, deductible_vat_pct: 77 },
  '2027-Q1': { year: 2027, quarter: 1, paid: 1000, received: 900, deductible_vat_pct: 79 }
}

describe('expected VAT (issues/221)', () => {
  it("uses the quarter's %, Configuració's when the API sends none", () => {
    expect(quarterDeductiblePct({ deductible_vat_pct: 77 }, 79)).toBe(77)
    expect(quarterDeductiblePct({ deductible_vat_pct: 0 }, 79)).toBe(0)
    expect(quarterDeductiblePct({}, 79)).toBe(79)
  })

  it("deducts each quarter's year % in the quarter rows", () => {
    const rows = expectedVatQuarterRows(byQuarter, 79)
    expect(rows.map(r => [r.year, r.quarter, r.deductible_pct, r.deductible_paid])).toEqual([
      [2026, 4, 77, 770],
      [2027, 1, 79, 790]
    ])
    expect(rows[0].quarterBalance).toBe(270)
    expect(rows[0].willCreateEntry).toBe(false)
    expect(rows[1].quarterBalance).toBeCloseTo(-110, 6)
    expect(rows[1].cumulativeBalance).toBeCloseTo(160, 6)
    expect(rows[0].paymentDate).toBe('30/01/2027') // Q4: 30 January (issues/337)
  })

  it('sums the deductible VAT per year in the «Previst» totals', () => {
    const totals = expectedVatTotals({ paid: 2000, received: 1400 }, byQuarter, 79)
    expect(totals.deductiblePaid).toBe(1560)
    expect(totals.deductiblePct).toBeCloseTo(78, 6)
    expect(totals.balance).toBe(160)
  })

  it("shows the year's % when every quarter shares it", () => {
    const one = { '2026-Q4': byQuarter['2026-Q4'] }
    const totals = expectedVatTotals({ paid: 1000, received: 500 }, one, 79)
    expect(totals.deductiblePct).toBe(77)
    expect(totals.balance).toBe(270)
  })
})
