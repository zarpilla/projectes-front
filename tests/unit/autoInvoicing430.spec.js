// issues/430 (Joel, la Diligència): the automatic monthly invoicing. In
// Logística › Facturar the office sees when it runs and on which project,
// previews a month, runs it by hand and reads the reports. A member whose
// draft could not be made is told in Avisos. The option is on the project.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const REPORT = {
  month: '2026-10', monthName: 'octubre 2026', invoiceDay: '2026-10-31', project: { id: 30, name: '3T 2026 - Logística' },
  fatal: [], drafts: 1, blocked: 1, withWarnings: 1, preview: true,
  reconciliation: { ok: false, expected: { count: 3, amount: 30 }, invoicedNow: { count: 2, amount: 20 }, invoicedBefore: { count: 0, amount: 0 }, missing: { count: 1, amount: 10, orders: [24799] } },
  members: [
    { owner: 1, name: 'Arelia Bio', orders: 2, current: 1, amount: 20, blockers: [], warnings: [{ text: 'Comandes de març encara no lliurades', orders: [16090] }], status: 'ready' },
    { owner: 2, name: 'Tatjé', orders: 1, current: 1, amount: 0, blockers: [{ text: 'Comandes sense preu', orders: [24799] }], warnings: [], status: 'blocked' }
  ]
}
const STATUS = {
  month: '2026-11', monthName: 'novembre 2026', runAt: '2026-11-27 14:10', invoiceDay: '2026-11-30',
  project: { id: 31, name: '4T 2026 - Logística' }, otherProjects: [], autoProjects: [{ id: 31 }], cronDone: false,
  quarter: { year: 2026, quarter: 4, label: '4T 2026', date_start: '2026-10-01', date_end: '2026-12-31' },
  quarterProject: { id: 31, name: '4T 2026 - Logística', auto_invoicing: true }, latestProject: { id: 31, name: '4T 2026 - Logística', auto_invoicing: true }, newProjectName: null,
  runs: [{ id: 1, month: '2026-10', status: 'partial', trigger: 'manual', user: 'Carla', finished_at: '2026-11-12T18:07:00Z', report: { ...REPORT, preview: false } }]
}
let status = STATUS
const FOUND_NONE = {
  quarter: STATUS.quarter, project: null, others: [], latest: { id: 30, name: '3T 2026 - Logística', auto_invoicing: true }, newName: '4T 2026 - Logística'
}
let found = FOUND_NONE
const get = vi.fn(async url => {
  if (url === 'auto-invoicing/status') return { data: status }
  if (url.startsWith('auto-invoicing/quarter-project')) return { data: found }
  if (url.startsWith('orders/for-invoicing')) return { data: [{ id: 1, owner: { id: 7, fullname: 'Mas Alba' }, estimated_delivery_date: '2026-11-02', price: 10, units: 1, kilograms: 1, emitted_invoice: null }] }
  if (url.startsWith('projects/basic')) return { data: [{ id: 30, name: '3T 2026 - Logística' }, { id: 99, name: '4T 2026 - Logística' }] }
  if (url.startsWith('member-notices')) return { data: [{ id: 5, title: "No s'ha pogut generar la factura d'octubre 2026", text: 'Comandes sense preu: 24799' }] }
  return { data: [] }
})
const post = vi.fn(async url => {
  if (url === 'auto-invoicing/quarter-project') return { data: { quarter: STATUS.quarter, project: { id: 99, name: '4T 2026 - Logística', auto_invoicing: true } } }
  return { data: url === 'auto-invoicing/run' ? { ...REPORT, preview: false } : REPORT }
})
const put = vi.fn(async (url, data) => ({ data }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put, delete: vi.fn() }) }))

import AutoInvoicingPanel from '@/components/AutoInvoicingPanel.vue'
import AutoInvoicingReport from '@/components/AutoInvoicingReport.vue'
import Avisos from '@/views/Avisos.vue'
import ProjectForm from '@/views/ProjectForm.vue'
import OrdersInvoiceTable from '@/components/OrdersInvoiceTable.vue'
import { ofMonth, sortedMembers, monthOptions, autoRunLabel, newQuarterProjectText } from '@/domain/autoInvoicing'

const router = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/projecte/:id', name: 'project.edit', component: { template: '<div />' } },
    { path: '/document/:type/:id', name: 'document.edit', component: { template: '<div />' } }
  ]
})
const plugins = () => [createPinia(), Buefy, router()]

beforeEach(() => { status = STATUS; found = FOUND_NONE; get.mockClear(); post.mockClear(); put.mockClear() })

