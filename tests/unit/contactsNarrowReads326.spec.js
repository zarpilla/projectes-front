// issues/326 (Loki, 14 days to 2026-10-23): three contact lists went to the
// core route `contacts?…`, which the backend's v3-compat answers with
// populate=*: the contact form's collection points (7.7–19.6 s on diligencia),
// «Sòcies» and «Facturar» (0.8–1.8 s each). They read only a few fields of each
// contact, so they ask `contacts/basic` now, which keeps the role scoping and
// is served by the read cache.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const MEMBER_CONTACTS = [
  { id: 20, name: 'Mas Alba', partner_amount: '150', partner_amount_date: '2026-01-10', users_permissions_user: { id: 3 } },
  { id: 21, name: 'Cal Pere', partner_amount: null, users_permissions_user: { id: 4 } }
]
const POINTS = [
  { id: 30, name: 'Fleca', trade_name: 'Recollida en finca - Mas Alba [Dt 10h]' },
  { id: 31, name: 'Botiga', trade_name: null }
]
const USERS = [
  { id: 3, username: 'anna', confirmed: true, blocked: false, permissions: [{ permission: 'orders' }] },
  { id: 4, username: 'bernat', confirmed: true, blocked: false, permissions: [{ permission: 'orders' }] }
]

const get = vi.fn(async (url = '') => {
  if (url.startsWith('users')) return { data: structuredClone(USERS) }
  if (url.startsWith('orders/for-invoicing')) {
    return { data: [{ id: 1, owner: { id: 3, fullname: 'Anna' }, estimated_delivery_date: '2026-10-02', price: 10, units: 2, kilograms: 3, emitted_invoice: null }] }
  }
  if (url.includes('users_permissions_user_gt')) return { data: structuredClone(MEMBER_CONTACTS) }
  if (url.includes('owner_gt')) return { data: structuredClone(POINTS) }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, post: vi.fn(), put: vi.fn() }) }))
import UsersTable from '@/components/UsersTable.vue'
import OrdersInvoiceTable from '@/components/OrdersInvoiceTable.vue'
import ContactsForm from '@/components/ContactsForm.vue'

const contactUrls = () => get.mock.calls.map(c => String(c[0])).filter(u => u.startsWith('contacts'))

beforeEach(() => get.mockClear())

describe('contact lists read contacts/basic (issues/326)', () => {
  it('«Sòcies» finds each member’s contact on the narrow list', async () => {
    const w = mount(UsersTable, { global: { plugins: [Buefy, createPinia()], stubs: { RouterLink: true, 'download-excel': true } } })
    await flushPromises()
    expect(contactUrls()).toEqual(['contacts/basic?_limit=-1&_sort=name:ASC&_where[users_permissions_user_gt]=0'])
    expect(w.vm.users.map(u => [u.id, u.contact && u.contact.id, u.amount])).toEqual([[3, 20, 150], [4, 21, 0]])
  })

  it('«Facturar» finds the member’s contact on the narrow list', async () => {
    const w = mount(OrdersInvoiceTable, {
      global: { plugins: [Buefy], stubs: { TitleBar: true, 'download-excel': true, 'router-link': true } }
    })
    await flushPromises()
    expect(contactUrls()).toEqual(['contacts/basic?_limit=-1&_sort=name:ASC&_where[users_permissions_user_gt]=0'])
    expect(w.vm.groups.map(g => g.contact && g.contact.name)).toEqual(['Mas Alba'])
  })

  it('the contact form lists the collection points from the unify modal’s list', async () => {
    const vm = { form: { id: 31 }, availableCollectionPoints: [] }
    await ContactsForm.methods.loadCollectionPoints.call(vm)
    expect(contactUrls()).toEqual(['contacts/basic?_limit=-1&_where[owner_gt]=0&_sort=trade_name:ASC'])
    // itself left out; id, name and trade_name are what the autocomplete reads
    expect(vm.availableCollectionPoints.map(c => [c.id, c.display])).toEqual([
      [30, 'Recollida en finca - Mas Alba [Dt 10h] (30)']
    ])
  })
})
