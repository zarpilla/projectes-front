// issues/238: only Saldo d'hores followed a period's weekly distribution
// («Distribució setmanal», hoursperday). With Quim's 3,6 h/dia period set to
// 4,4,4,3,3,0,0, Bestretes expected 75,60 h for October 2026 and Hores anuals
// added the flat 3,6 h a weekday; Saldo and Registre jornades expected 74 h.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { periodHours, expectedHours } from '@/domain/workdayLog.js'

const PERIOD = { from: '2026-01-01', to: '2026-12-31', hours: 3.6, hoursperday: '4,4,4,3,3,0,0', costByHour: 10, monthly_salary: 1000 }
const FESTIVE = { date: '2026-10-12', users_permissions_user: null, festive_type: { name: 'Festiu Estatal' } }

const get = vi.fn(async url => {
  if (url.startsWith('daily-dedications')) return { data: [PERIOD] }
  if (url.startsWith('festives')) return { data: [FESTIVE] }
  if (url.startsWith('years')) return { data: [{ year: 2026, working_hours: 1700 }] }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DedicationSalary from '@/components/DedicationSalary.vue'

const october = () => {
  const days = []
  for (let d = 1; d <= 31; d++) days.push(`2026-10-${String(d).padStart(2, '0')}`)
  return days
}

describe('weekly distribution (issues/238)', () => {
  it('periodHours follows the distribution, Monday first, weekends included', () => {
    expect(periodHours(PERIOD, '2026-10-19')).toBe(4)
    expect(periodHours(PERIOD, '2026-10-22')).toBe(3)
    expect(periodHours({ ...PERIOD, hoursperday: '0,0,0,0,0,5,0' }, '2026-10-24')).toBe(5)
    expect(periodHours({ ...PERIOD, hoursperday: null }, '2026-10-22')).toBe(3.6)
    expect(periodHours({ ...PERIOD, hoursperday: null }, '2026-10-24')).toBe(0)
    expect(periodHours(null, '2026-10-22')).toBe(0)
  })

  it('Registre jornades expects 74 h in October', () => {
    expect(october().reduce((acc, d) => acc + expectedHours(d, [PERIOD], [FESTIVE]), 0)).toBe(74)
  })

  it('Bestretes expects the same 74 h in October', async () => {
    const w = mount(DedicationSalary, {
      props: { user: 5, year: 2026 },
      global: { stubs: { 'b-loading': true, 'b-button': true, 'b-icon': true, 'router-link': { template: '<a><slot /></a>' } } }
    })
    await flushPromises()
    await flushPromises()
    expect(w.vm.months['10'].theoricHours).toBe(74)
    // the Mondays to Wednesdays and Thursdays/Fridays with hours, the 12th aside
    expect(w.vm.months['10'].theoricDays).toBe(21)
  })
})
