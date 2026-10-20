// issues/299 — «Nova dieta» with 123.5 km: the km input had step="1", so the
// browser refused 123.5, and submit() sent parseInt(km) = 123. Decimal km must
// be accepted and reach the expense lines unchanged (2 decimals, issues/295).
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(() => Promise.resolve({ data: [] })) })
}))
import ModalBoxDiet from '@/components/ModalBoxDiet.vue'

describe('Nova dieta, decimal km', () => {
  it('accepts 123.5 km and submits them as typed', async () => {
    const w = mount(ModalBoxDiet, {
      props: { isActive: true, quotes: { diet_amount_without_irpf: 0.26, diet_amount_total: 0.4 } },
      global: { plugins: [Buefy] },
      attachTo: document.body
    })
    await flushPromises()
    const km = document.querySelector('.modal-card-diet input[type="number"]')
    km.value = '123.5'
    km.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(km.validity.valid).toBe(true)

    Object.assign(w.vm.form, { user: 1, project: { id: 2, name: 'P' }, concept: 'Viatge' })
    w.vm.submit()
    const [diet] = w.emitted('submit')[0]
    expect(diet.kilometers).toBe(123.5)
    expect(diet.dietAmountWithoutIrpf).toBe(32.11)
    w.unmount()
  })
})
