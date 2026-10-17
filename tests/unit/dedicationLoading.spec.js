// issues/078: Saldo hores and Hores anuals set isLoading and returned early
// without a person or a year, or on an API error, so the screen stayed on its
// spinner (blank).
import { describe, it, expect, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DedicationSaldo from '@/components/DedicationSaldo.vue'
import DedicationSummary from '@/components/DedicationSummary.vue'

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
