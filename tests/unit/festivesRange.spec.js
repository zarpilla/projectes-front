// The workday and balance screens ask only the festives of the dates they
// show, not every festive of every year (issues/096).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn(async () => ({ data: [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
vi.mock('html3pdf', () => ({ default: () => ({}) }))
import JornadaDiaria from '@/components/JornadaDiaria.vue'
import DedicationSaldo from '@/components/DedicationSaldo.vue'
import DedicationSalary from '@/components/DedicationSalary.vue'
import DedicationSalaryPeriod from '@/components/DedicationSalaryPeriod.vue'

const festiveCalls = () => get.mock.calls.map(c => c[0]).filter(u => u.startsWith('festives'))
const open = async (component, props) => {
  mount(component, {
    props,
    global: { plugins: [createPinia(), Buefy], stubs: { 'download-excel': true, 'b-loading': true } }
  })
  await flushPromises()
  await flushPromises()
}

beforeEach(() => {
  get.mockClear()
  vi.useFakeTimers({ now: new Date('2026-10-17T10:00:00+02:00'), toFake: ['Date'] })
})
afterEach(() => vi.useRealTimers())

describe('festives by date range (issues/096)', () => {
  it('Registre jornades: the month shown', async () => {
    await open(JornadaDiaria, { user: 5, year: 2026, month: 10, months: [{ month: 10, name: 'octubre' }] })
    expect(festiveCalls()).toEqual(['festives?_where[date_gte]=2026-10-01&[date_lte]=2026-10-31&_limit=-1'])
  })

  it('Saldo hores: the year shown', async () => {
    await open(DedicationSaldo, { user: 5, year: 2025 })
    expect(festiveCalls()).toEqual(['festives?_where[date_gte]=2025-01-01&[date_lte]=2025-12-31&_limit=-1'])
  })

  it('Bestretes: the year shown', async () => {
    await open(DedicationSalary, { user: 5, year: 2026 })
    expect(festiveCalls()).toEqual(['festives?_where[date_gte]=2026-01-01&[date_lte]=2026-12-31&_limit=-1'])
  })

  it('Bestretes per període: from the first month to the end of this year', async () => {
    await open(DedicationSalaryPeriod, { user: 5, months: 6 })
    expect(festiveCalls()).toEqual(['festives?_where[date_gte]=2026-04-17&[date_lte]=2026-12-31&_limit=-1'])
  })
})
