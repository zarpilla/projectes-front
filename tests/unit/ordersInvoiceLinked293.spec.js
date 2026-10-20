// issues/293 (review 9, 2026-10-20): an order moved from Facturada back to
// Lliurada keeps its invoice link (240 warns so). Facturar listed and counted
// it (Muda: 1 order, 11,43 €; «Per facturar» 176,93 → 188,36 €) and «Factura»
// then got a 409 «ja estan facturades». Such orders are now left out of the
// list and the totals, and a notice names them.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { groupOrders, linkedToInvoice } from '@/domain/logisticsInvoicing.js'

const owner = { id: 7, fullname: 'Mas Alba' }
const muda = { id: 8, fullname: 'Muda' }
const get = vi.fn(async url => {
  if (url.startsWith('orders?')) {
    return {
      data: [
        { id: 1, owner, estimated_delivery_date: '2026-10-02', price: 10, units: 1, kilograms: 1, emitted_invoice: null },
        { id: 24460, owner: muda, estimated_delivery_date: '2026-10-03', price: 11.43, units: 1, kilograms: 1, emitted_invoice: { id: 890, state: 'draft' } }
      ]
    }
  }
  if (url.startsWith('projects/basic')) return { data: [{ id: 30, name: '4T 2026 - Logística' }] }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, post: vi.fn(), put: vi.fn() }) }))
import OrdersInvoiceTable from '@/components/OrdersInvoiceTable.vue'

const RouterLink = { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' }

describe('Facturar leaves out delivered orders still on an invoice (issues/293)', () => {
  it('tells a linked order apart, as an object or an id', () => {
    expect(linkedToInvoice({ emitted_invoice: { id: 890 } })).toBe(true)
    expect(linkedToInvoice({ emitted_invoice: 890 })).toBe(true)
    expect(linkedToInvoice({ emitted_invoice: null })).toBe(false)
    expect(linkedToInvoice({})).toBe(false)
  })

  it('does not group them', () => {
    const groups = groupOrders([
      { id: 1, owner, estimated_delivery_date: '2026-10-02', price: 10 },
      { id: 2, owner, estimated_delivery_date: '2026-10-02', price: 5, emitted_invoice: { id: 890 } }
    ])
    expect(groups.map(g => [g.orders, g.amount])).toEqual([[[1], 10]])
  })

  it('keeps them out of the list and the totals, and names them', async () => {
    const wrapper = mount(OrdersInvoiceTable, {
      global: { plugins: [Buefy], stubs: { TitleBar: true, 'download-excel': true, 'router-link': RouterLink } }
    })
    await flushPromises()
    const vm = wrapper.vm
    expect(vm.groups.map(g => g.owner.id)).toEqual([7])
    expect(vm.totals.count).toBe(1)
    expect(vm.totals.amount).toBe(10)
    expect(wrapper.find('.linked-orders').text()).toContain('24460')
  })

  // the user's decision (2026-10-20, «tu mateix»): the notice links each
  // order (its view) and its invoice (its document page)
  it('links each order and its invoice', async () => {
    const wrapper = mount(OrdersInvoiceTable, {
      global: { plugins: [Buefy], stubs: { TitleBar: true, 'download-excel': true, 'router-link': RouterLink } }
    })
    await flushPromises()
    const links = wrapper.findAll('.linked-orders a').map(a => [JSON.parse(a.attributes('data-to')), a.text()])
    expect(links).toEqual([
      [{ name: 'orders.view.detail', params: { id: 24460 } }, '#24460'],
      [{ name: 'document.edit', params: { id: 890, type: 'emitted-invoices' } }, 'factura esborrany #890']
    ])
    expect(OrdersInvoiceTable.methods.linkedInvoice({ emitted_invoice: { id: 633, code: '2026-12', state: 'emitted' } })).toEqual({ id: 633, label: '2026-12' })
  })
})
