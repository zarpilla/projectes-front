// issues/337 (2026-10-24): «Trimestres executats / previstos» of «IVA» put the
// VAT payment on the 30th after Q1–Q3 and on 20 January after Q4: the model 303
// deadlines the other way round (20th of April, July, October; 30 January).
// issues/340: «Salda» was disabled when «suportat − repercutit × %» was 0 (the %
// applied to the charged VAT); it depends only on the documents ticked.
// issues/341: Informes › Projectes typed «Any inici» as a number, so Kendo
// turned the fiscal label «2026/27» into 2026.
import { describe, it, expect } from 'vitest'
import { vatPaymentDate, expectedVatQuarterRows } from '@/domain/expectedVat'
import VatTable from '@/components/VatTable.vue'
import configStatsProject from '@/service/configStatsProject'

describe('VAT payment deadlines (issues/337)', () => {
  it('are the 20th after Q1–Q3 and 30 January after Q4', () => {
    expect([1, 2, 3, 4].map(q => vatPaymentDate(2026, q).format('DD/MM/YYYY'))).toEqual([
      '20/04/2026', '20/07/2026', '20/10/2026', '30/01/2027'
    ])
  })

  it('are the dates of the executed and the expected quarters', () => {
    const byQuarter = {
      '2026-Q3': { year: 2026, quarter: 3, paid: 0, received: 21, deductible_vat: -21, deductible_paid: 0 },
      '2026-Q4': { year: 2026, quarter: 4, paid: 0, received: 21, deductible_vat: -21, deductible_paid: 0 }
    }
    const executed = VatTable.computed.executedVatQuarters.call({ vat_by_quarter: byQuarter })
    expect(executed.map(r => r.paymentDate)).toEqual(['20/10/2026', '30/01/2027'])
    expect(expectedVatQuarterRows(byQuarter, 100).map(r => r.paymentDate)).toEqual(['20/10/2026', '30/01/2027'])
  })
})

describe('«Salda» (issues/340)', () => {
  const canSettle = ctx => VatTable.computed.canSettle.call(ctx)
  it('is enabled whenever documents are ticked, whatever the balance', () => {
    // 100 supported, 100 charged at 100 %: the old rule disabled it
    const vat = { paid: 100, received: 100 }
    const me = { options: { deductible_vat_pct: 100 } }
    expect(canSettle({ vat, me, payingVat: false, checkedRows: [{ id: 1 }] })).toBe(true)
    expect(canSettle({ vat, me, payingVat: false, checkedRows: [] })).toBe(false)
    expect(canSettle({ vat, me, payingVat: true, checkedRows: [{ id: 1 }] })).toBe(false)
  })
})

describe('Informes › Projectes «Any inici» (issues/341)', () => {
  it('is a text field, so «2026/27» stays a fiscal label', () => {
    expect(configStatsProject.dataSource.schema.model.fields.project_year.type).toBe('string')
  })
})
