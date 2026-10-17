// issues/060: in Ingressos/Despeses «Despeses X» and «Despeses tot X» added up
// the same (both with the hours' cost). «Despeses» is now without the hours.
import { describe, it, expect } from 'vitest'
import config from '@/service/configStatsEconomicDetail'

const measures = config.dataSource.schema.cube.measures
const total = (name, items) => {
  const state = {}
  items.forEach(dataItem => measures[name].aggregate(0, state, { dataItem }))
  return measures[name].result(state)
}

describe('Ingressos/Despeses measures (issues/060)', () => {
  const items = [{
    expense_orig: -10, expense_orig_vat: -2, total_original_hours_price: -50,
    expense_esti: -10, expense_esti_vat: -2, total_estimated_hours_price: -50,
    expense_real: -10, expense_real_vat: -2, total_real_hours_price: -50
  }]
  for (const kind of ['orig', 'prev', 'exec']) {
    it(`«Despeses ${kind}» leaves the hours to «Despeses tot ${kind}»`, () => {
      expect(total(`Despeses ${kind}`, items)).toBe(-12)
      expect(total(`Despeses tot ${kind}`, items)).toBe(-62)
    })
  }
})
