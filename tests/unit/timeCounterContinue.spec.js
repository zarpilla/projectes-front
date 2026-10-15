// A running time counter must keep the Funció, dedication type and task chosen
// in the hours dialog when the user clicks "Continua" and opens it again
// (issues/051). Only the project and description were sent and restored, and
// picking a Funció reset the dedication type to the project's default.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import Buefy from 'buefy'

const get = vi.fn(async url => ({
  data: url.startsWith('dedication-types')
    ? [{ id: 1, name: 'Ordinària' }, { id: 2, name: 'Extra' }]
    : url.startsWith('tasks')
      ? [{ id: 31, name: 'Redacció', activity_type: null }]
      : []
}))
const put = vi.fn(async () => ({ data: {} }))
vi.mock('@/service/index', () => ({ default: () => ({ get, put }) }))
import ModalBoxDedication from '@/components/ModalBoxDedication.vue'
import DedicationInput from '@/components/DedicationInput.vue'

const project = {
  id: 3,
  name: 'INCIDÈNCIA SOCIOPOLÍTICA',
  project_state: { can_assign_activities: true },
  global_activity_types: [{ id: 11, name: 'XCN' }, { id: 12, name: 'SAS' }],
  default_dedication_type: { id: 1, name: 'Ordinària' }
}

async function openModal (counter) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useMainStore().userName = 'anna'
  const w = mount(ModalBoxDedication, {
    props: { isActive: false, projects: [project], users: [{ id: 5, username: 'anna' }], counter },
    global: { plugins: [pinia, Buefy] },
    attachTo: document.body
  })
  await w.setProps({ isActive: true })
  await flushPromises()
  return w
}

function radio (w, fieldLabel, label) {
  const field = w.findAll('.field.is-horizontal').find(f => f.find('.field-label').text() === fieldLabel)
  return field.findAll('label.b-radio').find(l => l.text() === label).find('input')
}

async function pick (input) {
  input.element.checked = true
  input.element.dispatchEvent(new Event('input', { bubbles: true }))
  await Promise.resolve()
  input.element.dispatchEvent(new Event('change', { bubbles: true }))
  await flushPromises()
}

function continueButton (w) {
  return w.findAll('button').find(b => b.text() === 'Continua')
}

const started = { id: 4, project, description: null, createdAt: '2026-10-15T18:03:04.000Z' }

beforeEach(() => { put.mockClear() })

describe('time counter "Continua"', () => {
  it('sends the chosen Funció, dedication type and task', async () => {
    const w = await openModal({ ...started })
    await pick(radio(w, 'Tipus dedicació', 'Extra'))
    await pick(radio(w, 'Funció', 'SAS'))
    await pick(radio(w, 'Tasca', 'Redacció'))

    await continueButton(w).trigger('click')
    const [[info]] = w.emitted('counter-continue')
    expect(String(info.activity_type)).toBe('12')
    // picking a Funció must not put the project's default back
    expect(String(info.dedication_type)).toBe('2')
    expect(String(info.task)).toBe('31')
    w.unmount()
  })

  it('shows them again when the counter is reopened', async () => {
    const w = await openModal({
      ...started,
      activity_type: { id: 12, name: 'SAS' },
      dedication_type: { id: 2, name: 'Extra' },
      task: { id: 31, name: 'Redacció' }
    })
    expect(radio(w, 'Funció', 'SAS').element.checked).toBe(true)
    expect(radio(w, 'Tipus dedicació', 'Extra').element.checked).toBe(true)
    expect(radio(w, 'Tasca', 'Redacció').element.checked).toBe(true)

    await w.find('form').trigger('submit')
    await flushPromises()
    const [[payload]] = w.emitted('submit')
    expect([payload.activity_type, payload.dedication_type, payload.task].map(String)).toEqual(['12', '2', '31'])
    w.unmount()
  })

  it('still preselects the project default dedication type on a new counter', async () => {
    const w = await openModal({ ...started })
    expect(radio(w, 'Tipus dedicació', 'Ordinària').element.checked).toBe(true)
    w.unmount()
  })

  it('stores them on the counter and keeps them for the next opening', async () => {
    const vm = { counter: { id: 4 }, projects: [project] }
    await DedicationInput.methods.counterContinue.call(vm, {
      project: 3, description: 'x', activity_type: 12, dedication_type: 2, task: 31
    })
    expect(put).toHaveBeenCalledWith('time-counters/4', {
      project: 3, description: 'x', activity_type: 12, dedication_type: 2, task: 31
    })
    expect(vm.counter).toMatchObject({ project, activity_type: 12, dedication_type: 2, task: 31 })
  })
})
