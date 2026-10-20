// issues/245: saving «1:30» in the hours modal sent NaN, the API answered 400,
// the modal closed losing what was typed and «Error» was replaced by «Guardat».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import VCalendar from 'v-calendar'
import { parseHours } from '@/domain/hoursInput'

globalThis.ResizeObserver ??= class { observe () {} unobserve () {} disconnect () {} }

const get = vi.fn(async () => ({ data: [] }))
const put = vi.fn(async (url, data) => ({ data }))
const post = vi.fn(async (url, data) => ({ data }))
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post, delete: vi.fn() }) }))
import DedicationInput from '@/components/DedicationInput.vue'

async function mountInput () {
  const w = mount(DedicationInput, {
    props: { date1: new Date(2026, 9, 1), date2: new Date(2026, 9, 31), user: 5, users: [], projects: [{ id: 1, name: 'Web' }] },
    global: {
      plugins: [createPinia(), Buefy, [VCalendar, { componentPrefix: 'v' }]],
      stubs: { 'download-excel': true, 'kk-progress': true, 'b-modal': true, 'modal-box-dedication': true }
    }
  })
  await flushPromises()
  const snackbar = vi.spyOn(w.vm.$buefy.snackbar, 'open').mockImplementation(() => {})
  w.vm.isModalEditActive = true
  return { w, snackbar }
}

const entry = hours => ({ id: 7, date: new Date(2026, 9, 7), hours, project: 1, users_permissions_user: 5, counter: null })
const messages = snackbar => snackbar.mock.calls.map(c => c[0].message)

beforeEach(() => { put.mockClear(); post.mockClear() })

describe('parseHours (issues/245)', () => {
  it('reads «1,5», «1.5» and «1:30» as 1,5 h', () => {
    expect(parseHours('1,5')).toBe(1.5)
    expect(parseHours('1.5')).toBe(1.5)
    expect(parseHours('1:30')).toBe(1.5)
    expect(parseHours(' 2 ')).toBe(2)
    expect(parseHours(3)).toBe(3)
    expect(parseHours('')).toBe(null)
    expect(parseHours(null)).toBe(null)
    expect(parseHours('1:75')).toBeNaN()
    expect(parseHours('una')).toBeNaN()
  })
})

describe('saving an hour entry (issues/245)', () => {
  it('saves «1:30» as 1,5 h', async () => {
    const { w, snackbar } = await mountInput()
    await w.vm.modalSubmit(entry('1:30'))
    expect(put).toHaveBeenCalledWith('activities/7', expect.objectContaining({ hours: 1.5 }))
    expect(w.vm.isModalEditActive).toBe(false)
    expect(messages(snackbar)).toEqual(['Guardat'])
  })

  it('refuses what is not a number and keeps the modal open', async () => {
    const { w, snackbar } = await mountInput()
    await w.vm.modalSubmit(entry('una i mitja'))
    expect(put).not.toHaveBeenCalled()
    expect(w.vm.isModalEditActive).toBe(true)
    expect(messages(snackbar)).toEqual(['Les hores han de ser un número, com 1,5 o 1:30'])
  })

  it('shows why a save failed and keeps the modal open, without «Guardat»', async () => {
    put.mockRejectedValueOnce({ response: { data: { error: { message: 'Data tancada' } } } })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { w, snackbar } = await mountInput()
    await w.vm.modalSubmit(entry('2'))
    expect(w.vm.isModalEditActive).toBe(true)
    expect(messages(snackbar)).toEqual(["No s'han pogut desar les hores: Data tancada"])
    expect(w.vm.saving).toBe(false)
    errors.mockRestore()
  })
})
