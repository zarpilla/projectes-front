import { describe, it, expect } from 'vitest'
import { groupHours, topWithRest, hoursByMonth } from '@/domain/dedicationBreakdown.js'

const a = (date, hours, person, project) => ({
  date, hours, users_permissions_user: person ? { username: person } : null, project: project ? { name: project } : null
})
const rows = [
  a('2026-01-10', 4, 'Laia', 'P1'),
  a('2026-01-11', 2, 'Pau', 'P2'),
  a('2026-03-02', 3, 'Laia', null),
  a('2026-03-05', '1.5', null, 'P1')
]

describe('dedication breakdown', () => {
  it('groups hours, largest first, with their share', () => {
    expect(groupHours(rows, r => r.users_permissions_user && r.users_permissions_user.username)).toEqual([
      { name: 'Laia', hours: 7, share: 7 / 10.5 },
      { name: 'Pau', hours: 2, share: 2 / 10.5 },
      { name: 'Sense assignar', hours: 1.5, share: 1.5 / 10.5 }
    ])
    expect(groupHours([], r => r.x)).toEqual([])
  })

  it('keeps the first groups and sums the rest', () => {
    const groups = groupHours(rows, r => r.project && r.project.name, 'Sense projecte')
    const top = topWithRest(groups, 1, n => `Altres ${n} projectes`)
    expect(top.map(g => [g.name, g.hours, !!g.isRest])).toEqual([['P1', 5.5, false], ['Altres 2 projectes', 5, true]])
    expect(topWithRest(groups, 5)).toBe(groups)
  })

  it('counts hours per month, empty months included', () => {
    expect(hoursByMonth(rows, '2026-01-01', '2026-04-30')).toEqual([
      { key: '2026-01', hours: 6 },
      { key: '2026-02', hours: 0 },
      { key: '2026-03', hours: 4.5 },
      { key: '2026-04', hours: 0 }
    ])
    expect(hoursByMonth(rows, '2025-12-01', '2026-01-31').map(m => m.key)).toEqual(['2025-12', '2026-01'])
  })
})
