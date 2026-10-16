// "Rutes i dies": the days each route runs, closed days, holidays and orders
import { describe, it, expect } from 'vitest'
import { weekStart, weeksFrom, routeDatesInWeek, dayCell, countOrders, openOnHolidays } from '@/domain/routeDays.js'

const monday = { id: 1, name: 'DLL', monday: true }
const tueThu = { id: 2, name: 'DT/DJ', tuesday: true, thursday: true }

describe('routeDays', () => {
  it('starts the weeks on Monday', () => {
    expect(weekStart('2026-10-17')).toBe('2026-10-12')
    expect(weekStart('2026-10-12', 1)).toBe('2026-10-19')
    expect(weeksFrom('2026-10-05', 3)).toEqual([
      { start: '2026-10-05', number: 41 },
      { start: '2026-10-12', number: 42 },
      { start: '2026-10-19', number: 43 }
    ])
  })

  it('lists the days a route runs in a week', () => {
    expect(routeDatesInWeek(monday, '2026-10-12')).toEqual(['2026-10-12'])
    expect(routeDatesInWeek(tueThu, '2026-10-12')).toEqual(['2026-10-13', '2026-10-15'])
  })

  it('tells closed days, holidays, past days and the orders of a cell', () => {
    const closures = [{ id: 9, route: { id: 1 }, date: '2026-10-12' }]
    const counts = countOrders([
      { route: { id: 1 }, estimated_delivery_date: '2026-10-12', status: 'pending' },
      { route: 1, estimated_delivery_date: '2026-10-12', status: 'processed' },
      { route: { id: 1 }, estimated_delivery_date: '2026-10-12', status: 'cancelled' }
    ])
    const cell = dayCell({ route: monday, date: '2026-10-12', closures, holidays: ['2026-10-12'], orderCounts: counts, today: '2026-10-17' })
    expect(cell).toMatchObject({ open: false, holiday: true, past: true, orders: 2 })
    expect(cell.closure.id).toBe(9)
    expect(dayCell({ route: monday, date: '2026-10-19', closures, holidays: [], orderCounts: counts, today: '2026-10-17' }))
      .toMatchObject({ open: true, holiday: false, past: false, orders: 0 })
  })

  it('warns about holidays with routes still open', () => {
    const counts = { '1:2026-10-12': 2 }
    const open = openOnHolidays({ routes: [monday, tueThu], holidays: ['2026-10-12', '2026-12-25'], closures: [], orderCounts: counts, from: '2026-10-05', to: '2026-11-01' })
    expect(open).toEqual([{ date: '2026-10-12', routes: [monday], orders: 2 }])
    // once closed, no warning
    expect(openOnHolidays({ routes: [monday], holidays: ['2026-10-12'], closures: [{ route: 1, date: '2026-10-12' }], orderCounts: counts, from: '2026-10-05', to: '2026-11-01' })).toEqual([])
  })
})
