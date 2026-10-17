// issues/114 (review): the projects list warns about overdue tasks with a notice that
// stays until it's dismissed. It followed people into a project and covered the ⋯ menu
// of the save bar; leaving the list closes it.
import { describe, it, expect, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'

vi.mock('@/stores/main.js', () => ({ useMainStore: () => ({ userName: 'anna' }) }))
vi.mock('@/service/index', () => ({
  default: () => ({
    get: vi.fn(async path => {
      if (path === 'users/me') return { data: { permissions: [{ permission: 'projects' }] } }
      if (path.startsWith('tasks')) {
        return {
          data: [{
            users_permissions_users: [{ username: 'anna' }],
            task_state: { id: 1 },
            due_date: '2000-01-01'
          }]
        }
      }
      return { data: [] }
    })
  })
}))

import Home from '@/views/Home.vue'

describe('overdue tasks notice', () => {
  it('closes when leaving the projects list', async () => {
    localStorage.setItem('welcome', 'true')
    const notice = { close: vi.fn() }
    const open = vi.fn(() => notice)
    const wrapper = shallowMount(Home, {
      global: {
        mocks: { $buefy: { snackbar: { open } }, $router: { push: vi.fn() }, $route: { query: {} } },
        stubs: { 'download-excel': true }
      }
    })
    await flushPromises()
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ message: 'Atenció, tens tasques amb la data límit superada!' }))

    wrapper.unmount()
    expect(notice.close).toHaveBeenCalled()
  })
})
