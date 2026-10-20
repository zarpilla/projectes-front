// issues/254: Ingressos/Despeses «Exporta totals» left the non-deductible VAT
// out of Resultat and the total expenses: ACTGI 24-27 2026 exported
// Resultat exec −36.282,58 against −36.294,03 on screen and in the fitxa.
import { describe, it, expect } from 'vitest'
import { economicDetailTotals } from '@/domain/economicDetailTotals'
import configPivot from '@/service/configStatsEconomicDetail'
import EconomicDetailPivot from '@/components/EconomicDetailPivot.vue'

const rows = [
  { income_real: 1000, expense_real: -400, expense_real_vat: -11.45, total_real_hours_price: -300,
    income_orig: 500, expense_orig: -100, expense_orig_vat: -19.82, total_original_hours_price: -50,
    income_esti: 0, expense_esti: -10, expense_esti_vat: -2.1, total_estimated_hours_price: 0, total_real_hours: 12 },
  { income_real: 200, expense_real: 0, total_real_hours_price: -20 }
]

// what the pivot shows: the measure's aggregate over the rows
const measure = name => {
  const m = configPivot.dataSource.schema.cube.measures[name]
  const state = {}
  rows.forEach(r => m.aggregate(null, state, { dataItem: r }))
  return m.result(state)
}

describe('Ingressos/Despeses export totals (issues/254)', () => {
  it('add up like the pivot: hours and non-deductible VAT in the expenses', () => {
    const t = economicDetailTotals(rows)
    expect(t.real).toBeCloseTo(1200 - 400 - 11.45 - 320, 10)
    expect(t.real).toBeCloseTo(measure('Resultat exec'), 10)
    expect(t.total_expense_real).toBeCloseTo(measure('Despeses tot exec'), 10)
    expect(t.orig).toBeCloseTo(500 - 100 - 19.82 - 50, 10)
    expect(t.total_expense_esti).toBeCloseTo(-12.1, 10)
    expect(t.real).toBeCloseTo(t.income_real + t.total_expense_real, 10)
    expect(t.total_expense_real).toBeCloseTo(t.expense_real + t.expense_real_vat + t.total_real_hours_price, 10)
    expect(t.total_real_hours).toBe(12)
  })

  it('are what «Exporta totals» and «per any» write', () => {
    const pivotData = rows.map(r => ({ ...r, id: 7, year: '2026', project_name: 'ACTGI 24-27' }))
    const [byProject] = EconomicDetailPivot.computed.pivotDataGroupped.call({ pivotData })
    const [byYear] = EconomicDetailPivot.computed.pivotDataYearGroupped.call({ pivotData })
    for (const row of [byProject, byYear]) {
      expect(row.real).toBeCloseTo(measure('Resultat exec'), 10)
      expect(row.orig).toBeCloseTo(measure('Resultat orig'), 10)
      expect(row.total_expense_esti).toBeCloseTo(measure('Despeses tot prev'), 10)
    }
    expect(byYear.year).toBe('2026')
  })
})
