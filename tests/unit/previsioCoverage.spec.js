// issues/074: the last row of Previsió econòmica divided the treasury's
// collections by its payments (13.973,43 %) under the forecast rows. It is
// now the forecast incomes over the forecast expenses.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import PrevisioTable from '@/components/PrevisioTable.vue'

describe('Previsió econòmica coverage row (issues/074)', () => {
  it('uses the forecast, not the treasury', () => {
    const ctx = {
      yearlyForecast: [{ year: '2026', month: '00', forecast_incomes: 100, forecast_expenses: -50, forecast_amount: 50, total_incomes: 1000, total_expenses: -10 }],
      forecastByYear: {},
      forecastPayrollsByYear: {}
    }
    const [row] = PrevisioTable.computed.yearRows.call(ctx)
    expect(row.coverage).toBe(200)
  })

  it('has no ratio without forecast expenses', () => {
    const ctx = { yearlyForecast: [{ year: '2027', forecast_incomes: 10, forecast_expenses: 0 }], forecastByYear: {}, forecastPayrollsByYear: {} }
    expect(PrevisioTable.computed.yearRows.call(ctx)[0].coverage).toBeNull()
  })
})
