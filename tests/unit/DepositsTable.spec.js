// issues/147: Dipòsits loaded the orders with `_limit=50` and then took the number
// of rows received as the total, so the table never went past the first page (170
// pending deposits in the logistics copy) and the «Punt» chips filtered only those
// 50. Every matching order is loaded now; the table pages them.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const GIRONA = { id: 1, name: 'Girona', pickup: false }
const FINCA = { id: 2, name: 'La finca', pickup: true }

// 170 pending orders: the first 20 at Girona, the rest at the farm
const allOrders = Array.from({ length: 170 }, (_, i) => ({
  id: 1000 - i,
  status: 'pending',
  owner: { id: 5, fullname: `Sòcia ${i}` },
  pickup: i < 20 ? GIRONA : FINCA,
  units: 1,
  kilograms: 1
}))

const api = {
  get: vi.fn(async url => {
    if (url.startsWith('users/me')) return { data: { id: 5, permissions: [{ permission: 'orders_admin' }] } }
    if (url.startsWith('pickups')) return { data: [GIRONA, FINCA] }
    if (url.startsWith('orders/count')) return { data: 170 }
    if (url.startsWith('orders?')) {
      const limit = Number((url.match(/_limit=(-?\d+)/) || [])[1] ?? 100)
      const start = Number((url.match(/_start=(\d+)/) || [])[1] ?? 0)
      return { data: limit < 0 ? allOrders.slice(start) : allOrders.slice(start, start + limit) }
    }
    return { data: [] }
  })
}
vi.mock('@/service/index', () => ({ default: () => api }))
import DepositsTable from '@/components/DepositsTable.vue'

async function mountTable () {
  const w = mount(DepositsTable, {
    global: {
      plugins: [createPinia(), Buefy],
      stubs: { TitleBar: true, QRScannerModal: true, RouterLink: { template: '<a><slot/></a>' } },
      config: { warnHandler: () => {} }
    }
  })
  await flushPromises()
  return w
}

describe('Dipòsits list (issues/147)', () => {
  beforeEach(() => { api.get.mockClear() })

  it('reaches every pending order, not only the first 50', async () => {
    const w = await mountTable()
    expect(w.vm.total).toBe(170)
    expect(w.findAll('tbody tr')).toHaveLength(50)
    // a «per pàgina» select and pages past the first one
    expect(w.find('select').exists()).toBe(true)
    expect(w.find('.pagination').text()).toContain('4')
  })

  it('applies the Punt filter to all of them', async () => {
    const w = await mountTable()
    w.vm.setPickupFilter('finca')
    await flushPromises()
    expect(w.vm.total).toBe(150)
    w.vm.setPickupFilter(GIRONA.id)
    await flushPromises()
    expect(w.vm.total).toBe(20)
  })
})
