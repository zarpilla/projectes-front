// issues/317 (2026-10-22): opening an invoice on ladili_test took ~17 s. Just
// before, «Facturar» had asked for every delivered order with populate=*
// (8–9 s on the VPS) and the invoice's requests waited behind it. Facturar now
// reads GET /orders/for-invoicing: the amounts, the member and the linked
// invoice of the delivered orders, nothing else.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const get = vi.fn(async url => {
  if (url.startsWith('orders/for-invoicing')) {
    return { data: [{ id: 1, owner: { id: 7, fullname: 'Mas Alba' }, estimated_delivery_date: '2026-10-02', price: 10, units: 2, kilograms: 3, emitted_invoice: null }] }
  }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, post: vi.fn(), put: vi.fn() }) }))
import OrdersInvoiceTable from '@/components/OrdersInvoiceTable.vue'

describe('Facturar reads the light delivered orders list (issues/317)', () => {
  it('asks orders/for-invoicing, never orders?populate', async () => {
    const wrapper = mount(OrdersInvoiceTable, {
      global: { plugins: [Buefy], stubs: { TitleBar: true, 'download-excel': true, 'router-link': true } }
    })
    await flushPromises()
    const urls = get.mock.calls.map(c => c[0])
    expect(urls).toContain('orders/for-invoicing')
    expect(urls.some(u => u.startsWith('orders?'))).toBe(false)
    expect(wrapper.vm.groups.map(g => [g.owner.id, g.amount, g.units])).toEqual([[7, 10, 2]])
  })
})
