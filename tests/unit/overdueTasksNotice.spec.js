// issues/114 (review): the projects list warned about overdue tasks with a notice that
// stayed until it was dismissed. The dot of the Tasques menu entry already says it, so
// the notice is gone, and with it the list's request for all the tasks.
import { describe, it, expect, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'

const get = vi.hoisted(() => vi.fn(async path => {
  if (path === 'users/me') return { data: { permissions: [{ permission: 'projects' }] } }
  return { data: [] }
}))

vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import Home from '@/views/Home.vue'

describe('overdue tasks notice', () => {
  it('the projects list neither shows it nor asks for the tasks', async () => {
    localStorage.setItem('welcome', 'true')
    const open = vi.fn()
    shallowMount(Home, {
      global: {
        mocks: { $buefy: { snackbar: { open } }, $router: { push: vi.fn() }, $route: { query: {} } },
        stubs: { 'download-excel': true }
      }
    })
    await flushPromises()

    expect(open).not.toHaveBeenCalled()
    expect(get).toHaveBeenCalledWith('project-states')
    expect(get.mock.calls.filter(([path]) => /^tasks?\b|^task-states/.test(path))).toEqual([])
  })
})
