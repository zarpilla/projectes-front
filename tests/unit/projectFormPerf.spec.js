// issues/055: the form of a big project (300 budget lines) drew ~240,000
// elements after its data arrived: the budget of a hidden tab, the folded
// original budget, and a whole calendar inside every closed datepicker
// (150,000 of them). Typing in a line redrew every line. A timing test would
// be flaky, so these guard the mechanisms that avoid that work, and that the
// data and the saving stay as they were.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'
import { buefyConfig } from '@/helpers/buefyConfig'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import ProjectPhases from '@/components/ProjectPhases.vue'
import LazyDatepicker from '@/components/LazyDatepicker.vue'
import CardComponent from '@/components/CardComponent.vue'
import ProjectForm from '@/views/ProjectForm.vue'
import { useMainStore } from '@/stores/main.js'

const line = over => ({ id: 1, concept: 'Lloguer', quantity: 1, amount: 100, total_amount: 100, date: '2024-03-05', ...over })
const phases = () => [{ id: 7, name: 'Fase 1', incomes: [line({ id: 1 })], expenses: [line({ id: 2, concept: 'Despesa' })] }]

describe('ProjectPhases deferRender (issues/055)', () => {
  let pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    useMainStore().setMe({ me: { options: {} } })
    get.mockReset()
    get.mockResolvedValue({ data: [] })
  })

  const mountPhases = (props = {}) =>
    mount(ProjectPhases, {
      props: { form: { id: 1 }, contacts: [], ...props },
      global: { plugins: [pinia, Buefy] }
    })

  it('sets the lines up but draws nothing while deferred', async () => {
    const projectPhases = phases()
    const w = mountPhases({ projectPhases, deferRender: true })
    await flushPromises()
    expect(w.find('.project-form-phases').exists()).toBe(false)
    // the set-up the save relies on still ran (dates as Date on the shared lines)
    expect(w.vm.phases).toHaveLength(1)
    expect(projectPhases[0].incomes[0].date).toBeInstanceOf(Date)
  })

  it('draws when shown, and stays drawn when hidden again', async () => {
    const w = mountPhases({ projectPhases: phases(), deferRender: true })
    await flushPromises()
    await w.setProps({ deferRender: false })
    expect(w.find('.project-form-phases').exists()).toBe(true)
    expect(w.findAll('.project-form-phases tbody tr').length).toBe(2)
    await w.setProps({ deferRender: true })
    expect(w.find('.project-form-phases').exists()).toBe(true)
  })

  it('draws at once by default (document forms, the wizard)', async () => {
    const w = mountPhases({ projectPhases: phases() })
    await flushPromises()
    expect(w.find('.project-form-phases').exists()).toBe(true)
  })

  it('has no calendar in the lines until a date is used', async () => {
    const w = mountPhases({ projectPhases: phases() })
    await flushPromises()
    expect(w.findAll('.lazy-datepicker').length).toBe(4)
    expect(w.findAll('.datepicker-table').length).toBe(0)
    expect(w.findAll('.lazy-datepicker input').map(i => i.element.value)).toContain('05/03/2024')
  })
})

describe('LazyDatepicker (issues/055)', () => {
  const mountPicker = (attrs = {}) =>
    mount(LazyDatepicker, {
      attrs: { modelValue: new Date(2024, 2, 5), placeholder: 'Data', icon: 'calendar-today', editable: '', ...attrs },
      // the app's Buefy options: its date format
      global: { plugins: [[Buefy, buefyConfig]] },
      attachTo: document.body
    })

  it('shows the date as the datepicker does, without its calendar', () => {
    const w = mountPicker()
    const input = w.find('input')
    expect(input.element.value).toBe('05/03/2024')
    expect(input.attributes('placeholder')).toBe('Data')
    expect(input.attributes('readonly')).toBeUndefined()
    expect(w.find('.datepicker-table').exists()).toBe(false)
    expect(w.findComponent({ name: 'BDatepicker' }).exists()).toBe(false)
    w.unmount()
  })

  it('keeps the read-only and disabled states', () => {
    const w = mountPicker({ editable: undefined, disabled: true })
    expect(w.find('input').attributes('readonly')).toBeDefined()
    expect(w.find('input').attributes('disabled')).toBeDefined()
    expect(w.find('.dropdown').classes()).toContain('is-disabled')
    w.unmount()
  })

  it('shows nothing for an empty or invalid value', () => {
    expect(mountPicker({ modelValue: null }).find('input').element.value).toBe('')
    expect(mountPicker({ modelValue: '2024-03-05' }).find('input').element.value).toBe('')
  })

  it('becomes the real datepicker when the pointer is over it, with its value and listeners', async () => {
    const onUpdate = vi.fn()
    const w = mountPicker({ 'onUpdate:modelValue': onUpdate })
    await w.find('.lazy-datepicker').trigger('mouseenter')
    const picker = w.findComponent({ name: 'BDatepicker' })
    expect(picker.exists()).toBe(true)
    expect(picker.props('modelValue')).toEqual(new Date(2024, 2, 5))
    expect(picker.props('editable')).toBe(true)
    expect(w.find('input').element.value).toBe('05/03/2024')
    picker.vm.$emit('update:modelValue', new Date(2024, 2, 9))
    expect(onUpdate).toHaveBeenCalledWith(new Date(2024, 2, 9))
    w.unmount()
  })

  it('passes the focus, and the selected text, to the real input', async () => {
    const w = mountPicker()
    const input = w.find('input').element
    // a Tab into a filled input selects its text, then focuses it
    input.setSelectionRange(0, input.value.length)
    input.focus()
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await flushPromises()
    const real = w.find('input').element
    expect(w.findComponent({ name: 'BDatepicker' }).exists()).toBe(true)
    expect(document.activeElement).toBe(real)
    expect([real.selectionStart, real.selectionEnd]).toEqual([0, 10])
    w.unmount()
  })
})

