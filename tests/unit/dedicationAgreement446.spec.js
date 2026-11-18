// issues/446: Informes › Dedicació shows, per person, the working hours of the
// year (her jornada at Persones minus holidays, vacations and free days) against
// the agreement, the same figures as «Resum hores», computed for everyone from a
// few bulk requests (no request per person).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { agreementYear, agreementYearByPerson } from '@/domain/agreementHours'

// 2025: 261 weekdays; 01/01 (Wednesday) is a holiday for everyone
const vacances = { id: 1, name: 'Vacances', max: 22 }
const year = { year: 2025, working_hours: 1720 }
const periods = [
  { id: 1, from: '2025-01-01', to: '2025-12-31', hours: 8, hoursperday: null, users_permissions_user: { id: 1 } },
  { id: 2, from: '2025-01-01', to: '2025-12-31', hours: 8, hoursperday: null, users_permissions_user: { id: 2 } },
  // a jornada of another year only: not listed
  { id: 3, from: '2024-01-01', to: '2024-12-31', hours: 8, hoursperday: null, users_permissions_user: { id: 3 } }
]
const festives = [
  { id: 1, date: '2025-01-01', festive_type: { id: 9, name: 'Festiu' }, users_permissions_user: null },
  { id: 2, date: '2025-08-04', festive_type: vacances, users_permissions_user: { id: 1 } },
  { id: 3, date: '2025-08-05', festive_type: vacances, users_permissions_user: { id: 1 } }
]
// person 2 has 25 vacation days, any year
const userFestives = [{ id: 1, max: 25, festive_type: vacances, year: null, users_permissions_user: { id: 2 } }]
const festiveTypes = [vacances]

describe('agreement hours per person (issues/446)', () => {
  const byPerson = agreementYearByPerson({ year: 2025, periods, festives, festiveTypes, userFestives, workingHours: 1720, today: '2025-12-31' })

  it('lists who has a jornada in the year', () => {
    expect([...byPerson.keys()]).toEqual([1, 2])
  })

  it('takes off her holidays and the vacation days still to spend', () => {
    const p1 = byPerson.get(1)
    // 261 − 1 holiday − 2 vacation days, then 20 days still to spend
    expect(p1.calc.baseDays).toBe(258)
    expect(p1.laborable.hours).toBe(258 * 8 - 20 * 8)
    expect(p1.agreement.hours).toBe(1720)
    expect(p1.balance.hours).toBe(258 * 8 - 160 - 1720)
  })

  it("another person's vacations don't count, her own maximum does", () => {
    const p2 = byPerson.get(2)
    expect(p2.calc.baseDays).toBe(260)
    expect(p2.summary.Vacances.max).toBe(25)
    expect(p2.laborable.hours).toBe(260 * 8 - 25 * 8)
  })

  it('gives the same as agreementYear with only her data', () => {
    const alone = agreementYear({
      year: 2025,
      periods: [periods[0]],
      festives: [festives[0], festives[1], festives[2]],
      festiveTypes,
      maxes: [],
      workingHours: 1720,
      today: '2025-12-31'
    })
    expect(byPerson.get(1)).toEqual(alone)
  })
})

const get = vi.fn(async url => {
  if (url.startsWith('years')) return { data: [year] }
  if (url.startsWith('festive-types')) return { data: festiveTypes }
  if (url.startsWith('festives')) return { data: festives }
  if (url.startsWith('daily-dedications')) {
    const own = url.match(/users_permissions_user\.id\]=(\d+)/)
    return { data: own ? periods.filter(p => p.users_permissions_user.id === Number(own[1])) : periods }
  }
  // «Resum hores» asks for her own maximums; the table, for everyone's
  if (url.startsWith('user-festives')) {
    const own = url.match(/users_permissions_user\.id\]=(\d+)/)
    return { data: own ? userFestives.filter(f => f.users_permissions_user.id === Number(own[1])) : url.includes('users_permissions_user_null') ? [] : userFestives }
  }
  if (url.startsWith('activities/total-by-day')) return { data: [] }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DedicationAgreement from '@/components/DedicationAgreement.vue'
import DedicationSummary from '@/components/DedicationSummary.vue'

const users = [{ id: 1, username: 'anna' }, { id: 2, username: 'biel' }, { id: 4, username: 'carla' }]
const rows = [
  { username: 'anna', hours: 100, estimated_hours: 0 },
  { username: 'anna', hours: 0, estimated_hours: 300 },
  { username: 'carla', hours: 12, estimated_hours: 0 }
]
const mountTable = (props = {}) => mount(DedicationAgreement, {
  props: { year: 2025, person: 0, users, rows, ...props },
  global: { plugins: [Buefy], stubs: { 'router-link': true } }
})

describe('Dedicació › Jornada i conveni per persona (issues/446)', () => {
  beforeEach(() => { get.mockClear() })

  it('loads everyone with five requests and lists each person', async () => {
    const w = mountTable()
    await flushPromises()
    expect(get).toHaveBeenCalledTimes(5)
    const list = w.vm.sorted
    expect(list.map(p => p.name)).toEqual(['anna', 'biel', 'carla'])
    expect(list[0]).toMatchObject({ laborable: 1904, agreement: 1720, worked: 100, planned: 300 })
    // carla has hours but no jornada in 2025
    expect(list[2].hasJornada).toBe(false)
    expect(w.text()).toContain('Sense jornada')
  })

  it("doesn't reload when only the pivot rows change (project / state filters)", async () => {
    const w = mountTable()
    await flushPromises()
    get.mockClear()
    await w.setProps({ rows: rows.slice(0, 1) })
    await flushPromises()
    expect(get).not.toHaveBeenCalled()
    expect(w.vm.sorted[0].planned).toBe(0)
  })

  it('reloads only her jornada when a person is picked', async () => {
    const w = mountTable()
    await flushPromises()
    get.mockClear()
    await w.setProps({ person: 2 })
    await flushPromises()
    expect(get.mock.calls.some(([url]) => url.startsWith('daily-dedications') && url.includes('users_permissions_user.id]=2'))).toBe(true)
    expect(w.vm.sorted.map(p => p.name)).toEqual(['biel'])
  })

  it('gives the same figures as «Resum hores»', async () => {
    const w = mountTable()
    await flushPromises()
    const s = mount(DedicationSummary, {
      props: { user: 1, year: 2025 },
      global: { plugins: [Buefy], stubs: { 'b-icon': true, 'router-link': true } }
    })
    await flushPromises()
    await flushPromises()
    const anna = w.vm.sorted[0]
    expect(Number(s.vm.summary.Laborables.hours)).toBeCloseTo(anna.laborable, 2)
    expect(Number(s.vm.summary['Màxim Conveni'].hours)).toBeCloseTo(anna.agreement, 2)
  })
})
