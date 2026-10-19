// issues/219: changing the person and the year quickly on Bestretes started two
// loads at once; both added into the same months (doubled worked/theoretical
// hours), and a slow older load could overwrite the newer one. Saldo hores and
// Hores anuals had the same pattern. Only the last selection may be shown.
import { describe, it, expect, vi } from 'vitest'
import moment from 'moment'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import { startLoad } from '@/domain/latestLoad'
import DedicationSalary from '@/components/DedicationSalary.vue'
import DedicationSaldo from '@/components/DedicationSaldo.vue'
import DedicationSummary from '@/components/DedicationSummary.vue'

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// 2025: 1 h every day; 2026: 2 h every day. One holiday on 3 March (a weekday).
const HOURS = { 2025: 1, 2026: 2 }
const days = year => {
  const out = []
  const d = moment(`${year}-01-01`)
  while (d.year() === year) {
    out.push(d.format('YYYY-MM-DD'))
    d.add(1, 'day')
  }
  return out
}
const yearOf = url => {
  const m = url.match(/(\d{4})-01-01|year_eq\]=(\d{4})|year\.year\]=(\d{4})/)
  return m ? Number(m[1] || m[2] || m[3]) : null
}
const respond = url => {
  const year = yearOf(url)
  if (url.startsWith('activities/total-by-day')) return days(year).map(date => ({ date, hours: HOURS[year] }))
  if (url.startsWith('festive-types')) return [{ name: 'Vacances', max: 22 }]
  if (url.startsWith('festives')) return [{ date: `${year}-03-03`, users_permissions_user: null, festive_type: { name: 'Vacances' } }]
  if (url.startsWith('daily-dedications')) return [{ from: '2020-01-01', to: '2030-12-31', hours: 8, monthly_salary: 1000, costByHour: 10 }]
  if (url.startsWith('years?')) return [{ id: year - 2024, year, working_hours: 1700 }]
  if (url === 'years') return [{ id: 1, year: 2025 }, { id: 2, year: 2026 }]
  if (url === 'months') return Array.from({ length: 12 }, (_, i) => ({ id: i + 1, month: i + 1 }))
  return []
}

// a fake component instance, as in dedicationLoading.spec.js
const instance = (component, props) => {
  const vm = { ...component.data.call({}), ...props }
  for (const [name, fn] of Object.entries(component.methods)) vm[name] = fn.bind(vm)
  return vm
}

// first load: person 31, 2026; second load: person 32, 2025. `slowFirst`
// makes every request of the first load answer after the second's.
const switchQuickly = async (component, slowFirst) => {
  get.mockReset().mockImplementation(url =>
    wait(slowFirst && yearOf(url) === 2026 ? 30 : 1).then(() => ({ data: respond(url) })))
  const vm = instance(component, { user: 31, year: 2026 })
  component.methods.getActivities.call(vm)
  await wait(0)
  vm.user = 32
  vm.year = 2025
  component.methods.getActivities.call(vm)
  await wait(slowFirst ? 600 : 200)
  return vm
}

describe('startLoad', () => {
  it('marks a load stale once a newer one starts for the same owner', () => {
    const owner = {}
    const first = startLoad(owner)
    expect(first()).toBe(false)
    const second = startLoad(owner)
    expect(first()).toBe(true)
    expect(second()).toBe(false)
    expect(startLoad({})()).toBe(false)
    expect(second()).toBe(false)
  })
})

describe.each([['at the same pace', false], ['the older one slower', true]])('overlapping loads, %s (issues/219)', (_, slowFirst) => {
  it('Bestretes shows only the last selection', async () => {
    const vm = await switchQuickly(DedicationSalary, slowFirst)
    expect(vm.isLoading).toBe(false)
    expect(Object.keys(vm.months)).toHaveLength(12)
    // January 2025: 31 days × 1 h worked, 23 weekdays × 8 h theoretical
    expect(vm.months['1'].worked).toBe(31)
    expect(vm.months['1'].theoricHours).toBe(184)
    expect(vm.months['1'].theoricDays).toBe(23)
    expect(vm.summary['Total hores treballades']).toBe('365.00')
  })

  it('Saldo hores counts the holiday once, for the last selection', async () => {
    const vm = await switchQuickly(DedicationSaldo, slowFirst)
    expect(vm.isLoading).toBe(false)
    expect(vm.summary.Vacances).toBe(8)
    expect(vm.summary['Total hores treballades']).toBe('365.00')
    expect(vm.dates[0].iso).toBe('2025-12-31')
  })

  it('Hores anuals counts the holiday once, for the last selection', async () => {
    const vm = await switchQuickly(DedicationSummary, slowFirst)
    expect(vm.isLoading).toBe(false)
    expect(vm.summary.Vacances.days).toBe(1)
    expect(vm.summary.Vacances.hours).toBe(8)
    expect(vm.summary.Treballades.hours).toBe(365)
  })
})
