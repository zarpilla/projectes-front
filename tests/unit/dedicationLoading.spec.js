// issues/078: Saldo hores and Hores anuals set isLoading and returned early
// without a person or a year, or on an API error, so the screen stayed on its
// spinner (blank).
import { describe, it, expect, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DedicationSaldo from '@/components/DedicationSaldo.vue'
import DedicationSummary from '@/components/DedicationSummary.vue'
import DedicationSalary from '@/components/DedicationSalary.vue'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe.each([['DedicationSaldo', DedicationSaldo], ['DedicationSummary', DedicationSummary]])('%s loading (issues/078)', (_, component) => {
  const run = async props => {
    const vm = { ...component.data.call({}), ...props, isLoading: true }
    for (const [name, fn] of Object.entries(component.methods)) vm[name] = fn.bind(vm)
    await component.methods.getActivities.call(vm)
    await flush()
    return vm
  }

  it('stops loading without a person or a year, and asks nothing', async () => {
    get.mockReset()
    expect((await run({ user: null, year: 2026 })).isLoading).toBe(false)
    expect((await run({ user: 5, year: null })).isLoading).toBe(false)
    expect(get).not.toHaveBeenCalled()
  })

  it('stops loading when the API fails', async () => {
    get.mockReset().mockRejectedValue(new Error('500'))
    expect((await run({ user: 5, year: 2026 })).isLoading).toBe(false)
  })
})

// issues/219: Bestretes left its spinner on the same way
describe('DedicationSalary loading (issues/219)', () => {
  it('stops loading without a person or a year, and asks nothing', async () => {
    get.mockReset()
    for (const props of [{ user: null, year: 2026 }, { user: 5, year: null }]) {
      const vm = { ...DedicationSalary.data.call({}), ...props, isLoading: true, months: { 1: {} }, summary: { a: 1 } }
      for (const [name, fn] of Object.entries(DedicationSalary.methods)) vm[name] = fn.bind(vm)
      await DedicationSalary.methods.getActivities.call(vm)
      expect(vm.isLoading).toBe(false)
      expect(vm.months).toEqual({})
      expect(vm.summary).toEqual({})
    }
    expect(get).not.toHaveBeenCalled()
  })
})
