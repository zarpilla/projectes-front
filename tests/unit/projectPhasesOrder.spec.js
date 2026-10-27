// The phases of a project can be moved with drag & drop, as their lines
// (issues/345). They load in their saved order, a move tells the parent the new
// order, and «Copia la fase a l'execució» sends the phase itself: the parent's
// list may be in another order, and an index alone copied the wrong phase.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import ProjectPhases from '@/components/ProjectPhases.vue'

const phase = (id, name, position) => ({ id, name, position, incomes: [], expenses: [] })

const mountPhases = props =>
  shallowMount(ProjectPhases, {
    props: {
      form: { id: 1 },
      contacts: [],
      editable: true,
      mode: 'simple',
      projectPhases: [phase(1, 'A', 2), phase(2, 'B', 0), phase(3, 'C', 1)],
      ...props
    },
    // the line tables are not under test (their slots need a row)
    global: { plugins: [createPinia()], stubs: { 'b-table': { template: '<div />' } } }
  })

describe('ProjectPhases order', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
    get.mockImplementation(() => Promise.resolve({ data: [] }))
  })

  it('shows the phases in their saved order', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    expect(wrapper.vm.phases.map(p => p.name)).toEqual(['B', 'C', 'A'])
  })

  it('moves a phase and sends the new order to the parent', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    wrapper.vm.movePhase(2, 0)
    expect(wrapper.vm.phases.map(p => p.name)).toEqual(['A', 'B', 'C'])
    const [info] = wrapper.emitted('phases-updated').at(-1)
    expect(info.phases.map(p => p.name)).toEqual(['A', 'B', 'C'])
  })

  it('keeps a folded unsaved phase folded after a move', async () => {
    const wrapper = mountPhases({ projectPhases: [phase(1, 'A', 0), { name: 'Nova', incomes: [], expenses: [] }] })
    await flushPromises()
    wrapper.vm.toggleCollapsed(wrapper.vm.phases[1], 1)
    wrapper.vm.movePhase(1, 0)
    expect(wrapper.vm.isCollapsed(wrapper.vm.phases[0], 0)).toBe(true)
    expect(wrapper.vm.isCollapsed(wrapper.vm.phases[1], 1)).toBe(false)
  })

  it('copies the phase the button is on, with the phase itself', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    wrapper.vm.movePhase(2, 0)
    wrapper.vm.copyPhase(0)
    const [info] = wrapper.emitted('phases-copy').at(-1)
    expect(info.phase.name).toBe('A')
  })

  it('does not offer the move while assigning a document, or when read only', async () => {
    const assigning = mountPhases({ mode: 'incomes' })
    const readOnly = mountPhases({ editable: false })
    await flushPromises()
    expect(assigning.vm.canReorderPhases).toBe(false)
    expect(readOnly.vm.canReorderPhases).toBe(false)
  })
})
