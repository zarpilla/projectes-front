// issues/443: the projects list gets a «Tipus de projecte» filter (between
// Coordina and Àmbit) that asks projects/basic for that type only.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn(() => Promise.resolve({ data: [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import Home from '@/views/Home.vue'

const ctx = filters => ({
  filters: { project_state: 1, q: '', user: '0', typeId: 0, scopeId: 0, ...filters },
  applyProjects: () => {}
})

describe('projects list type filter (issues/443)', () => {
  beforeEach(() => get.mockClear())

  it('sends project_type when a type is chosen', () => {
    Home.methods.doFilteredQuery.call(ctx({ typeId: 3 }), '')
    expect(get.mock.calls[0][0]).toContain('&project_type=3')
  })

  it('combines it with the search, state, leader and scope', () => {
    Home.methods.doFilteredQuery.call(ctx({ q: 'web', typeId: 3, user: 5, scopeId: 2 }), 'web')
    const url = get.mock.calls[0][0]
    expect(url).toContain('_q=web')
    expect(url).toContain('&project_state=1')
    expect(url).toContain('&leader=5')
    expect(url).toContain('&project_scope=2')
    expect(url).toContain('&project_type=3')
  })

  it('«Tots» sends no type', () => {
    Home.methods.doFilteredQuery.call(ctx({ typeId: 0 }), '')
    expect(get.mock.calls[0][0]).not.toContain('project_type')
  })

  it('starts with every type', () => {
    expect(Home.data.call({}).filters.typeId).toBe(0)
  })
})
