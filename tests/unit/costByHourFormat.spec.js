// issues/133: the planning and working-day dialogs showed the cost per hour
// as «21.55» (decimal point) next to the app's «21,55 €»
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'
import { useMainStore } from '@/stores/main.js'

vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(() => Promise.resolve({ data: [] })), put: vi.fn() })
}))
import ModalBoxEstimatedHours from '@/components/ModalBoxEstimatedHours.vue'
import ModalBoxWorkingDay from '@/components/ModalBoxWorkingDay.vue'

const costText = () => document.querySelector('.cost-by-hour').textContent.trim()

describe('cost per hour in the dialogs (issues/133)', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('planning dialog: «21,55 €»', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useMainStore().me = { options: { userHasCostByHour: true } }
    const w = mount(ModalBoxEstimatedHours, {
      props: { isActive: false, dedicationObject: { id: 1, _hours: { quantity: 10, amount: 21.5512 } } },
      global: { plugins: [pinia, Buefy] },
      attachTo: document.body
    })
    await w.setProps({ isActive: true })
    await flushPromises()
    expect(costText()).toBe('21,55 €')
    w.unmount()
  })

  it('working-day dialog: «18,78 €»', async () => {
    const w = mount(ModalBoxWorkingDay, {
      props: {
        isActive: false,
        dedicationObject: { _dedication: { id: 7, from: '2026-01-01', to: '2026-12-31', monthly_salary: 2760.66, quota: 0, pct_quota: 0, users_permissions_user: { id: 5, username: 'anna' } } },
        users: [],
        years: [{ year: 2026, working_hours: 1764 }]
      },
      global: { plugins: [createPinia(), Buefy] },
      attachTo: document.body
    })
    await w.setProps({ isActive: true })
    await new Promise(r => setTimeout(r, 150))
    await flushPromises()
    expect(costText()).toBe('18,78 €')
    w.unmount()
  })
})
