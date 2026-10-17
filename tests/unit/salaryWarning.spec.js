// issues/128: without the year's working day, Bestretes warned that the payrolls
// can't be consulted yet still listed every month with «+ Crea» payroll buttons.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(async () => ({ data: [] })) }) }))
import DedicationSalary from '@/components/DedicationSalary.vue'

const mountWith = async (warn) => {
  const w = mount(DedicationSalary, {
    props: { user: null, year: 2026 },
    global: { stubs: { 'b-loading': true, 'b-button': true, 'router-link': { template: '<a><slot /></a>' } } }
  })
  await w.setData({ isLoading: false, warn, months: { '2026-01': { theoricDays: 21, dailySalary: 0 } } })
  return w
}

describe('Bestretes without the working day (issues/128)', () => {
  it('shows the warning and no payroll table', async () => {
    const w = await mountWith(true)
    expect(w.text()).toContain('cal definir la')
    expect(w.find('.salary-table').exists()).toBe(false)
  })
  it('shows the payroll table otherwise', async () => {
    const w = await mountWith(false)
    expect(w.find('.salary-table').exists()).toBe(true)
  })
})
