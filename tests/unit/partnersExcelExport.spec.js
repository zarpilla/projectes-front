// issues/018 — the Sòcies page (/partners) exports the member list to Excel:
// the rows and columns shown in the table.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const USERS = [
  { id: 3, username: 'anna', fullname: 'Anna Puig', email: 'anna@exemple.coop', confirmed: true, blocked: false, permissions: [{ permission: 'orders' }] },
  { id: 4, username: 'bernat', fullname: 'Bernat Soler', email: 'bernat@exemple.coop', confirmed: true, blocked: false, permissions: [{ permission: 'orders' }] },
  // not members: a worker, and a blocked member
  { id: 5, username: 'carla', fullname: 'Carla Vidal', email: 'carla@exemple.coop', confirmed: true, blocked: false, permissions: [{ permission: 'hours' }] },
  { id: 6, username: 'dani', fullname: 'Dani Roca', email: 'dani@exemple.coop', confirmed: true, blocked: true, permissions: [{ permission: 'orders' }] }
]
const CONTACTS = [
  { id: 30, name: 'La Sòcia SCCL', partner_amount: 300, partner_amount_date: '2025-03-01', users_permissions_user: { id: 3 } }
]

const get = vi.fn(async url => ({ data: structuredClone(url.startsWith('users') ? USERS : CONTACTS) }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import UsersTable from '@/components/UsersTable.vue'
import DownloadExcel from '@/components/DownloadExcel.vue'

describe('UsersTable Excel export', () => {
  it('exports the members of the table with its columns', async () => {
    const w = mount(UsersTable, {
      global: {
        plugins: [Buefy, createPinia()],
        components: { DownloadExcel },
        stubs: { RouterLink: true }
      }
    })
    await flushPromises()

    const excel = w.findComponent(DownloadExcel)
    expect(excel.exists()).toBe(true)
    expect(excel.props('name')).toBe('socies')
    expect(excel.props('data').map(u => u.id)).toEqual([3, 4])

    const fields = excel.props('fields')
    expect(Object.keys(fields)).toEqual(w.findAll('th').map(th => th.text()).filter(Boolean))

    // what the file gets for a member with and without a contact
    const value = (row, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), row)
    const [anna, bernat] = excel.props('data')
    expect(Object.values(fields).map(f => value(anna, f))).toEqual(
      [3, 'La Sòcia SCCL', 'anna', 'Anna Puig', 'anna@exemple.coop', 'Sòcia', 300, '2025-03-01']
    )
    expect(value(bernat, fields['Sòcia'])).toBeUndefined()
  })
})
