// issues/354, 355: a route closed for a holiday runs another day on a
// substitute route («DJ - Alt Empordà / Festiu 23 octubre» on the 22nd). The
// office closes it by hand in «Rutes i dies» with a reason and the substitute;
// the members can choose it for the towns of the closed route from 10 days
// before; they land on «Avisos», which lists the closures and holidays.
import { describe, it, expect } from 'vitest'
import moment from 'moment'
import {
  townSubstitutes, isSubstituteDay, substituteOpen, closureNotice, closureText, boardDays, SUBSTITUTE_DAYS_BEFORE
} from '@/domain/routeClosures'
import { landingFor, isMemberOnly, BOARD_PATH } from '@/domain/home'

const DV = { id: 5, name: 'DV - Alt Empordà', friday: true }
const DJ = { id: 9, name: 'DJ - Alt Empordà / Festiu 23 octubre' }
const cityRoutes = [{ city: { id: 1 }, route: { id: 5 } }, { city: { id: 2 }, route: { id: 7 } }]
const closure = { id: 3, route: DV, date: '2026-10-23', reason: 'Festiu local', substitute_route: DJ, substitute_date: '2026-10-22' }

describe('substitute routes (issues/355)', () => {
  it('a town of the closed route gets the substitute, from 10 days before (the office always)', () => {
    const at = d => townSubstitutes({ cityId: 1, cityRoutes, closures: [closure], today: moment(d) })
    expect(SUBSTITUTE_DAYS_BEFORE).toBe(10)
    expect(at('2026-10-11')).toEqual([])
    const [s] = at('2026-10-12')
    expect(s).toMatchObject({ id: 9, substitute: { date: '2026-10-22', closedDate: '2026-10-23', reason: 'Festiu local' } })
    expect(at('2026-10-23')).toEqual([]) // its day has passed
    expect(townSubstitutes({ cityId: 1, cityRoutes, closures: [closure], today: moment('2026-10-01'), exempt: true })).toHaveLength(1)
    // another town, or a route the town already has, gets nothing
    expect(townSubstitutes({ cityId: 2, cityRoutes, closures: [closure], today: moment('2026-10-20') })).toEqual([])
    expect(townSubstitutes({ cityId: 1, cityRoutes, closures: [closure], today: moment('2026-10-20'), known: [9] })).toEqual([])
  })

  it('the substitute day is a valid date of the substitute route', () => {
    expect(isSubstituteDay(DJ, '2026-10-22', [closure])).toBe(true)
    expect(isSubstituteDay(DJ, new Date(2026, 9, 22), [closure])).toBe(true)
    expect(isSubstituteDay(DJ, '2026-10-23', [closure])).toBe(false)
    expect(isSubstituteDay(DV, '2026-10-22', [closure])).toBe(false)
    expect(substituteOpen('2026-10-22', moment('2026-10-12'))).toBe(true)
  })

  it('choosing the closed route tells why and where to go', () => {
    expect(closureNotice(DV, [closure], { from: moment('2026-10-20'), until: '2026-10-30' })).toBe(closure)
    expect(closureNotice(DV, [{ ...closure, reason: null, substitute_route: null }], { from: moment('2026-10-20') })).toBeNull()
    expect(closureText(closure)).toBe('DV - Alt Empordà no passa divendres 23/10 (Festiu local). Ruta alternativa: DJ - Alt Empordà / Festiu 23 octubre, dijous 22/10.')
  })
})

describe('«Avisos» (issues/354)', () => {
  it('lists the coming days with a holiday or a closure, in order', () => {
    const days = boardDays({ closures: [closure], holidays: ['2026-10-23', '2026-11-01', '2027-01-06'], today: moment('2026-10-20'), days: 30 })
    expect(days.map(d => [d.date, d.holiday, d.closures.length])).toEqual([['2026-10-23', true, 1], ['2026-11-01', true, 0]])
  })

  it('a member lands there; the staff keep their page', () => {
    expect(isMemberOnly(['orders'])).toBe(true)
    expect(isMemberOnly(['orders', 'hours'])).toBe(true)
    expect(isMemberOnly(['orders', 'orders_admin'])).toBe(false)
    expect(isMemberOnly(['projects'])).toBe(false)
    expect(landingFor({ pins: [], landing: 'usual' }, ['orders'])).toBe(BOARD_PATH)
    expect(landingFor(null, ['orders_admin'])).toBe('/inici')
  })
})
