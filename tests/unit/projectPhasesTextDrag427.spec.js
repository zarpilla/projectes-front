// issues/427: selecting a number in a cell of a project line and dragging it
// moved the text into the cell next to it (the browser's own text drag & drop
// between inputs). Only the line and phase handles may start a drag, and a
// drop that is not one of our moves must not insert text into a cell.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { isHandleDrag } from '@/domain/budgetLineOrder.js'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import ProjectPhases from '@/components/ProjectPhases.vue'

const mountPhases = () =>
  shallowMount(ProjectPhases, {
    props: {
      form: { id: 1 },
      contacts: [],
      editable: true,
      mode: 'simple',
      projectPhases: [{ id: 1, name: 'A', position: 0, incomes: [], expenses: [] }, { id: 2, name: 'B', position: 1, incomes: [], expenses: [] }]
    },
    attachTo: document.body,
    global: { plugins: [createPinia()], stubs: { 'b-table': { template: '<div><input class="cell" value="0,1327636"></div>' } } }
  })

const fire = (el, type) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  el.dispatchEvent(event)
  return event
}

describe('isHandleDrag (issues/427)', () => {
  it('accepts the handles and anything inside them', () => {
    document.body.innerHTML = '<span class="line-drag-handle"><i id="icon"></i></span><span class="phase-drag-handle" id="ph"></span><input id="cell">'
    expect(isHandleDrag(document.getElementById('icon'))).toBe(true)
    expect(isHandleDrag(document.getElementById('ph'))).toBe(true)
    expect(isHandleDrag(document.getElementById('cell'))).toBe(false)
    expect(isHandleDrag(document.getElementById('icon').appendChild(document.createTextNode('x')))).toBe(true)
    expect(isHandleDrag(null)).toBe(false)
  })
})

describe('ProjectPhases text drag (issues/427)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
    get.mockImplementation(() => Promise.resolve({ data: [] }))
  })

  it('does not let text selected in a cell be dragged', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    const cell = wrapper.findAll('input.cell')[0].element
    expect(fire(cell, 'dragstart').defaultPrevented).toBe(true)
    wrapper.unmount()
  })

  it('does not let dragged text be dropped into a cell', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    const cell = wrapper.findAll('input.cell')[0].element
    expect(fire(cell, 'drop').defaultPrevented).toBe(true)
    wrapper.unmount()
  })

  it('still lets the phase handle start a move', async () => {
    const wrapper = mountPhases()
    await flushPromises()
    const handle = wrapper.findAll('.phase-drag-handle')[0].element
    expect(fire(handle, 'dragstart').defaultPrevented).toBe(false)
    expect(wrapper.vm.phaseDrag).toEqual({ from: 0, over: 0 })
    wrapper.unmount()
  })
})
