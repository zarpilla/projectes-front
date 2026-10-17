// issues/067: the projects panel and «Prev./Real dedicació» gave different
// planned hours for the same project. Prev./Real rebuilt them from the phase
// lines with its own month-based rules (no festives, lines without a person
// counted too); it now shows the backend's `planned_hours`, computed like the
// stored `total_estimated_hours` the panel shows. The projects list fell back
// to `estimated_incomes_expenses` for its planned result while the panel (and
// the list's own sorting) used `incomes_expenses`.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import DedicationEstPivot from '@/components/DedicationEstPivot.vue'
import ProjectsTable from '@/components/ProjectsTable.vue'

const project = () => ({
  id: 1,
  name: 'P',
  total_estimated_hours: 52.5,
  // phase lines Prev./Real used to expand on its own: they no longer count
  project_phases: [{ incomes: [{ estimated_hours: [
    { from: '2026-02-02', to: '2026-04-01', quantity: 99, quantity_type: 'month' }
  ] }] }],
  planned_hours: [
    { year: '2026', month: '02', user: 7, estimated_hours: 30, original_estimated_hours: 20, estimated_hours_today: 30 },
    { year: '2026', month: '03', user: 8, estimated_hours: 12.5, original_estimated_hours: 0, estimated_hours_today: 4 },
    { year: '2027', month: '01', user: 7, estimated_hours: 10, original_estimated_hours: 0, estimated_hours_today: 0 }
  ]
})

const rows = (filters = {}) => {
  const vm = {
    year: 0,
    person: 0,
    leaders: [{ id: 7, username: 'anna' }, { id: 8, username: 'pere' }],
    ...filters
  }
  const activities = []
  DedicationEstPivot.methods.plannedHoursRows.call(vm, activities, project())
  return activities
}
const sum = (list, field) => list.reduce((acc, r) => acc + r[field], 0)

describe('Prev./Real planned hours (issues/067)', () => {
  it("add up to the project's total in the panel", () => {
    expect(sum(rows(), 'estimated_hours')).toBe(project().total_estimated_hours)
    expect(sum(rows(), 'original_estimated_hours')).toBe(20)
  })

  it('keep the person, month and hours up to today of each row', () => {
    expect(rows()[1]).toMatchObject({
      project_name: 'P',
      username: 'pere',
      year: '2026',
      month: '03',
      estimated_hours: 12.5,
      estimated_hours_today: 4,
      hours: 0
    })
  })

  it('follow the year and person filters', () => {
    expect(rows({ year: 2026 }).map(r => r.month)).toEqual(['02', '03'])
    expect(rows({ person: 7 }).map(r => r.username)).toEqual(['anna', 'anna'])
  })

  it('asks the backend for them', async () => {
    const src = (await import('node:fs')).readFileSync(
      require('node:path').resolve(process.cwd(), 'src/components/DedicationEstPivot.vue'), 'utf8')
    expect(src.match(/projects\/phases-both\?[^`']*plannedHours=true/g)).toHaveLength(2)
  })
})

describe('projects list planned result (issues/067)', () => {
  it('is incomes_expenses, the value the panel shows and the column sorts by', () => {
    const { estimatedResult } = ProjectsTable.methods
    expect(estimatedResult({ incomes_expenses: 0, estimated_incomes_expenses: 2940 })).toBe(0)
    expect(estimatedResult({ incomes_expenses: -150, estimated_incomes_expenses: 2940 })).toBe(-150)
    expect(estimatedResult({})).toBe(0)
  })
})