describe('the panel in Facturar (issues/430)', () => {
  it('says when it runs next and on which project', async () => {
    const w = mount(AutoInvoicingPanel, { global: { plugins: plugins() } })
    await flushPromises()
    expect(w.text()).toContain('Propera: divendres 27/11/2026 a les 14:10 · novembre 2026')
    expect(w.text()).toContain('4T 2026 - Logística')
    expect(w.text()).toContain('Amb incidències')
  })

  it("tells how to turn it on, on the quarter's project, when no project has it", async () => {
    status = { ...STATUS, project: null, autoProjects: [], quarterProject: { id: 31, name: '4T 2026 - Logística', auto_invoicing: false }, runs: [] }
    const w = mount(AutoInvoicingPanel, { global: { plugins: plugins() } })
    await flushPromises()
    expect(w.find('[data-test="disabled"]').text()).toContain('al projecte del 4T 2026, 4T 2026 - Logística')
    expect(w.text()).toContain('Desactivada')
  })

  it("warns when it is on but the quarter's project doesn't have it", async () => {
    status = { ...STATUS, project: null, autoProjects: [{ id: 30 }], quarterProject: { id: 31, name: '4T 2026 - Logística', auto_invoicing: false } }
    const w = mount(AutoInvoicingPanel, { global: { plugins: plugins() } })
    await flushPromises()
    expect(w.find('[data-test="no-option"]').text()).toContain('no té «Habilitar facturació automàtica»: aquest mes no es generarà res')
    expect(w.text()).toContain('Aturada')
  })

  it("creates the quarter's project in a click when it is missing", async () => {
    status = { ...STATUS, project: null, autoProjects: [{ id: 30 }], quarterProject: null, latestProject: FOUND_NONE.latest, newProjectName: '4T 2026 - Logística' }
    const w = mount(AutoInvoicingPanel, { global: { plugins: plugins() } })
    await flushPromises()
    expect(w.find('[data-test="no-project"]').text()).toContain('Encara no hi ha el projecte de logística del 4T 2026: aquest mes no es generarà res')
    const dialog = vi.spyOn(w.vm.$buefy.dialog, 'confirm').mockImplementation(o => o.onConfirm())
    vi.spyOn(w.vm.$buefy.snackbar, 'open').mockImplementation(() => {})
    await w.find('[data-test="create-quarter-project"]').trigger('click')
    await flushPromises()
    expect(dialog.mock.calls[0][0].message).toContain('«4T 2026 - Logística», actiu, del 01/10/2026 al 31/12/2026')
    expect(post).toHaveBeenCalledWith('auto-invoicing/quarter-project', { month: '2026-11' })
    expect(w.emitted('project-created')[0][0]).toMatchObject({ id: 99 })
  })

  it('previews a month, nothing written', async () => {
    const w = mount(AutoInvoicingPanel, { global: { plugins: plugins() } })
    await flushPromises()
    w.vm.month = '2026-10'
    await w.vm.preview()
    await flushPromises()
    expect(post).toHaveBeenCalledWith('auto-invoicing/preview', { month: '2026-10' })
    expect(w.findAll('[data-test="report-member"]')).toHaveLength(2)
  })

  it('runs it by hand after confirming, and the list reloads', async () => {
    const w = mount(AutoInvoicingPanel, { global: { plugins: plugins() } })
    await flushPromises()
    const dialog = vi.spyOn(w.vm.$buefy.dialog, 'confirm').mockImplementation(o => o.onConfirm())
    vi.spyOn(w.vm.$buefy.snackbar, 'open').mockImplementation(() => {})
    w.vm.month = '2026-10'
    w.vm.confirmRun()
    await flushPromises()
    expect(dialog.mock.calls[0][0].message).toContain("Es generaran ara els esborranys d'octubre 2026")
    expect(post).toHaveBeenCalledWith('auto-invoicing/run', { month: '2026-10' })
    expect(w.emitted('invoiced')).toHaveLength(1)
  })
})

