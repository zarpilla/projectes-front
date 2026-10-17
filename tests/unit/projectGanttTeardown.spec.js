// issues/128: leaving the project's Planificació tab right after opening it threw
// «Cannot read properties of undefined (reading 'getService')»: the delayed
// rebuild ran clearAll() on the gantt destroyed in beforeUnmount.
import { describe, it, expect, vi, afterEach } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import ProjectGannt from '@/components/ProjectGannt.vue'

afterEach(() => vi.useRealTimers())

const vm = () => ({
  gantt: { clearAll: vi.fn() },
  initializeGannt: vi.fn(),
  ganttDestroyed: false
})

describe('ProjectGannt delayed rebuild (issues/128)', () => {
  it('rebuilds after the delay', () => {
    vi.useFakeTimers()
    const c = vm()
    ProjectGannt.methods.rebuildGantt.call(c)
    vi.advanceTimersByTime(600)
    expect(c.gantt.clearAll).toHaveBeenCalled()
    expect(c.initializeGannt).toHaveBeenCalled()
  })
  it('does nothing once the gantt is destroyed', () => {
    vi.useFakeTimers()
    const c = vm()
    ProjectGannt.methods.rebuildGantt.call(c)
    c.ganttDestroyed = true
    vi.advanceTimersByTime(600)
    expect(c.gantt.clearAll).not.toHaveBeenCalled()
    expect(c.initializeGannt).not.toHaveBeenCalled()
  })
})
