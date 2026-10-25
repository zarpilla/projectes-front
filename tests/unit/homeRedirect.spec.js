// issues/099: the API now enforces the app permissions. The landing page
// (Home.vue, the projects panel) redirected users without `projects` to their
// screen but carried on loading projects, tasks and catalogs, which the API now
// refuses: it must stop after the redirect.
import { describe, it, expect, vi } from 'vitest'
import Home from '@/views/Home.vue'

const calls = []
let permissions = []
vi.mock('@/service/index', () => ({
  default: () => ({
    get: vi.fn(async url => {
      calls.push(url)
      if (url === 'users/me') return { data: { permissions: permissions.map(permission => ({ permission })) } }
      return { data: [] }
    })
  })
}))

async function mountedFor(perms) {
  calls.length = 0
  permissions = perms
  const push = vi.fn()
  const vm = {
    $router: { push },
    $buefy: { snackbar: { open: vi.fn() } },
    fillChartData: vi.fn(),
    applyProjects: vi.fn()
  }
  await Home.mounted.call(vm)
  return { push, vm }
}

describe('landing page redirect (issues/099)', () => {
  it('sends a member to her orders and loads nothing else', async () => {
    const { push, vm } = await mountedFor(['orders'])
    expect(push).toHaveBeenCalledWith('/comandes')
    expect(calls).toEqual(['users/me'])
    expect(vm.fillChartData).not.toHaveBeenCalled()
  })

  it('sends a worker or a driver to Hores dedicades and loads nothing else', async () => {
    for (const perms of [['hours'], ['hours', 'orders_delivery']]) {
      const { push } = await mountedFor(perms)
      expect(push).toHaveBeenCalledWith('/dedicacio')
      expect(calls).toEqual(['users/me'])
    }
  })

  it('loads the panel for projects', async () => {
    const { push } = await mountedFor(['projects'])
    expect(push).not.toHaveBeenCalled()
    expect(calls).toContain('projects/basic?_limit=-1&project_state=1')
  })
})
