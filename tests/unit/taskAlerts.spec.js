// The Tasques menu dot: overdue tasks of the logged-in person and what is new for
// them since they last opened Tasques (src/domain/tasks.js taskAlerts, AsideMenuItem).
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { taskAlerts } from '@/domain/tasks'
import { useTaskAlerts } from '@/stores/taskAlerts'
import AsideMenuItem from '@/components/AsideMenuItem.vue'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(async () => ({ data: [] })) }) }))

const states = [{ id: 1, order: 0 }, { id: 3, order: 2 }]
const me = 5
const today = '2026-10-17'
const seenAt = '2026-10-16T10:00:00.000Z'

describe('task notices', () => {
  it('counts my overdue tasks and checklist items, not done or archived ones', () => {
    const tasks = [
      { id: 1, users_permissions_users: [{ id: me }], task_state: { id: 1 }, due_date: '2026-10-10', created: { id: me }, createdAt: '2026-01-01' },
      { id: 2, users_permissions_users: [{ id: me }], task_state: { id: 3 }, due_date: '2026-10-10', created: { id: me } },
      { id: 3, users_permissions_users: [{ id: me }], task_state: { id: 1 }, due_date: '2026-10-10', archived: true },
      { id: 4, users_permissions_users: [{ id: me }], task_state: { id: 1 }, created: { id: me }, checklist: [
        { user: { id: me }, done: false, due_date: '2026-10-01' },
        { user: { id: me }, done: true, due_date: '2026-10-01' },
        { user: { id: 9 }, done: false, due_date: '2026-10-01' }
      ] }
    ]
    expect(taskAlerts({ tasks, states, me, seenAt, today })).toEqual({ overdue: 2, fresh: 0 })
  })

  it('counts tasks others created for me and mentions since I last looked', () => {
    const tasks = [
      { id: 1, users_permissions_users: [{ id: me }], task_state: { id: 1 }, created: { id: 8 }, createdAt: '2026-10-17T08:00:00.000Z' },
      { id: 2, users_permissions_users: [{ id: me }], task_state: { id: 1 }, created: { id: 8 }, createdAt: '2026-10-15T08:00:00.000Z' },
      { id: 3, users_permissions_users: [{ id: me }], task_state: { id: 1 }, created: { id: me }, createdAt: '2026-10-17T08:00:00.000Z' }
    ]
    const mentions = [
      { createdAt: '2026-10-17T09:00:00.000Z', author: { id: 8 } },
      { createdAt: '2026-10-17T09:00:00.000Z', author: { id: me } }
    ]
    expect(taskAlerts({ tasks, states, mentions, me, seenAt, today })).toEqual({ overdue: 0, fresh: 2 })
  })
})

describe('Tasques menu entry', () => {
  const item = { to: '/tasks', icon: 'trello', label: 'Tasques', badge: 'tasks' }
  const mountItem = (props = {}) => mount(AsideMenuItem, {
    props: { item, ...props },
    global: { stubs: { 'router-link': { template: '<a><slot /></a>' }, 'b-icon': true, 'aside-menu-list': true } }
  })

  it('shows the count, red when something is overdue, and nothing when all is clear', async () => {
    setActivePinia(createPinia())
    const alerts = useTaskAlerts()
    let w = mountItem()
    expect(w.find('.menu-badge').exists()).toBe(false)
    alerts.fresh = 2
    await w.vm.$nextTick()
    expect(w.find('.menu-badge').text()).toContain('2')
    expect(w.find('.menu-badge').classes()).not.toContain('is-late')
    expect(w.find('.menu-badge').attributes('title')).toBe('Tasques: 2 novetats')
    alerts.overdue = 1
    await w.vm.$nextTick()
    expect(w.find('.menu-badge').classes()).toContain('is-late')
    expect(w.find('.menu-badge').attributes('title')).toBe('Tasques: 1 vençuda · 2 novetats')
    // the narrow menu: a dot on the icon
    w = mountItem({ isCollapsed: true })
    expect(w.find('.menu-badge').exists()).toBe(false)
    expect(w.find('b-icon-stub').classes()).toContain('has-update-mark')
  })
})
