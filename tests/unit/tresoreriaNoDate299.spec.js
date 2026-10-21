// issues/299 (review 9, 2026-10-20): the «Previsió mensual» row «Sense data»
// showed a Saldo final (751.454,59 €) right under «Total 2026 … 93.584,15 €»:
// the running balance carried on through the hidden later years and the undated
// amounts, while the warning above says the undated amounts «no entren a la
// previsió». The row keeps its amounts but has no Saldo final.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'
// these tests draw given data: the page's own first load (asked at mount since
// issues/307, tresoreriaInitialLoad309.spec.js) stays out of them
vi.spyOn(TresoreriaTable.methods, 'getInitialData').mockResolvedValue(undefined)

const movement = (id, datef, total_amount) => ({
  id, datef, type: 'Factura', concept: `Moviment ${id}`, total_amount, subtotal: 0
})

async function mountTable (rows) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/project/:id', name: 'project.edit', component: { template: '<div/>' } }
    ]
  })
  await router.push('/?year=2026')
  const w = mount(TresoreriaTable, {
    global: {
      plugins: [createPinia(), Buefy, router],
      stubs: { TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
      config: { warnHandler: () => {} }
    }
  })
  await w.setData({ selectedYear: 2026, treasuryData: rows })
  await flushPromises()
  return w
}

describe('Tresoreria «Sense data» row (issues/299)', () => {
  const rows = () => [
    { type: 'Inici Any', datef: '20260101', total_amount: 0, subtotal: 1000 },
    movement(1, '20260305', 100),
    movement(2, '20271005', 300),
    // the API sends an undated movement with datef «Invalid date»
    movement(3, 'Invalid date', 50)
  ]
  const rowOf = (w, label) => w.findAll('.forecast-months tbody tr').find(tr => tr.find('th').text().startsWith(label))
  const cells = tr => tr.findAll('td').map(td => td.text())

  it('shows the undated amounts without a Saldo final and with the warning', async () => {
    const w = await mountTable(rows())
    const noDate = rowOf(w, 'Sense data')
    expect(noDate).toBeTruthy()
    expect(cells(noDate)).toEqual(['50,00 €', '0,00 €', '+50,00 €', '—'])
    expect(w.find('.tres-nodate').text()).toContain('no entren a la previsió')
  })

  it('keeps them out of the running balance', async () => {
    const w = await mountTable(rows())
    expect(cells(rowOf(w, 'Març'))[3]).toBe('1.100,00 €')
    const months = w.vm.pivotData.filter(d => d.month !== '99')
    expect(months[months.length - 1].subtotal).toBe(1400)
    expect(w.vm.noDate.total_incomes).toBe(50)
  })

  // CI 2026-10-20: the jQuery wait kept firing after the test environment was torn
  // down («window is not defined», an unhandled error that failed the run)
  it('stops waiting for jQuery when unmounted', async () => {
    vi.useFakeTimers()
    try {
      const w = await mountTable(rows())
      expect(vi.getTimerCount()).toBeGreaterThan(0)
      w.unmount()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
