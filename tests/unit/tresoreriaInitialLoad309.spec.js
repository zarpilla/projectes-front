// issues/309: Tresoreria asked contacts/basic (1 MB, ~2.6 s in production), me,
// years, project-states and bank-accounts one after another and only then the
// forecast, so the slowest call started seconds after the page. The forecast
// only needs the project states, the bank accounts and the year: the three
// catalogs load together and the forecast right after them. Nothing on the
// page reads contacts or me: they are no longer asked.
// issues/307: and nothing was asked before Kendo (3.5 MB) had loaded; now the
// data is asked at mount and the pivot drawn once Kendo is there.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const deferred = () => {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

// every GET waits until the test answers it
let pending
const api = {
  get: vi.fn(url => {
    if (url.startsWith('pivot-table-views')) return Promise.resolve({ data: [] })
    const d = deferred()
    pending[url] = d
    return d.promise
  }),
  put: vi.fn(),
  post: vi.fn()
}
vi.mock('@/service/index', () => ({ default: () => api }))
const getTreasuryData = vi.fn(async () => ({ vat: {}, vat_expected: {}, treasury: [], projects: [] }))
vi.mock('@/service/treasury', () => ({ default: (...a) => getTreasuryData(...a) }))
// Kendo loads when the test says so
let kendo
vi.mock('@/helpers/addScript', () => ({
  waitForJQuery: callback => {
    callback()
    return () => {}
  },
  loadKendo: () => kendo.promise
}))
import TresoreriaTable from '@/components/TresoreriaTable.vue'

const CONTACTS = 'contacts/basic?_limit=-1&_sort=name:ASC'
const YEARS = 'years?_sort=year:DESC'
const STATES = 'project-states'
const ACCOUNTS = 'bank-accounts?_sort=name:ASC'

const answer = (url, data) => pending[url].resolve({ data })
const answerCatalogs = () => {
  answer(YEARS, [{ year: 2026 }, { year: 2025 }])
  answer(STATES, [{ id: 1, name: 'En curs' }, { id: 2, name: 'Oferta' }, { id: 3, name: 'Tancat' }])
  answer(ACCOUNTS, [{ id: 1, name: 'A' }, { id: 3, name: 'B' }, { id: 2, name: 'C' }])
}

async function mountTable () {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/project/:id', name: 'project.edit', component: { template: '<div/>' } }
    ]
  })
  await router.push('/?year=2025')
  const w = mount(TresoreriaTable, {
    global: {
      plugins: [createPinia(), Buefy, router],
      stubs: { TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
      config: { warnHandler: () => {} }
    }
  })
  w.vm.initializePivotWithViews = vi.fn()
  await flushPromises()
  return w
}
const asked = () => api.get.mock.calls.map(c => c[0]).filter(url => !url.startsWith('pivot-table-views'))

beforeEach(() => {
  pending = {}
  kendo = deferred()
  api.get.mockClear()
  getTreasuryData.mockClear()
  localStorage.removeItem('TresoreriaTable.selectedProjectStates')
})

describe('Tresoreria first load (issues/309, 307)', () => {
  it('asks the three catalogs at once at mount, without waiting for Kendo', async () => {
    await mountTable()
    expect(asked().sort()).toEqual([ACCOUNTS, YEARS, STATES].sort())
    expect(getTreasuryData).not.toHaveBeenCalled()
  })

  it('starts the forecast as soon as the catalogs answer, and draws the pivot once Kendo is there', async () => {
    const w = await mountTable()
    answerCatalogs()
    await flushPromises()

    expect(getTreasuryData).toHaveBeenCalledTimes(1)
    expect(getTreasuryData).toHaveBeenCalledWith([1, 2, 3], '2025', '1,3,2')
    expect(w.vm.years.map(y => y.year)).toEqual([2026, 2025])
    expect(w.vm.selectedProjectStates).toEqual([1, 2, 3])
    expect(w.vm.selectedBankAccountIds).toEqual([1, 3, 2])
    // Kendo still loading: no pivot yet
    expect(w.vm.initializePivotWithViews).not.toHaveBeenCalled()

    kendo.resolve()
    await flushPromises()
    expect(w.vm.initializePivotWithViews).toHaveBeenCalledTimes(1)
    expect(w.vm.isLoading).toBe(false)
  })

  it('no longer asks contacts/basic nor me, which nothing on the page reads', async () => {
    await mountTable()
    answerCatalogs()
    kendo.resolve()
    await flushPromises()
    expect(asked()).not.toContain(CONTACTS)
    expect(asked()).not.toContain('me')
  })

  it('keeps the project states saved in this browser', async () => {
    localStorage.setItem('TresoreriaTable.selectedProjectStates', JSON.stringify([2]))
    const w = await mountTable()
    answerCatalogs()
    await flushPromises()
    expect(w.vm.selectedProjectStates).toEqual([2])
    expect(getTreasuryData).toHaveBeenCalledWith([2], '2025', '1,3,2')
  })
})
