// issues/223: since issues/188 a user without full access (`projects` / `admin`)
// sees only her own done hours in Informes › Dedicació, but the planned hours
// stayed everyone's, so the KPIs compared her 3,5 h with 12.355 h planned for
// 17 people and 49 projects. The Persona filter must be set to herself (the
// others hidden), so the planned hours and the KPIs are hers too.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/helpers/addScript', () => ({ loadKendo: vi.fn() }))
import StatsDedicacio from '@/views/StatsDedicacio.vue'
import DedicationEstPivot from '@/components/DedicationEstPivot.vue'

const USERS = [{ id: 1, username: 'anna' }, { id: 2, username: 'pau' }, { id: 3, username: 'hidden', hidden: true }]

function answer (me) {
  api.get.mockImplementation(url => {
    if (url === 'users/me') return Promise.resolve({ data: me })
    if (url === 'users') return Promise.resolve({ data: USERS })
    if (String(url).startsWith('years')) return Promise.resolve({ data: [{ id: 1, year: 2026 }] })
    return Promise.resolve({ data: [] })
  })
}

async function load (me) {
  answer(me)
  const vm = { ...StatsDedicacio.data(), $nextTick: fn => fn() }
  await StatsDedicacio.methods.getData.call(vm)
  return vm
}

describe('Informes › Dedicació person filter (issues/223)', () => {
  beforeEach(() => api.get.mockReset())

  it('sets an hours-only user to herself and hides the others', async () => {
    const vm = await load({ id: 2, username: 'pau', permissions: [{ permission: 'hours' }] })
    expect(vm.canPickPerson).toBe(false)
    expect(vm.users).toEqual([{ id: 2, username: 'pau' }])
    expect(vm.filters.user).toBe(2)
    expect(vm.appliedFilters.user).toBe(2)
    expect(vm.showCost).toBe(false)
  })

  it('keeps everyone for full access', async () => {
    const vm = await load({ id: 1, username: 'anna', permissions: [{ permission: 'projects' }] })
    expect(vm.canPickPerson).toBe(true)
    expect(vm.users.map(u => u.id)).toEqual([0, 1, 2])
    expect(vm.filters.user).toBe(0)
    expect(vm.showCost).toBe(true)
  })

  it('the pivot then keeps only her planned hours', () => {
    const project = {
      name: 'P',
      planned_hours: [
        { user: 1, year: '2026', month: '01', estimated_hours: 100 },
        { user: 2, year: '2026', month: '01', estimated_hours: 8 }
      ]
    }
    const rows = []
    const vm = { year: 2026, person: 2, leaders: USERS }
    DedicationEstPivot.methods.plannedHoursRows.call(vm, rows, project)
    expect(rows.map(r => [r.username, r.estimated_hours])).toEqual([['pau', 8]])
  })
})
