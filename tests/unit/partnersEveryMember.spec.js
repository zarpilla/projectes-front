// issues/155: «Sòcies» listed only the users whose only permission was
// `orders`; a member with any other permission too was missing, although her
// orders are invoiced like the others'. Every active user with `orders` is a
// member.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const USERS = [
  { id: 3, username: 'anna', confirmed: true, blocked: false, permissions: [{ permission: 'orders' }] },
  { id: 4, username: 'bernat', confirmed: true, blocked: false, permissions: [{ permission: 'orders' }, { permission: 'hours' }] },
  { id: 5, username: 'carla', confirmed: true, blocked: false, permissions: [{ permission: 'hours' }] },
  { id: 6, username: 'dani', confirmed: true, blocked: true, permissions: [{ permission: 'orders' }] }
]
const get = vi.fn(async url => ({ data: structuredClone(url.startsWith('users') ? USERS : []) }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import UsersTable from '@/components/UsersTable.vue'

describe('Sòcies (issues/155)', () => {
  it('lists every member, whatever other permissions she has', async () => {
    const w = mount(UsersTable, { global: { plugins: [Buefy, createPinia()], stubs: { RouterLink: true, 'download-excel': true } } })
    await flushPromises()
    expect(w.vm.users.map(u => u.id)).toEqual([3, 4])
    expect(w.vm.users[1].permissions).toBe('Sòcia, Hores')
  })
})
