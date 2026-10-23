// issues/150: the next-day cutoff («hora límit») of the order form.
// - after the cutoff the form jumped to the NEXT WEEK's route day, skipping
//   later days of the current week (Mon/Wed/Fri on Tuesday afternoon → next
//   Monday instead of Friday);
// - «Ruta tancada per avui…» showed whenever today was a route day, even when
//   the next date was fine;
// - the help text said 13 h whatever the setting;
// - a refusal from the backend (the cutoff 400) only showed «Error».
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import moment from 'moment'
import 'moment/dist/locale/ca'
import { assignRouteDate } from '@/service/assignRouteRate'
import { orderSaveErrorMessage } from '@/domain/orderValidation'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'

beforeEach(() => moment.locale('ca'))
afterEach(() => vi.useRealTimers())

const at = (day, hour) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(`${day}T${hour}:00`))
}
const MWF = { monday: true, wednesday: true, friday: true }

// issues/315: past the cutoff the order is no longer moved to a later route
// day (issues/150 moved it in the same week, or to next week): it stays for
// tomorrow, late, and the warning gives the configured hour
describe('tomorrow after the cutoff (issues/150, 315)', () => {
  it('stays for tomorrow, late', () => {
    at('2026-10-06', '15:00') // Tuesday afternoon, tomorrow (Wednesday) is past the cutoff
    const { nextDay, warning, late } = assignRouteDate(MWF)
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-07')
    expect(late).toBe(true)
    expect(warning).toContain('14 h')
    expect(warning).not.toContain('setmana vinent')
  })

  it('gives the configured hour', () => {
    at('2026-10-08', '15:00') // Thursday afternoon, route on Friday only
    const { nextDay, warning } = assignRouteDate({ friday: true }, { nextDayLimitHour: 13 })
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-09')
    expect(warning).toContain('13 h')
  })

  it('does not warn that today is closed when the next route day is this week', () => {
    at('2026-10-05', '09:00') // Monday morning on a Mon/Wed/Fri route
    const { nextDay, warning } = assignRouteDate(MWF)
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-07')
    expect(warning).toBe('')
  })

  it('warns that today is closed when the order goes to the same day next week', () => {
    at('2026-10-05', '09:00') // Monday, route on Monday only
    const { nextDay, warning } = assignRouteDate({ monday: true })
    expect(nextDay.format('YYYY-MM-DD')).toBe('2026-10-12')
    expect(warning).toContain('per avui')
  })
})

describe('the hour in the help text (issues/150)', () => {
  it('comes from the setting', () => {
    const reminder = OrdersForm.computed.cutoffReminder
    expect(reminder.call({ nextDayLimitHour: 14 })).toContain('a les 14 h del dia abans')
    expect(reminder.call({ nextDayLimitHour: 12 })).toContain('a les 12 h del dia abans')
  })
})

describe('backend refusals (issues/150)', () => {
  it("shows the backend's message", () => {
    const err = { response: { data: { error: { status: 400, message: "No es pot crear la comanda: s'ha superat l'hora límit (14h) per a entregues del dia següent." } } } }
    expect(orderSaveErrorMessage(err)).toContain("s'ha superat l'hora límit (14h)")
  })

  it('falls back to a generic message', () => {
    expect(orderSaveErrorMessage(new Error('Network Error'))).toBe("No s'ha pogut desar la comanda")
  })
})
