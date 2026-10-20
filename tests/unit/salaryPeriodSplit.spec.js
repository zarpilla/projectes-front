// issues/264: in the month a person's period changes, Bestretes took the last
// day's period salary for the whole month. Ana Pardo, 22/10/2024
// (1.988,05 → 3.200 €, 6 h/dia): October said 2.400 € (3.200 × 6/8); with 15
// of its 23 working days on the old salary it is ~1.807 €. «Salari total» and
// the payroll it creates take the same figure.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const PERIODS = [
  { from: '2024-01-01', to: '2024-10-21', hours: 6, costByHour: 10, monthly_salary: 1988.05, quota: 300 },
  { from: '2024-10-22', to: '2024-12-31', hours: 6, costByHour: 10, monthly_salary: 3200, quota: 300 }
]
const get = vi.fn(async url => {
  if (url.startsWith('daily-dedications')) return { data: PERIODS }
  if (url.startsWith('months')) return { data: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, month: i + 1 })) }
  if (url.startsWith('years')) return { data: [{ id: 7, year: 2024 }] }
  return { data: [] }
})
const post = vi.fn(async (url, data) => ({ data }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post }) }))
import DedicationSalary from '@/components/DedicationSalary.vue'

const monthSalary = m => m.dailySalary / m.theoricDays

describe('Bestretes with a period change mid-month (issues/264)', () => {
  it('splits the month between both salaries by days', async () => {
    const w = mount(DedicationSalary, {
      props: { user: 5, year: 2024 },
      global: { stubs: { 'b-loading': true, 'b-button': true, 'b-icon': true, 'router-link': { template: '<a><slot /></a>' } } }
    })
    await flushPromises()
    await flushPromises()
    const october = w.vm.months['10']
    expect(october.theoricDays).toBe(23)
    const expected = (15 * 1988.05 * 6 / 8 + 8 * 3200 * 6 / 8) / 23
    expect(monthSalary(october)).toBeCloseTo(expected, 6)
    expect(Math.round(expected)).toBe(1807)
    // the months of one period stay as before
    expect(monthSalary(w.vm.months['9'])).toBeCloseTo(1988.05 * 6 / 8, 6)
    expect(monthSalary(w.vm.months['11'])).toBeCloseTo(2400, 6)
    // Salari total adds the same month figures
    const total = Object.values(w.vm.months).reduce((a, m) => a + monthSalary(m), 0)
    expect(w.vm.xsalary).toBeCloseTo(total, 6)
    expect(w.vm.xsalary).toBeCloseTo(9 * 1988.05 * 0.75 + expected + 2 * 2400, 6)
  })
})
