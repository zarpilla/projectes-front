// «Dies laborables» (2026-10-25, La Diligència): nobody works on the weekend, so
// the limit of a delivery is the next-day limit of the working day before it.
// Friday's limit closes Monday (the weekend is late for Monday) and an order
// for Tuesday is on time until Monday's limit. Configuració general › Logística
// sets the working days (Monday to Friday when never set). 2026-10-23 is a Friday.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import moment from 'moment'
import 'moment/dist/locale/ca'
import { deadlineOf, isLateDelivery, isLatePickup, lateRules, lateWarnings, workingDaysOf } from '@/domain/lateOrders'
import { assignRouteDate } from '@/service/assignRouteRate'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import MeForm from '@/components/MeForm.vue'

beforeEach(() => moment.locale('ca'))
afterEach(() => vi.useRealTimers())

const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const weekdays = lateRules({ next_day_limit_hour: 14 })
const withSaturday = lateRules({ next_day_limit_hour: 14, working_days: [...WEEK, 'saturday'] })
const when = s => new Date(s)

describe('working days', () => {
  it('default to Monday–Friday and keep only valid days, in week order', () => {
    expect(workingDaysOf(null)).toEqual(WEEK)
    expect(workingDaysOf([])).toEqual(WEEK)
    expect(workingDaysOf(['sunday', 'Saturday', 'monday'])).toEqual(['monday', 'saturday', 'sunday'])
    expect(lateRules(null).workingDays).toEqual(WEEK)
  })

  it("Monday's deadline is Friday's limit, Tuesday's Monday's", () => {
    expect(deadlineOf('2026-10-26', weekdays).format('YYYY-MM-DD HH:mm')).toBe('2026-10-23 14:00')
    expect(deadlineOf('2026-10-27', weekdays).format('YYYY-MM-DD HH:mm')).toBe('2026-10-26 14:00')
    expect(deadlineOf('2026-10-26', withSaturday).format('YYYY-MM-DD HH:mm')).toBe('2026-10-24 14:00')
  })

  it('a Monday delivery is late from Friday 14 h and all weekend', () => {
    expect(isLateDelivery('2026-10-26', when('2026-10-23T13:59:00'), weekdays)).toBe(false)
    expect(isLateDelivery('2026-10-26', when('2026-10-23T14:00:00'), weekdays)).toBe(true)
    expect(isLateDelivery('2026-10-26', when('2026-10-24T09:00:00'), weekdays)).toBe(true)
    expect(isLateDelivery('2026-10-26', when('2026-10-25T20:00:00'), weekdays)).toBe(true)
  })

  it('a Tuesday delivery is on time until Monday 14 h', () => {
    expect(isLateDelivery('2026-10-27', when('2026-10-23T16:00:00'), weekdays)).toBe(false)
    expect(isLateDelivery('2026-10-27', when('2026-10-26T13:59:00'), weekdays)).toBe(false)
    expect(isLateDelivery('2026-10-27', when('2026-10-26T14:00:00'), weekdays)).toBe(true)
  })

  it('with Saturday as a working day Monday closes on Saturday 14 h', () => {
    expect(isLateDelivery('2026-10-26', when('2026-10-23T16:00:00'), withSaturday)).toBe(false)
    expect(isLateDelivery('2026-10-26', when('2026-10-24T14:00:00'), withSaturday)).toBe(true)
  })

  it('a morning pickup on Monday has the same deadline; an afternoon one only its own day', () => {
    expect(isLatePickup('2026-10-26', when('2026-10-23T14:00:00'), weekdays)).toBe(true)
    expect(isLatePickup('2026-10-26', when('2026-10-25T09:00:00'), weekdays, { afternoon: true })).toBe(false)
  })

  it('warns the member before saving a Monday order on the weekend', () => {
    const warnings = lateWarnings({ estimated_delivery_date: '2026-10-26' }, null, { next_day_limit_hour: 14 }, { now: when('2026-10-24T11:00:00') })
    expect(warnings.map(w => w.key)).toEqual(['order'])
    expect(warnings[0].text).toContain('del dia laborable anterior')
  })
})

describe('the date the form proposes', () => {
  const at = s => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(s))
  }

  it('Monday, proposed on Saturday, is late', () => {
    at('2026-10-24T10:00:00')
    const { nextDay, late, warning } = assignRouteDate({ monday: true, wednesday: true })
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-26')
    expect(late).toBe(true)
    expect(warning).toContain('Vas tard per dilluns')
  })

  it('Tuesday, proposed on Friday afternoon, is on time', () => {
    at('2026-10-23T16:00:00')
    const { nextDay, late } = assignRouteDate({ tuesday: true })
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-27')
    expect(late).toBe(false)
  })

  it('Monday on Saturday morning is on time when Saturday is a working day', () => {
    at('2026-10-24T10:00:00')
    const { late } = assignRouteDate({ monday: true }, { workingDays: [...WEEK, 'saturday'] })
    expect(late).toBe(false)
  })

  it('the office is exempt', () => {
    at('2026-10-24T10:00:00')
    expect(assignRouteDate({ monday: true }, { isAdmin: true }).late).toBe(false)
  })
})

describe('Configuració general › Dies laborables', () => {
  const computed = MeForm.computed.workingDays
  const ctx = orders_options => ({ form: { orders_options } })

  it('shows Monday to Friday when never set', () => {
    expect(computed.get.call(ctx({ id: 3 }))).toEqual(WEEK)
    expect(computed.get.call(ctx({ id: 3, working_days: ['monday'] }))).toEqual(['monday'])
  })

  it('saves the days ticked, in week order, keeping the rest of the block', () => {
    const c = ctx({ id: 3, next_day_limit_hour: 14 })
    computed.set.call(c, ['saturday', ...WEEK])
    expect(c.form.orders_options).toEqual({ id: 3, next_day_limit_hour: 14, working_days: [...WEEK, 'saturday'] })
    computed.set.call(c, [])
    expect(c.form.orders_options.working_days).toEqual([])
  })
})
