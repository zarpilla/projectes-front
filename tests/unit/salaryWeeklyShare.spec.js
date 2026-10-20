// issues/290: with a weekly distribution Bestretes averaged monthly salary ×
// day hours / 8 over the days with hours: 9,9,9,9,0,0,0 (36 h a week) showed
// and saved 2.250 € (112,5 %) of a 2.000 € salary instead of 1.800 € (90 %),
// and Persones › «Crear bestretes» gave other amounts. Bestretes now takes
// payrollSalary.js (the backend's rule too).
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { monthSalary } from '@/domain/payrollSalary.js'

const PERIODS = [
  { from: '2026-01-01', to: '2026-06-15', hours: 7.2, hoursperday: '9,9,9,9,0,0,0', costByHour: 10, monthly_salary: 2000, quota: 300 },
  { from: '2026-06-16', to: '2026-12-31', hours: 8, costByHour: 10, monthly_salary: 2400, quota: 300 }
]
const FESTIVES = [{ date: '2026-06-24', users_permissions_user: null }]
const get = vi.fn(async url => {
  if (url.startsWith('daily-dedications')) return { data: PERIODS }
  if (url.startsWith('festives')) return { data: FESTIVES }
  if (url.startsWith('months')) return { data: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, month: i + 1 })) }
  if (url.startsWith('years')) return { data: [{ id: 7, year: 2026 }] }
  return { data: [] }
})
const post = vi.fn(async (url, data) => ({ data }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post }) }))
import DedicationSalary from '@/components/DedicationSalary.vue'

const shown = m => m.dailySalary / m.theoricDays

describe('Bestretes with a weekly distribution (issues/290)', () => {
  it('pays weekly hours / 40 of the salary, split by days, as payrollSalary.js', async () => {
    const w = mount(DedicationSalary, {
      props: { user: 5, year: 2026 },
      global: { stubs: { 'b-loading': true, 'b-button': true, 'b-icon': true, 'router-link': { template: '<a><slot /></a>' } } }
    })
    await flushPromises()
    await flushPromises()
    expect(shown(w.vm.months['3'])).toBeCloseTo(1800, 6)
    expect(shown(w.vm.months['6'])).toBeCloseTo((9 * 1800 + 10 * 2400) / 19, 6)
    for (let m = 1; m <= 12; m++) {
      expect(shown(w.vm.months[String(m)])).toBeCloseTo(monthSalary(2026, m, PERIODS, FESTIVES), 6)
    }
    await w.vm.createPayroll('3', shown(w.vm.months['3']).toFixed(2))
    expect(post).toHaveBeenCalledWith('payrolls', expect.objectContaining({ total_base: '1800.00' }))
  })
})
