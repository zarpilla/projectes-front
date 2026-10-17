// issues/061: Hores dedicades, Registre jornades… opened with an empty
// Persona filter: they matched the store's userName, which is still null while
// App.vue waits for /users/me after a reload (and threw), and they searched
// only the visible people.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'
import { findCurrentUser, currentUserId } from '@/domain/currentUser'
import { useMainStore } from '@/stores/main.js'

const users = [{ id: 3, username: 'Anna' }, { id: 7, username: 'pau', hidden: true }]
const get = vi.fn(async url => ({ data: url.startsWith('users') ? users : [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import Jornada from '@/views/Jornada.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.setItem('user', JSON.stringify({ id: 7, username: 'pau' }))
})

describe('current person (issues/061)', () => {
  it('comes from the store, or from the session saved at login', () => {
    expect(currentUserId()).toBe(7)
    useMainStore().user = { id: 3 }
    expect(currentUserId()).toBe(3)
    expect(findCurrentUser(users)).toEqual(users[0])
  })

  it('is found even when hidden', () => {
    expect(findCurrentUser(users)).toEqual(users[1])
  })

  it('Registre jornades preselects it before /users/me answers', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const w = mount(Jornada, {
      global: { plugins: [pinia, Buefy], stubs: { 'title-bar': true, 'jornada-diaria': true, JornadaDiaria: true } }
    })
    await flushPromises()
    expect(useMainStore().userName).toBeNull()
    expect(w.vm.filters.user).toBe(7)
  })
})
