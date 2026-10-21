// Orders route filter (issues/311): Buefy's dropdown emits `change` before it
// updates v-model, so the list was loaded with the routes checked before the
// click: picking one route from «Totes» still listed every route.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const ROUTES = [
  { id: 12, name: 'DJ - BCN CIUTAT' },
  { id: 13, name: 'DJ - EMPORDÀ' },
  { id: 14, name: 'DJ - LLOBREGAT' }
]
const get = vi.fn(async url => {
  if (url === 'users/me') return { data: { id: 1, permissions: [{ permission: 'orders_admin' }] } }
  if (url === 'me') return { data: {} }
  if (String(url).startsWith('routes')) return { data: ROUTES }
  if (String(url).startsWith('users')) return { data: [{ id: 1, username: 'carla', fullname: 'Carla' }] }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(async () => ({ data: {} })), post: vi.fn(async () => ({ data: {} })) }) }))
import OrdersTable from '@/components/OrdersTable.vue'

// the route ids of the last orders list request
const lastRoutes = () => {
  const calls = get.mock.calls.map(c => String(c[0])).filter(u => u.startsWith('orders/table'))
  const url = decodeURIComponent(calls[calls.length - 1] || '')
  return [...url.matchAll(/_where\[route\.id\]=(\d+)/g)].map(m => Number(m[1]))
}

const mountTable = async () => {
  const wrapper = mount(OrdersTable, {
    global: {
      plugins: [createPinia(), Buefy],
      stubs: { 'router-link': true, 'router-view': true, 'download-excel': true },
      mocks: { $route: { meta: {}, query: {}, params: {} }, $router: { push: vi.fn(), replace: vi.fn() } }
    }
  })
  await flushPromises()
  return wrapper
}

const clickRoute = async (wrapper, name) => {
  const item = wrapper.findAll('.filter-dropdown .dropdown-item').find(i => i.text().includes(name))
  await item.trigger('click')
  await flushPromises()
}

describe('OrdersTable route filter (issues/311)', () => {
  beforeEach(() => {
    localStorage.clear()
    get.mockClear()
  })

  it('loads the list with the route just checked, on the first click', async () => {
    const wrapper = await mountTable()
    expect(lastRoutes()).toEqual([])

    await clickRoute(wrapper, 'DJ - BCN CIUTAT')
    expect(wrapper.vm.routeFilter).toEqual([12])
    expect(lastRoutes()).toEqual([12])
    expect(JSON.parse(localStorage.getItem('OrdersTable.routeFilterId'))).toEqual([12])

    await clickRoute(wrapper, 'DJ - EMPORDÀ')
    expect(lastRoutes()).toEqual([12, 13])
    expect(JSON.parse(localStorage.getItem('OrdersTable.routeFilterId'))).toEqual([12, 13])

    await clickRoute(wrapper, 'DJ - BCN CIUTAT')
    expect(lastRoutes()).toEqual([13])
    expect(JSON.parse(localStorage.getItem('OrdersTable.routeFilterId'))).toEqual([13])
  })

  it('«Totes les rutes» clears the filter', async () => {
    localStorage.setItem('OrdersTable.routeFilterId', '[12]')
    const wrapper = await mountTable()
    expect(lastRoutes()).toEqual([12])

    const all = wrapper.findAll('.filter-dropdown button').find(b => b.text() === 'Totes les rutes')
    await all.trigger('click')
    await flushPromises()
    expect(lastRoutes()).toEqual([])
    expect(JSON.parse(localStorage.getItem('OrdersTable.routeFilterId'))).toEqual([])
  })
})
