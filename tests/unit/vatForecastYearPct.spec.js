// issues/221: the IVA page's «Previst» row and «Trimestres previstos» deducted
// Configuració's «% IVA deduïble» (79) even when the year had its own (77),
// unlike executed VAT and Previsió econòmica. Each quarter now deducts the %
// the API sets on it (its year's, Configuració's only as fallback).
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import VatTable from '@/components/VatTable.vue'

const c = VatTable.computed

const ctx = () => ({
  me: { options: { deductible_vat_pct: 79 } },
  vat_expected: { paid: 2000, received: 1400 },
  vat_expected_by_quarter: {
    '2026-Q4': { year: 2026, quarter: 4, paid: 1000, received: 500, deductible_vat_pct: 77 },
    '2027-Q1': { year: 2027, quarter: 1, paid: 1000, received: 900, deductible_vat_pct: 79 }
  }
})

describe("VAT forecast uses the year's deductible % (issues/221)", () => {
  it("deducts each quarter's year % in «Trimestres previstos»", () => {
    const rows = c.expectedVatQuarters.call(ctx())
    expect(rows.map(r => [r.year, r.deductible_pct, r.deductible_paid, r.quarterBalance])).toEqual([
      [2026, 77, 770, 270],
      [2027, 79, 790, -110]
    ])
  })

  it('sums the deductible VAT per year in the «Previst» row', () => {
    const vm = ctx()
    vm.hasDeductible = c.hasDeductible.call(vm)
    vm.expectedTotals = c.expectedTotals.call(vm)
    expect(vm.expectedTotals.deductiblePct).toBeCloseTo(78, 6)
    expect(c.expectedBalance.call(vm)).toBe(160) // −(1400 − 770 − 790)
  })

  it("falls back to Configuració's % when the API sends none", () => {
    const vm = ctx()
    delete vm.vat_expected_by_quarter['2026-Q4'].deductible_vat_pct
    expect(c.expectedVatQuarters.call(vm)[0].deductible_paid).toBe(790)
  })
})
