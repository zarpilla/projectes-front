// 2026-10-25 — «Punts d'entrega» on diligencia drew the plain contacts table
// (Nom / Contacte / Tipus) and froze for seconds before switching to the
// points table. The view flag was only set at the end of the load, the points
// were shown before their order figures, and the requests went one after the
// other. These tests guard that the points table is there from the first
// render, the office requests go out together, the table is filled once, and
// Contactes (projects) still loads its contacts without owner.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const api = { get: vi.fn(), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import ContactsTable from '@/components/ContactsTable.vue'

const mountTable = meta => mount(ContactsTable, {
  global: {
    plugins: [createPinia(), Buefy],
    stubs: { DownloadExcel: true, RouterLink: { template: '<a><slot/></a>' }, ModalBoxUnifyContacts: true },
    mocks: { $route: { meta }, $router: { push: vi.fn() } },
    config: { warnHandler: () => {} }
  }
})

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

beforeEach(() => api.get.mockReset())

describe("Punts d'entrega loading", () => {
  it('shows the points table from the start and asks basic + orders together', async () => {
    const basic = deferred()
    const orders = deferred()
    api.get.mockImplementation(url => {
      if (typeof url !== 'string') return Promise.resolve({ data: {} }) // the main store's own reads
      if (url === 'users/me') return Promise.resolve({ data: { id: 5, permissions: [{ permission: 'orders_admin' }] } })
      if (url.startsWith('contacts/basic')) return basic.promise
      if (url.startsWith('contacts/orders')) return orders.promise
      throw new Error(`unexpected ${url}`)
    })
    const w = mountTable({ userContacts: true })
    expect(w.text()).toContain("Nou punt d'entrega")
    expect(w.text()).not.toContain('Nou contacte')
    await flushPromises()
    const urls = api.get.mock.calls.map(c => c[0])
    expect(urls.some(u => u.startsWith('contacts/basic') && u.includes('owner_ne'))).toBe(true)
    expect(urls.some(u => u.startsWith('contacts/orders'))).toBe(true)

    // the points are not shown until their order figures are in
    basic.resolve({ data: [{ id: 1, name: '3 Pollets', trade_name: '3 Pollets', city: 'Palafrugell' }] })
    await flushPromises()
    expect(w.vm.contacts).toEqual([])
    orders.resolve({ data: [{ id: 1, num_orders: 110, owners_flattened: 'DeBosc', routes_flattened: 'DJ - BAIX EMPORDÀ' }] })
    await flushPromises()
    expect(w.vm.contacts).toHaveLength(1)
    expect(w.vm.contacts[0]).toMatchObject({ num_orders: 110, owners_flattened: 'DeBosc', routes_flattened: 'DJ - BAIX EMPORDÀ' })
    expect(w.text()).toContain('110')
    expect(w.vm.isLoading).toBe(false)
  })

  it('a member gets their points, the multidelivery ones and the ones they ordered to', async () => {
    api.get.mockImplementation(async url => {
      if (typeof url !== 'string') return Promise.resolve({ data: {} }) // the main store's own reads
      if (url === 'users/me') return { data: { id: 5, permissions: [{ permission: 'orders' }] } }
      if (url.includes('_where[owner]=5')) return { data: [{ id: 1, name: 'Meu', city: 'Girona' }] }
      if (url.includes('multidelivery_eq')) return { data: [{ id: 2, name: 'Multi', multidelivery: true }] }
      if (url.startsWith('contacts/withorders')) return { data: [{ id: 1, num_orders: 4 }, { id: 3, name: 'Altre', num_orders: 1 }] }
      if (url.startsWith('cities')) return { data: [{ id: 9, name: 'Girona' }] }
      if (url.startsWith('city-routes/basic')) return { data: [{ city: { id: 9 }, route: { name: 'R1' } }] }
      throw new Error(`unexpected ${url}`)
    })
    const w = mountTable({ userContacts: true })
    await flushPromises()
    expect(w.vm.orders_admin).toBe(false)
    expect(w.vm.contacts.map(c => [c.id, c.num_orders])).toEqual([[1, 4], [2, 0], [3, 1]])
    expect(w.vm.contacts[0].routes).toBe('R1')
  })
})

describe('Contactes (projects) loading', () => {
  it('still loads the contacts without owner, in the contacts table', async () => {
    api.get.mockResolvedValue({ data: [{ id: 7, name: 'Clienta', contact_types: [{ name: 'Clienta' }] }] })
    const w = mountTable({})
    expect(w.text()).toContain('Nou contacte')
    await flushPromises()
    expect(api.get.mock.calls.map(c => c[0])).toEqual(['contacts/basic?_limit=-1&_sort=name:ASC&_where[owner_null]=true'])
    expect(w.vm.contacts[0]).toMatchObject({ id: 7, contact_type_display: 'Clienta' })
  })
})
