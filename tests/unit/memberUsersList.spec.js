// issues/184: the API hands a member the other users without their
// permissions (only id/documentId/username/fullname, issues/165), and every
// member screen that filtered `GET /users` with `u.permissions.map(...)` crashed:
// Comandes showed 0 orders, the order form and Punts d'entrega stayed empty,
// Contacta lost the Sòcia and e-mail.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import { orderMembers } from '@/domain/routeAccess'

const me = { id: 54, username: 'prova.soci', email: 'soci@example.org', permissions: [{ permission: 'orders' }] }
// what a member gets from GET /users: herself in full, the others reduced
const sanitized = [me, { id: 2, documentId: 'x', username: 'anna', fullname: 'Anna' }]
const get = vi.fn(async url => {
  if (url === 'users/me') return { data: me }
  if (url.startsWith('users')) return { data: sanitized }
  return { data: {} }
})
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import ContactUsForm from '@/components/ContactUsForm.vue'

describe('member screens with the sanitized users list (issues/184)', () => {
  it('keeps the members, and the users that came without permissions', () => {
    const users = [
      { id: 1, permissions: [{ permission: 'orders' }, { permission: 'hours' }] },
      { id: 2, permissions: [{ permission: 'projects' }] },
      { id: 3, permissions: ['orders'] },
      { id: 4, username: 'reduced' }
    ]
    expect(orderMembers(users).map(u => u.id)).toEqual([1, 3, 4])
    expect(orderMembers(null)).toEqual([])
  })

  it('Contacta loads the member and her e-mail', async () => {
    const pinia = createPinia()
    const w = mount(ContactUsForm, {
      global: { plugins: [pinia, Buefy], stubs: { 'title-bar': true, TitleBar: true } }
    })
    await flushPromises()
    expect(w.vm.form.user).toBe(54)
    expect(w.vm.form.email).toBe('soci@example.org')
    expect(w.vm.users.map(u => u.id)).toContain(54)
  })
})
