// The «Afegeix una línia» (+) button sits on the last line of a phase's incomes
// or expenses. The tables page at more than 10 lines and the row index starts
// at 0 on every page, so a phase with 11 expenses showed no + at all
// (issues/453, arrandeterra, Recoopera 2nd year).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import ProjectPhases from '@/components/ProjectPhases.vue'
import { useMainStore } from '@/stores/main'

const line = i => ({ id: i, concept: `Línia ${i}`, quantity: 1, amount: 10, vat_pct: 21 })
const phase = (incomes, expenses) => ({
  id: 1, name: '2a anualitat', position: 0,
  incomes: Array.from({ length: incomes }, (_, i) => line(100 + i)),
  expenses: Array.from({ length: expenses }, (_, i) => line(i))
})

const mountPhases = async p => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useMainStore().me = { options: {} }
  const wrapper = mount(ProjectPhases, {
    props: { form: { id: 1 }, contacts: [], editable: true, mode: 'simple', projectPhases: [p] },
    global: { plugins: [pinia, Buefy] }
  })
  await flushPromises()
  return wrapper
}

const addButtons = wrapper => wrapper.findAll('button[title="Afegeix una línia"]')

describe('ProjectPhases add line button (issues/453)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
    get.mockImplementation(() => Promise.resolve({ data: [] }))
  })

  it('shows the + on the last line of a short table', async () => {
    const wrapper = await mountPhases(phase(2, 3))
    expect(addButtons(wrapper)).toHaveLength(2)
  })

  it('shows the + on the first page of a paginated table', async () => {
    const wrapper = await mountPhases(phase(2, 11))
    // one for the incomes, one for the 10 expense rows on page 1
    expect(addButtons(wrapper)).toHaveLength(2)
  })

  it('adds the line and shows the page that holds it', async () => {
    const wrapper = await mountPhases(phase(2, 10))
    const p = wrapper.vm.phases[0]
    wrapper.vm.addSubExpense(p)
    await flushPromises()
    expect(p.expenses).toHaveLength(11)
    expect(wrapper.vm.linePage(p, 'expenses')).toBe(2)
    expect(addButtons(wrapper)).toHaveLength(2)
  })
})
