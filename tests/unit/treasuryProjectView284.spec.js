// issues/284: Tresoreria «Filtra per projecte» kept the company's balance as
// the start («Inici Any» / «Avui» seeds), so «Saldo a 31/12» was the company's
// start plus the project's flows. With a project chosen the view now starts at
// 0 and shows only the project's movements; the accounts' noted balances (a
// company figure) are left out.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'
import { projectTreasuryRows, withProjectSaldo, projectSaldoToday } from '@/domain/projectTreasury'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'
// these tests draw given data: the page's own first load (asked at mount since
// issues/307, tresoreriaInitialLoad309.spec.js) stays out of them
vi.spyOn(TresoreriaTable.methods, 'getInitialData').mockResolvedValue(undefined)

const P = { id: 7, name: 'Projecte' }
const rows = () => [
  { type: 'Inici Any', datef: '20260101', total_amount: 0, subtotal: 50000, account_subtotal: 50000, bank_account: 'A' },
  { type: 'Saldo bancari', datef: '20260115', is_balance_annotation: true, account_balance: 60000, total_amount: 0, subtotal: 60000, bank_account: 'A' },
  { type: 'Factura', concept: 'cobrament', datef: '20260201', total_amount: 1000, subtotal: 61000, project_id: 7, project_name: 'Projecte', bank_account: 'A' },
  { type: 'Factura', concept: 'altre', datef: '20260210', total_amount: 5000, subtotal: 66000, project_id: 8, project_name: 'Altre', bank_account: 'A' },
  { type: 'Avui', datef: '20260301', total_amount: 0, subtotal: 66000, account_subtotal: 66000, bank_account: 'A' },
  { type: 'Despesa esperada', concept: 'pagament', datef: '20260601', total_amount: -300.5, subtotal: 65699.5, project_id: 7, project_name: 'Projecte', bank_account: 'A' },
  { type: 'Factura', concept: 'desembre', datef: '20261201', total_amount: 200, subtotal: 65899.5, project_id: 8, project_name: 'Altre', bank_account: 'A' }
]

describe('project view helpers (issues/284)', () => {
  it('keeps the project rows and the markers, without the noted balances', () => {
    expect(projectTreasuryRows(rows(), 7).map(r => r.type)).toEqual(['Inici Any', 'Factura', 'Avui', 'Despesa esperada'])
  })

  it('runs the saldo from 0', () => {
    expect(withProjectSaldo(projectTreasuryRows(rows(), 7)).map(r => r.subtotal)).toEqual([0, 1000, 1000, 699.5])
  })

  it('saldo today: the project flows of the year before today', () => {
    expect(projectSaldoToday(projectTreasuryRows(rows(), 7), 2026, '20260301')).toBe(1000)
    expect(projectSaldoToday(projectTreasuryRows(rows(), 7), 2026, '20261231')).toBe(699.5)
  })
})

describe('Tresoreria with a project chosen (issues/284)', () => {
  async function mountTreasury () {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }, { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }] })
    await router.push('/')
    const w = mount(TresoreriaTable, {
      global: {
        plugins: [createPinia(), Buefy, router],
        stubs: { TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
        config: { warnHandler: () => {} }
      }
    })
    await w.setData({ selectedYear: 2026, treasuryData: rows() })
    await flushPromises()
    return w
  }

  it('starts at 0 and ends the year with the project result only', async () => {
    const w = await mountTreasury()
    // the company: start 50.000, year end = 50.000 + 1.000 + 5.000 − 300,50 + 200
    expect(w.vm.todaySubTotal).toBe(50000)
    expect(w.vm.yearEnd.subtotal).toBeCloseTo(55899.5)
    w.vm.projectSelected(P)
    await flushPromises()
    expect(w.vm.todaySubTotal).toBe(0)
    expect(w.vm.yearEnd.subtotal).toBeCloseTo(699.5)
    expect(w.vm.yearEnd.total_amount).toBeCloseTo(699.5)
    expect(w.vm.accountRows).toEqual([])
    // the movements list: the project's rows with its own running saldo
    const shown = w.vm.movementsShown.map(r => [r.type, r.subtotal])
    expect(shown).toEqual([['Despesa esperada', 699.5], ['Avui', 1000], ['Factura', 1000], ['Inici Any', 0]])
  })
})

// issues/284 follow-up (2026-10-20): in «Des d'avui» mode a chosen project
// started at 0 on today's date, so «Saldo a 31/12» lost the year's flows
// before today (Indicadors showed the right one); and the «Per projecte»
// pivot kept the company figures after a project was picked, because the
// watcher's read() re-read the rows the grid was created with.
describe('Tresoreria project view follow-ups (issues/284)', () => {
  async function mountTreasury (attachTo) {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }, { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }] })
    await router.push('/')
    const w = mount(TresoreriaTable, {
      attachTo,
      global: {
        plugins: [createPinia(), Buefy, router],
        stubs: { TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
        config: { warnHandler: () => {} }
      }
    })
    await w.setData({ selectedYear: 2026, treasuryData: rows() })
    await flushPromises()
    return w
  }

  it("«Des d'avui» starts at the project's saldo today: same year end as «Inici d'any»", async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 2, 1, 12))
    try {
      const w = await mountTreasury()
      w.vm.projectSelected(P)
      await flushPromises()
      expect(w.vm.yearEnd.subtotal).toBeCloseTo(699.5)
      await w.setData({ view: 'today' })
      await flushPromises()
      expect(w.vm.todaySubTotal).toBe(1000)
      expect(w.vm.yearEnd.subtotal).toBeCloseTo(699.5)
    } finally {
      vi.useRealTimers()
    }
  })

  it('the «Per projecte» pivot redraws when a project is picked', async () => {
    const fs = await import('node:fs')
    const vendor = `${process.cwd()}/public/vendor/`
    // the real jQuery + Kendo the page loads, in the test's window
    ;(0, eval)(fs.readFileSync(vendor + 'jquery/jquery.js', 'utf8'))
    ;(0, eval)(fs.readFileSync(vendor + 'kendo/kendo.all.min.js', 'utf8'))
    const { default: configPivot } = await import('@/service/configStatsTreasury')
    const host = document.createElement('div')
    document.body.appendChild(host)
    const w = await mountTreasury(host)
    configPivot.dataSource.data = w.vm.pivotData2
    w.vm.initializePivotWithViews('#project-stats', configPivot)
    const cells = () => w.vm.pivotGridInstance.dataSource.data().map(c => c.value)
    // Resultat, Cobraments, Pagaments (grand total, then 2026)
    expect(cells().slice(0, 3)).toEqual([5899.5, 6200, -300.5])
    w.vm.projectSelected(P)
    await flushPromises()
    expect(cells().slice(0, 3)).toEqual([699.5, 1000, -300.5])
    w.unmount()
    host.remove()
  })
})
