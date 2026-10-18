// The charts of Informes › Comandes / Incidències add up the same rows as their pivots
import { describe, it, expect } from 'vitest'
import {
  orderTotals, periodMode, orderPeriods, topGroups,
  incidenceTotals, incidencePeriods, resolutionBuckets, routeRates
} from '@/domain/logisticsStats'

const order = (date, { price = 10, kilograms = 5, units = 1, delivery_type = 'Normal', route = 'R1', owner = 'A', lastmile = 'No' } = {}) =>
  ({ date, price, kilograms, units, delivery_type, route, owner, lastmile, year: date.slice(0, 4), month: date.slice(5, 7) })

const incidence = (created_at, closed_date, { state_raw = 'closed', route_name = 'R1', order_id = 1 } = {}) =>
  ({ created_at, closed_date, state_raw, route_name, order_id })

describe('logistics stats: orders', () => {
  const rows = [
    order('2026-09-01'),
    order('2026-09-01', { delivery_type: 'Refrigerada', price: 20, lastmile: 'Sí', owner: 'B' }),
    order('2026-09-15', { price: 5.5, kilograms: 2.25 })
  ]

  it('totals orders, amount, kilos and the share of refrigerated / last mile', () => {
    expect(orderTotals(rows)).toEqual({ count: 3, amount: 35.5, kilograms: 12.3, units: 3, refrigerated: 1, lastmile: 1, owners: 2, averageAmount: 11.83 })
  })

  it('picks the periods from the filters', () => {
    expect(periodMode(2026, 9)).toBe('day')
    expect(periodMode(2026, 'Tots')).toBe('month')
    expect(periodMode('Tots', 9)).toBe('year')
    expect(periodMode('Tots', 'Tots')).toBe('yearmonth')
  })

  it('splits one month into all its days, normal and refrigerated apart', () => {
    const days = orderPeriods(rows, { mode: 'day', year: 2026, month: 9 })
    expect(days).toHaveLength(30)
    expect(days[0]).toMatchObject({ label: '1', normal: 1, refrigerated: 1, total: 2 })
    expect(days[14]).toMatchObject({ label: '15', normal: 1, refrigerated: 0 })
    expect(orderPeriods(rows, { mode: 'day', year: 2026, month: 9, measure: 'amount' })[0].total).toBe(30)
  })

  it('keeps the empty months between the first and the last one', () => {
    const p = orderPeriods([order('2025-11-03'), order('2026-02-10')], { mode: 'yearmonth' })
    expect(p.map(x => x.label)).toEqual(['Nov 25', 'Des 25', 'Gen 26', 'Febr 26'])
    expect(orderPeriods(rows, { mode: 'month', year: 2026 })).toHaveLength(12)
  })

  it('folds the smallest groups into «Altres»', () => {
    const many = ['a', 'b', 'b', 'c', 'c', 'c', 'd'].map(owner => order('2026-09-01', { owner }))
    expect(topGroups(many, 'owner', { limit: 3 })).toEqual([
      { label: 'c', value: 3 },
      { label: 'b', value: 2 },
      { label: 'Altres (2)', value: 2, other: true }
    ])
  })
})

describe('logistics stats: incidences', () => {
  const rows = [
    incidence('2026-09-01', '2026-09-01'),
    incidence('2026-09-02', '2026-09-05', { route_name: 'R2', order_id: 2 }),
    incidence('2026-09-03', '2026-09-20', { order_id: 2 }),
    incidence('2026-09-04', null, { state_raw: 'open', order_id: 3 })
  ]
  // orders/infoall?_group=route
  const orders = [{ route: 'R1', count: 40 }, { route: 'R2', count: 10 }]

  it('counts open ones, the median days to close and the rate per 100 orders', () => {
    expect(incidenceTotals(rows, orders)).toMatchObject({ count: 4, open: 1, closed: 3, medianDays: 3, affected: 3, orders: 50, rate: 8 })
    expect(incidenceTotals(rows).rate).toBeNull()
  })

  it('splits the period into open and closed', () => {
    const days = incidencePeriods(rows, { mode: 'day', year: 2026, month: 9 })
    expect(days[3]).toMatchObject({ open: 1, closed: 0 })
    expect(days[0]).toMatchObject({ open: 0, closed: 1 })
  })

  it('buckets the days to close', () => {
    expect(resolutionBuckets(rows).map(b => b.value)).toEqual([1, 0, 1, 0, 1])
  })

  it('rates the routes by incidences per 100 of their orders', () => {
    expect(routeRates(rows, orders)).toEqual([
      { label: 'R2', count: 1, orders: 10, value: 10 },
      { label: 'R1', count: 3, orders: 40, value: 7.5 }
    ])
  })
})

describe('logistics stats: missing values', () => {
  it('names the rows without a value instead of «-»', () => {
    const rows = [{ route_rate: '-' }, { route_rate: null }, { route_rate: 'Girona' }]
    expect(topGroups(rows, 'route_rate', { missing: 'Sense tarifa' })).toEqual([{ label: 'Sense tarifa', value: 2 }, { label: 'Girona', value: 1 }])
  })
})

// issues/154: «En procés» (wip) incidences were counted as closed in the report
describe('logistics stats: incidences in progress (issues/154)', () => {
  const rows = [
    incidence('2026-09-01', '2026-09-02'),
    incidence('2026-09-02', null, { state_raw: 'wip' }),
    incidence('2026-09-03', null, { state_raw: 'open' })
  ]

  it('counts them as unresolved', () => {
    expect(incidenceTotals(rows)).toMatchObject({ count: 3, open: 2, closed: 1, solved: 1 })
    const days = incidencePeriods(rows, { mode: 'day', year: 2026, month: 9 })
    expect(days[1]).toMatchObject({ open: 1, closed: 0 })
  })
})