describe("Facturar suggests the quarter's project by the API's rule (issues/430)", () => {
  const mountTable = () => mount(OrdersInvoiceTable, {
    global: { plugins: plugins(), stubs: { TitleBar: true, 'download-excel': true, AutoInvoicingPanel: true } }
  })

  it('the project of the newest month, to use', async () => {
    found = { ...FOUND_NONE, project: { id: 99, name: '4T 2026 - Logística', auto_invoicing: true }, newName: null }
    const w = mountTable()
    await flushPromises()
    expect(get).toHaveBeenCalledWith('auto-invoicing/quarter-project?month=2026-11')
    const box = w.find('[data-test="quarter-suggestion"]')
    expect(box.text()).toContain('Les comandes del 4T 2026 van al projecte 4T 2026 - Logística')
    await box.find('button').trigger('click')
    expect(w.vm.projectId).toBe(99)
  })

  it('none yet: creates it, picks it and lists it', async () => {
    const w = mountTable()
    await flushPromises()
    expect(w.find('[data-test="quarter-suggestion"]').text()).toContain("Encara no hi ha cap projecte de logística per al 4T 2026; l'últim és «3T 2026 - Logística»")
    vi.spyOn(w.vm.$buefy.dialog, 'confirm').mockImplementation(o => o.onConfirm())
    vi.spyOn(w.vm.$buefy.snackbar, 'open').mockImplementation(() => {})
    found = { ...FOUND_NONE, project: { id: 99, name: '4T 2026 - Logística', auto_invoicing: true }, newName: null }
    await w.find('[data-test="create-quarter-project"]').trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('auto-invoicing/quarter-project', { month: '2026-11' })
    expect(w.vm.projectId).toBe(99)
    expect(w.vm.projectSearch).toBe('4T 2026 - Logística')
    expect(w.find('[data-test="quarter-suggestion"]').text()).toContain('van al projecte 4T 2026 - Logística')
  })

  it('says what the new project takes from the last one', () => {
    expect(newQuarterProjectText(FOUND_NONE)).toBe(
      "Es crearà el projecte «4T 2026 - Logística», actiu, del 01/10/2026 al 31/12/2026 i amb una sola fase «Logística». " +
      "Copiarà de «3T 2026 - Logística» el client, el tipus, l'àmbit, la persona responsable i la facturació, i tindrà «Habilitar facturació automàtica»."
    )
  })
})

describe('the report (issues/430)', () => {
  it('blocked members first, the reason and the orders, and whether it adds up', () => {
    const w = mount(AutoInvoicingReport, { props: { report: REPORT }, global: { plugins: plugins() } })
    const rows = w.findAll('[data-test="report-member"]')
    expect(rows[0].text()).toContain('Tatjé')
    expect(rows[0].text()).toContain('Sense esborrany')
    expect(rows[0].text()).toContain('Comandes sense preu: 24799')
    expect(rows[1].text()).toContain('Comandes de març encara no lliurades: 16090')
    expect(w.text()).toContain("Previsualització d'octubre 2026")
    expect(w.text()).toContain('No quadra')
    expect(w.text()).toContain('En falten 1')
  })
})

describe('Avisos (issues/430)', () => {
  it('shows her notice and marks it read', async () => {
    localStorage.setItem('user', JSON.stringify({ permissions: [{ permission: 'orders' }] }))
    const w = mount(Avisos, { global: { plugins: plugins(), stubs: { 'title-bar': true, 'pending-invoices-text': true } } })
    await flushPromises()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/^member-notices\?_where\[read\]=false/))
    const notice = w.find('[data-test="member-notice"]')
    expect(notice.text()).toContain("No s'ha pogut generar la factura d'octubre 2026")
    await w.vm.markRead(w.vm.notices[0])
    expect(put).toHaveBeenCalledWith('member-notices/5', { read: true })
    expect(w.vm.notices).toEqual([])
  })
})

describe('the option on the project (issues/430)', () => {
  it('the office may turn it on', async () => {
    const vm = { canAutoInvoice: false }
    get.mockImplementationOnce(async () => ({ data: { permissions: [{ permission: 'orders_admin' }] } }))
    await ProjectForm.methods.loadAutoInvoicePermission.call(vm)
    expect(vm.canAutoInvoice).toBe(true)
    get.mockImplementationOnce(async () => ({ data: { permissions: [{ permission: 'projects' }] } }))
    await ProjectForm.methods.loadAutoInvoicePermission.call(vm)
    expect(vm.canAutoInvoice).toBe(false)
  })

  // issues/451: admins of tenants without logistics saw the switch too
  it('an admin without the logistics office permission does not see it (issues/451)', async () => {
    const vm = { canAutoInvoice: true }
    get.mockImplementationOnce(async () => ({ data: { permissions: [{ permission: 'admin' }, { permission: 'projects' }] } }))
    await ProjectForm.methods.loadAutoInvoicePermission.call(vm)
    expect(vm.canAutoInvoice).toBe(false)
  })
})

describe('helpers (issues/430)', () => {
  it('apostrophes, order, months', () => {
    expect(ofMonth('octubre 2026')).toBe("d'octubre 2026")
    expect(ofMonth('setembre 2026')).toBe('de setembre 2026')
    expect(sortedMembers([{ name: 'B', blockers: [], warnings: [] }, { name: 'A', blockers: [1], warnings: [] }]).map(m => m.name)).toEqual(['A', 'B'])
    expect(monthOptions(new Date(2026, 10, 12)).map(m => m.value)).toEqual(['2026-11', '2026-10', '2026-09', '2026-08'])
    expect(autoRunLabel('partial')).toBe('Amb incidències')
  })
})