describe('CardComponent visible-change (issues/055)', () => {
  it('tells the page whether its content is open, from the start', async () => {
    const w = shallowMount(CardComponent, { props: { title: 'T', contentVisible: false } })
    expect(w.emitted('visible-change')).toEqual([[false]])
    await w.find('a.card-header-icon').trigger('click')
    expect(w.emitted('visible-change')).toEqual([[false], [true]])
  })
})

describe('ProjectForm budget lines (issues/055)', () => {
  const ctx = () => ({ form: { project_phases: [] }, deletedPhases: [], deletedIncomes: [], deletedExpenses: [], deletedHours: [] })

  it('keeps the phases array when the same phases come back (a keystroke)', () => {
    const c = ctx()
    const list = phases()
    ProjectForm.methods.phasesUpdated.call(c, { phases: list })
    const first = c.form.project_phases
    expect(first).not.toBe(list)
    expect(first).toEqual(list)
    ProjectForm.methods.phasesUpdated.call(c, { phases: list })
    expect(c.form.project_phases).toBe(first)
    expect(c.form._project_phases_updated).toBe(true)
  })

  it('replaces it when the phases change', () => {
    const c = ctx()
    const list = phases()
    ProjectForm.methods.phasesUpdated.call(c, { phases: list })
    const first = c.form.project_phases
    list.push({ id: 8, name: 'Fase 2', incomes: [], expenses: [] })
    ProjectForm.methods.phasesUpdated.call(c, { phases: list, deletedPhases: [3], deletedIncomes: [], deletedExpenses: [] })
    expect(c.form.project_phases).not.toBe(first)
    expect(c.form.project_phases.map(p => p.id)).toEqual([7, 8])
    expect(c.form.project_phases_info.deletedPhases).toEqual([3])
  })

  it('names the contact of a movement as before', () => {
    const clients = [{ id: 1, name: 'Anna' }, { id: 2, name: 'Berta' }, { id: 1, name: 'Duplicada' }]
    const c = { clients }
    c.contactNames = ProjectForm.computed.contactNames.call(c)
    const name = doc => ProjectForm.methods.getContactName.call(c, doc)
    expect(name({ contact: 1 })).toBe('Anna')
    expect(name({ contact: 2 })).toBe('Berta')
    expect(name({ contact: 3 })).toBe('')
    expect(name({})).toBe('')
    expect(name(null)).toBe('')
  })

  it('draws a hidden tab only once it has been shown', () => {
    const c = { tabsEnabled: true, isCreationMode: false, activeTab: 'resum', renderedTabs: {} }
    c.showTab = tab => ProjectForm.methods.showTab.call(c, tab)
    const rendered = tab => ProjectForm.methods.tabRendered.call(c, tab)
    ProjectForm.watch.activeTab.handler.call(c, 'resum')
    expect(rendered('moviments')).toBe(false)
    c.activeTab = 'moviments'
    ProjectForm.watch.activeTab.handler.call(c, 'moviments')
    expect(rendered('moviments')).toBe(true)
    c.activeTab = 'resum'
    expect(rendered('moviments')).toBe(true)
    // without tabs every section shows
    expect(ProjectForm.methods.tabRendered.call({ ...c, renderedTabs: {}, tabsEnabled: false, showTab: t => ProjectForm.methods.showTab.call({ tabsEnabled: false }, t) }, 'moviments')).toBe(true)
  })
})
