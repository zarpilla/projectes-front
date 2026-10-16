// issues/029 — Incidències, Punts de recollida and Usuàries (admin) get the
// Excel download button of the other tables. The two that load one page of rows
// at a time fetch every row for the file.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), delete: vi.fn() }) }))

import DownloadExcel from '@/components/DownloadExcel.vue'
import IncidencesTable from '@/components/IncidencesTable.vue'
import PickupPointsOrders from '@/components/PickupPointsOrders.vue'
import AdminUserList from '@/components/AdminUserList.vue'

const ME = { id: 1, permissions: [{ permission: 'orders_admin' }, { permission: 'admin' }] }
const USERS = [
  { id: 1, username: 'admin', fullname: 'Admin', email: 'admin@exemple.coop', confirmed: true, blocked: false, hidden: true, permissions: [{ permission: 'orders_admin' }, { permission: 'admin' }] },
  { id: 3, username: 'anna', fullname: 'Anna Puig', email: 'anna@exemple.coop', confirmed: true, blocked: true, hidden: false, permissions: [] }
]
const INCIDENCES = [
  { id: 9, description: 'Caixa trencada', state: 'closed', created_at: '2026-09-01T10:00:00Z', closed_date: '2026-09-03T10:00:00Z', created_user: { username: 'anna', fullname: 'Anna Puig' }, closed_user: { username: 'admin' }, order: { id: 12, contact_trade_name: 'El Rebost', owner: 3 } },
  { id: 8, description: 'Falta un paquet', state: 'open', created_at: '2026-08-20T10:00:00Z', created_user: null, order: null }
]
const ORDERS = [
  { id: 12, status: 'pending', contact: { name: 'El Rebost' }, route: { name: 'Bages' }, estimated_delivery_date: '2026-10-14', lines: [
    { name: 'Hort de la Vall', nif: 'F12345678', units: 2, kilograms: 14, picked_up: true },
    { name: 'Formatges Serra', nif: 'B87654321', units: 1, kilograms: 5, picked_up: false }
  ] },
  { id: 13, status: 'delivered', contact: { trade_name: 'La Fleca' }, route: null, estimated_delivery_date: '2026-10-15', lines: [] }
]

// what the service answers, by the start of the url
const answers = {}
const calls = prefix => get.mock.calls.filter(([url]) => url.replace(/^\//, '').startsWith(prefix))

function mountTable (component) {
  return mount(component, {
    global: {
      plugins: [Buefy, createPinia()],
      components: { DownloadExcel },
      stubs: { RouterLink: true },
      mocks: { $route: { query: {} }, $router: { push: vi.fn() } }
    }
  })
}

// the cells of the file: one array per row, in the order of the columns
const cells = (excel, rows) => {
  const value = (row, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), row) ?? ''
  return rows.map(row => Object.values(excel.props('fields')).map(field => value(row, field)))
}

beforeEach(() => {
  get.mockReset()
  get.mockImplementation(async url => {
    const key = Object.keys(answers).find(prefix => url.replace(/^\//, '').startsWith(prefix))
    return { data: structuredClone(answers[key]) }
  })
  Object.assign(answers, { 'users/me': ME, 'users/count': 40, users: USERS, 'incidences/count': 120, incidences: INCIDENCES, orders: ORDERS })
})

describe('Excel export of Incidències', () => {
  it('fetches every incidence of the current filter and order', async () => {
    const w = mountTable(IncidencesTable)
    await flushPromises()
    w.vm.stateFilter = ['open', 'closed']
    w.vm.sortField = 'created_at'
    w.vm.sortOrder = 'asc'

    const excel = w.findComponent(DownloadExcel)
    expect(excel.exists()).toBe(true)
    expect(excel.props('name')).toBe('incidencies')
    get.mockClear()
    const rows = await excel.props('fetch')()

    const [, { params }] = calls('incidences')[0]
    expect(params).toEqual({ _limit: -1, _sort: 'created_at:ASC', state_in: ['open', 'closed'] })
    expect(Object.keys(excel.props('fields'))).toEqual(
      ['ID', 'Comanda', 'Punt', 'Sòcia', 'Descripció', 'Estat', 'Creada', 'Creada per', 'Tancada', 'Tancada per']
    )
    expect(cells(excel, rows)).toEqual([
      [9, 12, 'El Rebost', 'Anna Puig', 'Caixa trencada', 'Tancada', '01/09/2026', 'Anna Puig', '03/09/2026', 'admin'],
      [8, '', '', '', 'Falta un paquet', 'Oberta', '20/08/2026', '', '', '']
    ])
  })

  it('exports only her own incidences for a member', async () => {
    answers['users/me'] = { id: 3, permissions: [{ permission: 'orders' }] }
    const w = mountTable(IncidencesTable)
    await flushPromises()
    get.mockClear()
    await w.findComponent(DownloadExcel).props('fetch')()
    expect(calls('incidences')[0][1].params['order.owner']).toBe(3)
  })
})

describe('Excel export of Punts de recollida', () => {
  it('exports one row per line of the listed orders', async () => {
    const w = mountTable(PickupPointsOrders)
    await flushPromises()
    const excel = w.findComponent(DownloadExcel)
    expect(excel.exists()).toBe(true)
    expect(excel.props('name')).toBe('punts-recollida')
    expect(Object.keys(excel.props('fields'))).toEqual(
      ['Comanda', 'Estat', 'Punt', 'Ruta', 'Data estimada', 'Línia', 'NIF', 'Caixes', 'Kg', 'Recollida']
    )
    expect(cells(excel, excel.props('data'))).toEqual([
      [12, 'Pendent', 'El Rebost', 'Bages', '2026-10-14', 'Hort de la Vall', 'F12345678', 2, 14, 'Sí'],
      [12, 'Pendent', 'El Rebost', 'Bages', '2026-10-14', 'Formatges Serra', 'B87654321', 1, 5, 'No'],
      [13, 'Lliurada', 'La Fleca', '', '2026-10-15', '', '', '', '', '']
    ])
  })
})

describe('Excel export of Usuàries (admin)', () => {
  it('fetches every user, not only the page on screen', async () => {
    const w = mountTable(AdminUserList)
    await flushPromises()
    const excel = w.findComponent(DownloadExcel)
    expect(excel.exists()).toBe(true)
    expect(excel.props('name')).toBe('usuaries')
    get.mockClear()
    const rows = await excel.props('fetch')()

    expect(get.mock.calls[0][0]).toBe('/users?_limit=-1&_sort=username:ASC')
    expect(Object.keys(excel.props('fields'))).toEqual(
      ["Nom d'usuari", 'Nom complet', 'Email', 'Confirmat', 'Bloquejat', 'Ocult', 'Permisos']
    )
    expect(cells(excel, rows)).toEqual([
      ['admin', 'Admin', 'admin@exemple.coop', 'Sí', 'No', 'Sí', 'orders_admin, admin'],
      ['anna', 'Anna Puig', 'anna@exemple.coop', 'Sí', 'Sí', 'No', '']
    ])
  })
})
