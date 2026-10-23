// issues/153: «Facturar» created the invoices without asking, «Factura la
// selecció» also invoiced rows ticked under another month, and a row's
// «Factura» was enabled as soon as something was typed in the project field.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const post = vi.fn(async () => ({ data: {} }))
const get = vi.fn(async url => {
  if (url.startsWith('orders/for-invoicing')) {
    return {
      data: [
        { id: 1, owner: { id: 7, fullname: 'Mas Alba' }, estimated_delivery_date: '2026-09-10', price: 10, units: 1, kilograms: 1 },
        { id: 2, owner: { id: 7, fullname: 'Mas Alba' }, estimated_delivery_date: '2026-10-02', price: 20, units: 1, kilograms: 1 }
      ]
    }
  }
  if (url.startsWith('projects/basic')) return { data: [{ id: 30, name: '4T 2026 - Logística' }] }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put: vi.fn() }) }))
import OrdersInvoiceTable from '@/components/OrdersInvoiceTable.vue'

async function mountTable () {
  const wrapper = mount(OrdersInvoiceTable, {
    global: { plugins: [Buefy], stubs: { TitleBar: true, 'download-excel': true, 'router-link': true } }
  })
  await flushPromises()
  return wrapper
}

describe('Facturar (issues/153)', () => {
  beforeEach(() => { post.mockClear() })

  it('invoices only the ticked rows of the month shown', async () => {
    const wrapper = await mountTable()
    const vm = wrapper.vm
    vm.selected = vm.groups.map(g => g.key)
    vm.monthFilter = '2026-10'
    await flushPromises()
    expect(vm.selectedGroups.map(g => g.month)).toEqual(['2026-10'])
    expect(vm.selectedOrders).toBe(1)
  })

  it('asks before invoicing, with the count and the amount', async () => {
    const wrapper = await mountTable()
    const vm = wrapper.vm
    vm.projectId = 30
    vm.selected = vm.groups.map(g => g.key)
    const confirm = vi.spyOn(vm.$buefy.dialog, 'confirm').mockImplementation(() => {})
    await vm.invoiceSelection()
    expect(post).not.toHaveBeenCalled()
    expect(confirm).toHaveBeenCalledTimes(1)
    const { message, onConfirm } = confirm.mock.calls[0][0]
    expect(message).toContain('2 factures')
    expect(message).toContain('2 comandes')
    expect(message).toMatch(/30,00/)
    await onConfirm()
    await flushPromises()
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('asks before invoicing a single row', async () => {
    const wrapper = await mountTable()
    const vm = wrapper.vm
    vm.projectId = 30
    const confirm = vi.spyOn(vm.$buefy.dialog, 'confirm').mockImplementation(() => {})
    await vm.invoiceGroup(vm.groups[0])
    expect(post).not.toHaveBeenCalled()
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it("keeps a row's «Factura» disabled until a project is picked", async () => {
    const wrapper = await mountTable()
    wrapper.vm.projectSearch = 'Logís'
    await flushPromises()
    const rowButton = wrapper.findAll('button').find(b => b.text() === 'Factura')
    expect(rowButton.attributes('disabled')).toBeDefined()
  })
})
