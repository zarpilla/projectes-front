// issues/425: the Tresoreria «Moviments bancaris» tabs go by date, executed
// movements included: «Pròxims» from today on, «Anteriors» before today, and
// «Executats» is gone. The header's «Endarrerits» figure still opens the
// planned movements whose date is past. The «Avui» / balance rows get their
// own class, readable in the dark theme (Bulma's warning-light was not).
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'
vi.spyOn(TresoreriaTable.methods, 'getInitialData').mockResolvedValue(undefined)

// showOverdue scrolls to the list: jsdom has no scrolling
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {})

const row = (id, datef, extra) => ({ id, datef, type: 'Factura', concept: `Moviment ${id}`, total_amount: 100, subtotal: 100, contact: 'Clienta', ...extra })

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
  await w.setData({
    selectedYear: 2026,
    treasuryData: [
      row(1, '20260105', { paid: false }), // planned, past: overdue
      row(2, '20260110', { paid: true, real: true }), // executed, past
      row(3, '20261231', { paid: false }), // planned, next
      row(4, '20261230', { paid: true }), // executed (paid) with a future date
      { id: 9, datef: '20260615', type: 'Avui', subtotal: 50, total_amount: 0 }
    ]
  })
  await flushPromises()
  return w
}

const shownIds = w => w.vm.movementsShown.filter(r => w.vm.isMovement(r)).map(r => r.id).sort()

describe('Tresoreria movement tabs (issues/425)', () => {
  beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 5, 15, 12)) })
  afterAll(() => { vi.useRealTimers() })

  it('offers Tots, Pròxims and Anteriors, without Executats', async () => {
    const w = await mountTreasury()
    expect(w.vm.movementTabs.map(t => t.label)).toEqual(['Tots', 'Pròxims', 'Anteriors'])
    expect(w.vm.movementTabs.map(t => t.count)).toEqual([null, 2, 2])
  })

  it('«Pròxims» and «Anteriors» list executed movements too', async () => {
    const w = await mountTreasury()
    await w.setData({ movementsTab: 'next' })
    expect(shownIds(w)).toEqual([3, 4])
    await w.setData({ movementsTab: 'past' })
    expect(shownIds(w)).toEqual([1, 2])
  })

  it('the header «Endarrerits» still opens only the planned past ones', async () => {
    const w = await mountTreasury()
    expect(w.vm.overdueCount).toBe(1)
    w.vm.showOverdue()
    await flushPromises()
    expect(shownIds(w)).toEqual([1])
    expect(w.vm.movementTabs.map(t => t.label)).toEqual(['Tots', 'Pròxims', 'Anteriors', 'Endarrerits'])
  })

  it('marks the «Avui» row with its own class, not Bulma warning-light', async () => {
    const w = await mountTreasury()
    const tr = w.findAll('tr').find(t => t.text().includes('Avui') && t.find('td').exists())
    expect(tr.classes()).toContain('tres-marker-row')
    expect(tr.classes()).not.toContain('has-background-warning-light')
  })
})
