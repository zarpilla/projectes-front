// issues/204: in the Panell de projectes pivot «Despeses reals» carried the hours'
// cost and «Despeses previstes» didn't, so «Despeses/hora real» counted the hours
// twice and «Preu/hora real» subtracted them while «Preu/hora previst» didn't.
// Both «Despeses» are now without the hours (they're in «Hores … €»).
import { describe, it, expect } from 'vitest'
import config from '@/service/configStatsProject'
import { projectStatsRow } from '@/domain/projectPivotRows'

const measures = config.dataSource.schema.cube.measures
const total = (name, items) => {
  const m = measures[name]
  if (!m.result) return items.reduce((s, i) => s + i[m.field], 0)
  const state = {}
  items.forEach(dataItem => m.aggregate(0, state, { dataItem }))
  return m.result(state)
}

// the same figures as forecast and as real: 10 h, 1000 € in, 200 € out, hours 300 €
const project = {
  name: 'P',
  start_date: '2026-01-15',
  activities: [{ hours: 4 }, { hours: 6 }],
  total_estimated_hours: 10,
  total_incomes: 1000,
  total_expenses: 200,
  total_estimated_hours_price: 300,
  incomes_expenses: 500,
  total_real_incomes: 1000,
  total_real_expenses: 200,
  total_real_hours_price: 300,
  total_real_incomes_expenses: 500
}

describe('Panell de projectes measures (issues/204)', () => {
  const rows = [projectStatsRow(project, 1)]
  const pairs = [
    ['Despeses previstes', 'Despeses reals', 200],
    ['Preu/hora previst', 'Preu/hora real', 80],
    ['Despeses/hora previst', 'Despeses/hora real', 50],
    ['Resultat previst', 'Resultat real', 500]
  ]
  for (const [planned, real, value] of pairs) {
    it(`«${real}» is built like «${planned}»`, () => {
      expect(total(planned, rows)).toBe(value)
      expect(total(real, rows)).toBe(value)
    })
  }
})
