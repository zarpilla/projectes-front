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
  project: { id: 30, name: '3T 2026 - Logística' }, otherProjects: [], autoProjects: [{ id: 30 }], cronDone: false,
  runs: [{ id: 1, month: '2026-10', status: 'partial', trigger: 'manual', user: 'Carla', finished_at: '2026-11-12T18:07:00Z', report: { ...REPORT, preview: false } }]
}
let status = STATUS
const get = vi.fn(async url => {
  if (url === 'auto-invoicing/status') return { data: status }
  if (url.startsWith('member-notices')) return { data: [{ id: 5, title: "No s'ha pogut generar la factura d'octubre 2026", text: 'Comandes sense preu: 24799' }] }
  return { data: [] }
})
const post = vi.fn(async url => ({ data: url === 'auto-invoicing/run' ? { ...REPORT, preview: false } : REPORT }))
const put = vi.fn(async (url, data) => ({ data }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put, delete: vi.fn() }) }))

import AutoInvoicingPanel from '@/components/AutoInvoicingPanel.vue'
import AutoInvoicingReport from '@/components/AutoInvoicingReport.vue'
import Avisos from '@/views/Avisos.vue'
import ProjectForm from '@/views/ProjectForm.vue'
import { ofMonth, sortedMembers, monthOptions, autoRunLabel } from '@/domain/autoInvoicing'

const router = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/projecte/:id', name: 'project.edit', component: { template: '<div />' } },
    { path: '/document/:type/:id', name: 'document.edit', component: { template: '<div />' } }
  ]
})
const plugins = () => [createPinia(), Buefy, router()]

beforeEach(() => { status = STATUS; get.mockClear(); post.mockClear(); put.mockClear() })

describe('the panel in Facturar (issues/430)', () => {
  it('says when it runs next and on which project', async () => {
    const w = mount(AutoInvoicingPanel, { global: { plugins: plugins() } })
    await flushPromises()
    expect(w.text()).toContain('Propera: divendres 27/11/2026 a les 14:10 · novembre 2026')
    expect(w.text()).toContain('3T 2026 - Logística')
    expect(w.text()).toContain('Amb incidències')
  })

  it('tells how to turn it on when no project has it', async () => {
    status = { ...STATUS, project: null, autoProjects: [], runs: [] }
    const w = mount(AutoInvoicingPanel, { global: { plugins: plugins() } })
    await flushPromises()
    expect(w.find('[data-test="disabled"]').exists()).toBe(true)
    expect(w.text()).toContain('Desactivada')
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
  it('the office and admins may turn it on', async () => {
    const vm = { canAutoInvoice: false }
    get.mockImplementationOnce(async () => ({ data: { permissions: [{ permission: 'orders_admin' }] } }))
    await ProjectForm.methods.loadAutoInvoicePermission.call(vm)
    expect(vm.canAutoInvoice).toBe(true)
    get.mockImplementationOnce(async () => ({ data: { permissions: [{ permission: 'projects' }] } }))
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
