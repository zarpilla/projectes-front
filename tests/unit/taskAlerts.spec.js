// The Tasques menu dot: overdue tasks of the logged-in person and what is new for
// them since they last opened Tasques (stores/taskAlerts.js, AsideMenuItem).
// issues/307: the server counts them (GET tasks/alerts, projectes-v5
// tests/task-alerts.test.js keeps the rules' cases); the browser asked the
// person's tasks with everything populated (~40 KB), the states and the
// mentions on every page load, together with the page's own data.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import moment from 'moment'
import { useTaskAlerts, TASK_ALERTS_DELAY_MS } from '@/stores/taskAlerts'
import AsideMenuItem from '@/components/AsideMenuItem.vue'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

const me = 5
const seenAt = '2026-10-16T10:00:00.000Z'

describe('task notices (issues/307)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
    get.mockResolvedValue({ data: { overdue: 2, fresh: 1 } })
    localStorage.setItem('user', JSON.stringify({ id: me }))
    localStorage.setItem(`tasksSeenAt:${me}`, seenAt)
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.removeItem('user')
    localStorage.removeItem(`tasksSeenAt:${me}`)
  })

  it('asks the server for the two numbers, once', async () => {
    const alerts = useTaskAlerts()
    await alerts.refresh()
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith(
      `tasks/alerts?seen=${encodeURIComponent(seenAt)}&today=${moment().format('YYYY-MM-DD')}`
    )
    expect(alerts.overdue).toBe(2)
    expect(alerts.fresh).toBe(1)
    expect(alerts.count).toBe(3)
  })

  it('the first time, nothing old counts as new: it sends now as seen', async () => {
    localStorage.removeItem(`tasksSeenAt:${me}`)
    await useTaskAlerts().refresh()
    const sent = decodeURIComponent(get.mock.calls[0][0].match(/seen=([^&]*)/)[1])
    expect(Date.now() - new Date(sent).getTime()).toBeLessThan(5000)
  })

  it('after a page load, waits for the page before asking (several loads, one request)', async () => {
    vi.useFakeTimers()
    const alerts = useTaskAlerts()
    alerts.refreshSoon()
    alerts.refreshSoon()
    await vi.advanceTimersByTimeAsync(TASK_ALERTS_DELAY_MS - 1)
    expect(get).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('no dot when the server can not tell', async () => {
    get.mockRejectedValue(new Error('404'))
    const alerts = useTaskAlerts()
    await alerts.refresh()
    expect(alerts.count).toBe(0)
  })
})

describe('Tasques menu entry', () => {
  const item = { to: '/tasques', icon: 'trello', label: 'Tasques', badge: 'tasks' }
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
