// issues/277: several exports ignored the screen's filters or left columns
// empty — Contactes exported every contact whatever the type chip; Tresoreria
// every row of the year whatever the tab / search / column filters (and headed
// the contact column «nomina»); Despeses left `num` / `proveidor` empty on
// payrolls and headed the paid date «cobrada»; Pressupostos read `date` /
// `lines[0].concepte` (fields are `emitted` / `concept`) and called the client
// «proveidor».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import ContactsTable from '@/components/ContactsTable.vue'
import TresoreriaTable from '@/components/TresoreriaTable.vue'
import ReceivedInvoicesTable from '@/components/ReceivedInvoicesTable.vue'
import QuotesTable from '@/components/QuotesTable.vue'

const DownloadExcel = { name: 'DownloadExcel', props: ['data', 'fetch', 'fields', 'name', 'escapeCsv'], template: '<div><slot/></div>' }
const exported = async w => {
  const dl = w.findAllComponents(DownloadExcel)[0]
  return typeof dl.props('fetch') === 'function' ? await dl.props('fetch')() : dl.props('data')
}

describe('Contactes export (issues/277)', () => {
  it('follows the type chip and the search', async () => {
    api.get.mockImplementation(async () => ({
      data: [
        { id: 1, name: 'Clienta A', contact_types: [{ name: 'Clienta' }] },
        { id: 2, name: 'Proveïdora B', contact_types: [{ name: 'Proveïdora' }] },
        { id: 3, name: 'Clienta C', contact_types: [{ name: 'Clienta' }] }
      ]
    }))
    const w = mount(ContactsTable, {
      global: {
        plugins: [createPinia(), Buefy],
        stubs: { DownloadExcel, RouterLink: { template: '<a><slot/></a>' }, ModalBoxUnifyContacts: true },
        mocks: { $route: { meta: {} }, $router: { push: vi.fn() } },
        config: { warnHandler: () => {} }
      }
    })
    await flushPromises()
    expect((await exported(w)).map(c => c.id)).toEqual([1, 2, 3])
    await w.setData({ typeFilter: 'Clienta' })
    expect((await exported(w)).map(c => c.id)).toEqual([1, 3])
    await w.setData({ search: 'c' })
    expect((await exported(w)).map(c => c.id)).toEqual([1, 3])
    await w.setData({ search: 'zzz' })
    expect(await exported(w)).toEqual([])
  })
})

describe('Tresoreria export (issues/277)', () => {
  const row = (id, datef, extra) => ({ id, datef, type: 'Factura', concept: `Moviment ${id}`, total_amount: 100, subtotal: 100, contact: 'Clienta', ...extra })

  async function mountTreasury () {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }, { path: '/project/:id', name: 'project.edit', component: { template: '<div/>' } }] })
    await router.push('/')
    const w = mount(TresoreriaTable, {
      global: {
        plugins: [createPinia(), Buefy, router],
        stubs: { DownloadExcel, TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
        config: { warnHandler: () => {} }
      }
    })
    await w.setData({
      selectedYear: 2026,
      treasuryData: [
        row(1, '20260105', { paid: false }), // overdue expected
        row(2, '20260110', { paid: true, real: true, concept: 'Cobrament fet' }),
        row(3, '20991231', { paid: false, datef: '20261231' })
      ]
    })
    await flushPromises()
    return w
  }

  it('exports the rows of the tab and the search, with a «contacte» header', async () => {
    const w = await mountTreasury()
    expect((await exported(w)).map(r => r.id)).toEqual([3, 2, 1])
    await w.setData({ movementsTab: 'overdue' })
    await flushPromises()
    expect((await exported(w)).map(r => r.id)).toEqual([1])
    await w.setData({ movementsTab: 'all', movementsSearch: 'cobrament' })
    await flushPromises()
    expect((await exported(w)).map(r => r.id)).toEqual([2])
    const fields = w.findAllComponents(DownloadExcel)[0].props('fields')
    expect(fields.contacte).toBe('contact')
    expect(fields.nomina).toBeUndefined()
  })

  it('exports what the per-column filters leave', async () => {
    const w = await mountTreasury()
    const table = w.vm.$refs.movementsTable
    table.filters = { concept: 'Cobrament' }
    await flushPromises()
    expect((await exported(w)).map(r => r.id)).toEqual([2])
  })
})

describe('Despeses export of payrolls (issues/277)', () => {
  beforeEach(() => { api.get.mockReset() })

  it('fills num and proveidor, and heads the paid date «pagada»', async () => {
    api.get.mockImplementation(async url => {
      if (url.startsWith('payrolls')) {
        return { data: [
          { id: 9, emitted: '2026-10-31', paid_date: '2026-10-31', total: 1500, year: { year: 2026 }, month: { month: 10 }, users_permissions_user: { username: 'anna', fullname: 'Anna Puig' } },
          { id: 10, emitted: '2026-10-31', total: 900, year: { year: 2026 }, month: { month: 10 }, users_permissions_user: null }
        ] }
      }
      if (url.startsWith('phase-expenses/assigned')) return { data: { invoices: [], expenses: [] } }
      return { data: [] }
    })
    const vm = {
      year: 2026, month: null, quarter: null, contact: null, project: null, paid: null,
      serial: null, code: null, documentType: 0,
      assignedToProject: () => false, formatDate: v => v || '', zeroPad: v => v
    }
    await ReceivedInvoicesTable.methods.getData.call(vm)
    expect(vm.emittedCSV.map(r => [r.num, r.tipus, r.proveidor, r.pagada])).toEqual([
      ['2026-10-anna', 'Nòmina', 'Anna Puig', '2026-10-31'],
      ['2026-10-usuari esborrat', 'Nòmina', 'usuari esborrat', '']
    ])
    expect(vm.emittedCSV[0].cobrada).toBeUndefined()
  })
})

describe('Pressupostos export (issues/277)', () => {
  it('fills data and concepte, and calls the contact «client»', async () => {
    api.get.mockReset()
    api.get.mockImplementation(async () => ({ data: [
      { id: 1, code: 'P-1', emitted: '2026-03-05', contact: { name: 'Coop', nif: 'F1' }, lines: [{ concept: 'Disseny' }], total_base: 100 },
      { id: 2, code: 'P-2', emitted: '2026-04-01', contact: null, lines: [], document_concept: 'General' }
    ] }))
    const vm = { year: '2026', formatDate: QuotesTable.methods.formatDate }
    await QuotesTable.methods.getData.call(vm)
    expect(vm.emittedCSV.map(r => [r.num, r.data, r.client, r.concepte])).toEqual([
      ['P-1', '05/03/2026', 'Coop', 'Disseny'],
      ['P-2', '01/04/2026', '', 'General']
    ])
    expect(vm.emittedCSV[0].proveidor).toBeUndefined()
  })
})
