// issues/119: orders had no history, so nobody could tell who moved an order
// to which status, or when. The order form's «Historial» now lists the
// backend's change log (GET /orders/:id/history): who, when, field: from → to.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { formatValue, historyEntries } from '@/domain/orderHistory'

const ROWS = [
  {
    id: 3,
    action: 'update',
    username: 'oficina',
    createdAt: '2026-10-18T09:30:00.000Z',
    changes: [
      { field: 'status', from: 'delivered', to: 'invoiced' },
      { field: 'emitted_invoice', from: null, to: { id: 100, label: 'F-2026-0100' } }
    ]
  },
  {
    id: 1,
    action: 'create',
    username: 'granja',
    createdAt: '2026-10-17T07:00:00.000Z',
    changes: null,
    snapshot: { status: 'pending' }
  }
]

const api = { get: vi.fn(async () => ({ data: ROWS })) }
vi.mock('@/service/index', () => ({ default: () => api }))
import OrderHistory from '@/components/OrderHistory.vue'

describe('order history entries (issues/119)', () => {
  it('names the action, the field and the old and new values', () => {
    const [invoiced, created] = historyEntries(ROWS)
    expect(invoiced).toMatchObject({ title: 'Modificada', who: 'oficina' })
    expect(invoiced.changes).toEqual([
      { field: 'status', label: 'Estat', from: 'Lliurada', to: 'Facturada' },
      { field: 'emitted_invoice', label: 'Factura', from: '—', to: 'F-2026-0100' }
    ])
    expect(created).toMatchObject({ title: 'Creada', who: 'granja', detail: 'Estat: Pendent', changes: [] })
  })

  it('formats the values the office reads', () => {
    expect(formatValue('refrigerated', true)).toBe('Sí')
    expect(formatValue('route_date', '2026-10-20')).toBe('20/10/2026')
    expect(formatValue('price', '12.50')).toBe('12,50 €')
    expect(formatValue('route', { id: 4, label: 'Ruta Sud' })).toBe('Ruta Sud')
    expect(formatValue('lines', [{ units: 2, kilograms: 10 }, { units: 1, kilograms: 2.5 }])).toBe('2 línies · 3 u. · 12,5 kg')
    expect(formatValue('comments', '')).toBe('—')
  })

  it('says who made a change without a user', () => {
    expect(historyEntries([{ id: 1, action: 'update', changes: [] }])[0].who).toBe('Sistema')
  })
})

describe('OrderHistory box', () => {
  beforeEach(() => api.get.mockClear())

  const mountBox = props =>
    mount(OrderHistory, { props, global: { plugins: [Buefy], config: { warnHandler: () => {} } } })

  it("reads the order's history and lists it", async () => {
    const w = mountBox({ orderId: 42 })
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('orders/42/history')
    const items = w.findAll('.history > li')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Modificada')
    expect(items[0].text()).toContain('oficina')
    expect(items[0].find('.history-from').text()).toBe('Lliurada')
    expect(items[0].find('.history-to').text()).toBe('Facturada')
  })

  it('reads it again after a save', async () => {
    const w = mountBox({ orderId: 42, refreshKey: 1 })
    await flushPromises()
    await w.setProps({ refreshKey: 2 })
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(2)
  })
})
