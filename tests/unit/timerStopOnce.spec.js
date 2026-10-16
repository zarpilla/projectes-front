// Stopping the timer while the requests are slow: a second click on
// "Fi de l'activitat" must not delete the counter or create the activity
// again (issues/098).
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import VCalendar from 'v-calendar'

globalThis.ResizeObserver ??= class { observe () {} unobserve () {} disconnect () {} }

let release
const slow = () => new Promise(resolve => { release = resolve })
const get = vi.fn(async () => ({ data: [] }))
const del = vi.fn(() => slow())
const post = vi.fn(async () => ({ data: { id: 9 } }))
vi.mock('@/service/index', () => ({ default: () => ({ get, delete: del, post, put: vi.fn() }) }))
import DedicationInput from '@/components/DedicationInput.vue'
import ModalBoxDedication from '@/components/ModalBoxDedication.vue'

const plugins = [createPinia(), Buefy, [VCalendar, { componentPrefix: 'v' }]]

describe('stopping the timer (issues/098)', () => {
  it('sends one DELETE and one POST however many times it is submitted', async () => {
    const w = mount(DedicationInput, {
      props: { date1: new Date(2026, 9, 1), date2: new Date(2026, 9, 31), user: 5, users: [], projects: [] },
      global: { plugins, stubs: { 'download-excel': true, 'kk-progress': true, 'b-modal': true } }
    })
    await flushPromises()
    const activity = { date: '2026-10-16', hours: '1.5', project: 1, counter: { id: 126 } }
    const first = w.vm.modalSubmit(activity)
    await flushPromises()
    expect(w.vm.saving).toBe(true)
    w.vm.modalSubmit(activity)
    w.vm.modalSubmit(activity)
    release({})
    await first
    await flushPromises()
    expect(del).toHaveBeenCalledTimes(1)
    expect(post.mock.calls.filter(c => c[0] === 'activities')).toHaveLength(1)
    expect(w.vm.saving).toBe(false)
  })

  it('disables the modal buttons while the parent saves', async () => {
    const w = mount(ModalBoxDedication, {
      props: { isActive: true, counter: { id: 126, start: '2026-10-16 18:00:00' }, saving: true, projects: [], users: [] },
      global: { plugins, stubs: { 'b-modal': { template: '<div><slot /></div>' } } }
    })
    await flushPromises()
    const end = w.findAll('button').find(b => b.text() === "Fi de l'activitat")
    expect(end.attributes('disabled')).toBeDefined()
    expect(end.classes()).toContain('is-loading')
    await w.find('form').trigger('submit')
    expect(w.emitted('submit')).toBeUndefined()
  })
})
