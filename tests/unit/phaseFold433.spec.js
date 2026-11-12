// issues/433: a folded phase stays folded the next time the project opens (and
// an unfolded one unfolded), per person in this browser. A phase with no
// remembered state opens unfolded: the execution copy too.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { loadFoldedPhases, saveFoldedPhases } from '@/domain/phaseFold.js'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import ProjectPhases from '@/components/ProjectPhases.vue'

const phase = (id, name, position) => ({ id, name, position, incomes: [], expenses: [] })

const mountPhases = (props = {}) =>
  shallowMount(ProjectPhases, {
    props: {
      form: { id: 7 },
      contacts: [],
      editable: true,
      mode: 'simple',
      projectPhases: [phase(1, 'I224', 0), phase(2, 'I226', 1)],
      ...props
    },
    global: { plugins: [createPinia()], stubs: { 'b-table': { template: '<div />' } } }
  })

describe('phaseFold storage (issues/433)', () => {
  beforeEach(() => localStorage.clear())

  it('keeps only the folded saved phases, per project', () => {
    saveFoldedPhases(7, { 'id-1': true, 'id-2': false, 'index-3': true })
    expect(JSON.parse(localStorage.getItem('phases-folded-7'))).toEqual(['1'])
    expect(loadFoldedPhases(7)).toEqual({ 'id-1': true })
    expect(loadFoldedPhases(8)).toEqual({})
  })

  it('forgets the project when nothing is folded, and survives bad data', () => {
    saveFoldedPhases(7, { 'id-1': true })
    saveFoldedPhases(7, { 'id-1': false })
    expect(localStorage.getItem('phases-folded-7')).toBeNull()
    localStorage.setItem('phases-folded-7', '{oops')
    expect(loadFoldedPhases(7)).toEqual({})
  })

  it('does nothing when the storage throws (private window)', () => {
    const broken = { getItem: () => { throw new Error('no') }, setItem: () => { throw new Error('no') }, removeItem: () => {} }
    expect(loadFoldedPhases(7, broken)).toEqual({})
    expect(() => saveFoldedPhases(7, { 'id-1': true }, broken)).not.toThrow()
  })
})

describe('ProjectPhases folding (issues/433)', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    get.mockReset()
    get.mockImplementation(() => Promise.resolve({ data: [] }))
  })

  it('opens a folded phase folded again', async () => {
    const first = mountPhases()
    await flushPromises()
    first.vm.toggleCollapsed(first.vm.phases[0], 0)
    await flushPromises()
    first.unmount()

    const again = mountPhases()
    await flushPromises()
    expect(again.vm.isCollapsed(again.vm.phases[0], 0)).toBe(true)
    expect(again.vm.isCollapsed(again.vm.phases[1], 1)).toBe(false)
  })

  it('an unfolded phase stays unfolded, and «Desplega-ho tot» is remembered', async () => {
    const first = mountPhases()
    await flushPromises()
    first.vm.setAllCollapsed(true)
    await flushPromises()
    first.vm.setAllCollapsed(false)
    await flushPromises()
    first.unmount()

    const again = mountPhases()
    await flushPromises()
    expect(again.vm.isCollapsed(again.vm.phases[0], 0)).toBe(false)
    expect(again.vm.isCollapsed(again.vm.phases[1], 1)).toBe(false)
  })

  it('a new phase (the execution copy) opens unfolded', async () => {
    localStorage.setItem('phases-folded-7', JSON.stringify(['1']))
    const wrapper = mountPhases({ projectPhases: [phase(1, 'I224', 0), { name: 'Execució', incomes: [], expenses: [] }] })
    await flushPromises()
    expect(wrapper.vm.isCollapsed(wrapper.vm.phases[1], 1)).toBe(false)
  })

  it('does not apply to the phases shown to assign a document', async () => {
    localStorage.setItem('phases-folded-7', JSON.stringify(['1']))
    const wrapper = mountPhases({ mode: 'incomes' })
    await flushPromises()
    expect(wrapper.vm.isCollapsed(wrapper.vm.phases[0], 0)).toBe(false)
  })
})
