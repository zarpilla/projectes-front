import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import moment from 'moment'
import 'moment/dist/locale/ca'
import {
  assignRouteRate,
  assignRouteDate,
  checkIfDateIsValidInroute,
  calculateRoutePrice
} from '@/service/assignRouteRate'

// The app switches moment to Catalan globally (weeks start on Monday there);
// these helpers must behave the same regardless.
beforeEach(() => moment.locale('ca'))

const ROUTES = {
  monday: { monday: true },
  tuesday: { tuesday: true },
  wednesday: { wednesday: true },
  thursday: { thursday: true },
  friday: { friday: true },
  saturday: { saturday: true },
  sunday: { sunday: true },
  mondayThursday: { monday: true, thursday: true },
  tuesdayFriday: { tuesday: true, friday: true },
  weekdays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true },
  weekend: { saturday: true, sunday: true },
  everyDay: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
}

// Mon 5 Oct 2026 .. Sun 11 Oct 2026, plus the turn of a month and of a year
const DAYS = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-30', '2026-12-31']
const HOURS = ['09:00', '13:59', '14:00', '20:30']

const warningCode = w => !w ? '' : w.includes('per avui') ? 'TODAY' : w.includes('per demà') ? 'TOMORROW' : 'OTHER'
const fmt = d => `${d.format('YYYY-MM-DD')} (day ${d.day()})`

describe('assignRouteDate', () => {
  afterEach(() => vi.useRealTimers())

  const at = (day, hour) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${day}T${hour}:00`))
  }

  it('matches the recorded results for every day, hour, route and role', () => {
    const results = {}
    for (const day of DAYS) {
      for (const hour of HOURS) {
        at(day, hour)
        for (const [name, route] of Object.entries(ROUTES)) {
          for (const isAdmin of [false, true]) {
            const { nextDay, warning } = assignRouteDate(route, { isAdmin })
            results[`${day} ${hour} ${name}${isAdmin ? ' admin' : ''}`] = `${fmt(nextDay)} ${warningCode(warning)}`
          }
        }
        vi.useRealTimers()
      }
    }
    expect(results).toMatchSnapshot()
  })

  it('honours a custom next-day cutoff hour', () => {
    const results = {}
    for (const hour of ['11:59', '12:00']) {
      at('2026-10-07', hour) // Wednesday
      const { nextDay, warning } = assignRouteDate(ROUTES.thursday, { nextDayLimitHour: 12 })
      results[hour] = `${fmt(nextDay)} ${warningCode(warning)}`
      vi.useRealTimers()
    }
    expect(results).toEqual({
      '11:59': '2026-10-08 (day 4) ',
      '12:00': '2026-10-15 (day 4) TOMORROW'
    })
  })

  it('moves an order for tomorrow past the cutoff to the next week (Sunday-based week, as dayjs)', () => {
    at('2026-10-07', '15:00') // Wednesday after 14:00, route on Thursday
    const { nextDay, warning } = assignRouteDate(ROUTES.thursday)
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-15')
    expect(warningCode(warning)).toBe('TOMORROW')
  })

  it('lets admins keep tomorrow after the cutoff', () => {
    at('2026-10-07', '15:00')
    const { nextDay, warning } = assignRouteDate(ROUTES.thursday, { isAdmin: true })
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-08')
    expect(warning).toBe('')
  })

  it('warns that today is closed and picks the next route day', () => {
    at('2026-10-05', '09:00') // Monday, route on Monday
    const { nextDay, warning } = assignRouteDate(ROUTES.monday)
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-12')
    expect(warningCode(warning)).toBe('TODAY')
  })

  it('returns a date object the order form can call toDate() and format() on', () => {
    at('2026-10-07', '09:00')
    const { nextDay } = assignRouteDate(ROUTES.friday)
    expect(nextDay.toDate()).toBeInstanceOf(Date)
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-09')
  })
})

describe('checkIfDateIsValidInroute', () => {
  const festives = [{ date: '2026-10-12' }]

  it('accepts route days and rejects other days and festives', () => {
    const route = ROUTES.mondayThursday
    expect(checkIfDateIsValidInroute(route, moment('2026-10-05'), festives)).toBe(true) // Mon
    expect(checkIfDateIsValidInroute(route, moment('2026-10-08'), festives)).toBe(true) // Thu
    expect(checkIfDateIsValidInroute(route, moment('2026-10-06'), festives)).toBe(false) // Tue
    expect(checkIfDateIsValidInroute(route, moment('2026-10-12'), festives)).toBe(false) // festive Monday
  })

  it('never accepts a Sunday (existing behaviour: Sunday is pushed as 7, day() returns 0)', () => {
    expect(checkIfDateIsValidInroute(ROUTES.sunday, moment('2026-10-11'), [])).toBe(false)
  })
})

describe('calculateRoutePrice', () => {
  const v1 = { ratev2: false, less15: 5, less30: 8, additional30: 0.2 }
  const v2 = {
    ratev2: true, less10: 4, more10: 5, from10to20: 7, from20to30: 9,
    from30to40: 11, from40to50: 13, from50to60: 15, additional60: 0.25, pickup_point: 1.5
  }

  it('prices v1 rates by weight band', () => {
    expect(calculateRoutePrice(v1, 10)).toBe(5)
    expect(calculateRoutePrice(v1, 20)).toBe(8)
    expect(calculateRoutePrice(v1, 40)).toBeCloseTo(10)
  })

  it('interpolates v2 rates and adds pickup lines', () => {
    expect(calculateRoutePrice(v2, 5, 0)).toBe(4)
    expect(calculateRoutePrice(v2, 15, 0)).toBeCloseTo(6)
    expect(calculateRoutePrice(v2, 25, 0)).toBeCloseTo(8)
    expect(calculateRoutePrice(v2, 70, 0)).toBeCloseTo(17.5)
    expect(calculateRoutePrice(v2, 25, 2)).toBeCloseTo(11)
  })

  it('is 0 without a rate', () => {
    expect(calculateRoutePrice(null, 25, 0)).toBe(0)
  })
})

describe('assignRouteRate', () => {
  const rates = [
    { id: 1, routes: [{ id: 10 }], pickup: { id: 1 }, delivery_type: { id: 1 } },
    { id: 2, routes: [{ id: 10 }], pickup: { id: 2 }, delivery_type: { id: 1 } },
    { id: 3, routes: [], pickup: null, delivery_type: null }
  ]

  it('picks the route-specific rate for a normal pickup', () => {
    const form = { route: 10, pickup: 1, delivery_type: 1, owner: 5, route_rate: null, status: 'pending' }
    expect(assignRouteRate(form, rates, []).id).toBe(1)
  })

  it('uses the farm pickup rate when there are no pending farm orders', () => {
    const form = { id: 99, route: 10, pickup: 2, delivery_type: 1, owner: 5, route_rate: null, status: 'pending' }
    expect(assignRouteRate(form, rates, []).id).toBe(2)
  })

  it('drops the farm pickup rate when the owner already has a pending farm order', () => {
    const form = { id: 99, route: 10, pickup: 2, delivery_type: 1, owner: 5, route_rate: null, status: 'pending' }
    const orders = [{ id: 1, pickup: { id: 2 }, status: 'pending', route: { id: 10 }, owner: { id: 5 } }]
    expect(assignRouteRate(form, rates, orders).id).toBe(1)
  })

  it('keeps the rate of an invoiced order', () => {
    const form = { route: 10, pickup: 1, delivery_type: 1, route_rate: rates[2], status: 'invoiced' }
    expect(assignRouteRate(form, rates, []).id).toBe(3)
  })
})
