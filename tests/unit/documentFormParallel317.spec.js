// issues/317 (2026-10-22): opening an invoice of a project with many invoices
// took ~17 s on ladili_test. The form waited for /users/me, then /me, then
// every list, and only then asked for the document, then each project's
// phases one after another. The document now goes out with the lists, and the
// phases of every project at once.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import DocumentForm from '@/components/DocumentForm.vue'

let pending
beforeEach(() => {
  setActivePinia(createPinia())
  pending = []
  api.get.mockReset()
  api.get.mockImplementation(url => new Promise(resolve => pending.push({ url, resolve })))
})
const asked = () => pending.map(p => p.url)
const answer = (prefix, data) => {
  for (const p of pending.filter(p => p.url.startsWith(prefix) && !p.done)) {
    p.done = true
    p.resolve({ data: typeof data === 'function' ? data(p.url) : data })
  }
}

const ctx = () => {
  let releaseLists
  const vm = {
    type: 'emitted-invoices',
    $route: { params: { id: '884' }, query: {} },
    $nextTick: fn => fn && fn(),
    form: {},
    products: [],
    series: [],
    historyKey: 0,
    getAuxiliarData: vi.fn(() => new Promise(r => { releaseLists = r })),
    calculateIRPF: vi.fn(),
    calculateMinEmittedDate: vi.fn(async () => {}),
    calculateDocumentWarnings: vi.fn(),
    warnSettingsMissing: vi.fn()
  }
  return { vm, releaseLists: () => releaseLists() }
}

describe('document form loading (issues/317)', () => {
  it('asks the document while the lists are still loading, and every project phases at once', async () => {
    const { vm, releaseLists } = ctx()
    const done = DocumentForm.methods.getData.call(vm)
    await flushPromises()
    // /users/me and /me at once, the document too
    expect(asked()).toEqual(expect.arrayContaining(['/users/me', 'me', 'emitted-invoices/884']))
    answer('/users/me', { id: 1 })
    answer('me', { name: 'La Diligència' })
    await flushPromises()
    expect(vm.getAuxiliarData).toHaveBeenCalled()

    answer('emitted-invoices/884', { id: 884, state: 'real', projects: [{ id: 30 }, { id: 31 }] })
    await flushPromises()
    // the document is not used before the lists arrive (lines need the products)
    expect(vm.form.id).toBeUndefined()

    releaseLists()
    await flushPromises()
    expect(asked().filter(u => u.endsWith('/phases'))).toEqual(['projects/30/phases', 'projects/31/phases'])
    answer('projects/', url => ({ project_phases: [{ id: Number(url.split('/')[1]) * 10 }] }))
    await done
    await flushPromises()
    expect(vm.form.id).toBe(884)
    expect(vm.form.projects.map(p => p.project_phases.map(pp => pp.id))).toEqual([[300], [310]])
    expect(vm.isLoading).toBe(false)
  })
})
