// Rules of the Tasques list (src/domain/tasks.js): what "done" means, due-date groups,
// filters, sorting, grouping and the queries.
import { describe, it, expect } from 'vitest'
import {
  doneStateId, isOverdue, dueBucket, filterTasks, sortTasks, groupTasks,
  updatedLabel, isStale, tasksQuery, kanbanViewQuery
} from '@/domain/tasks'

const states = [
  { id: 1, name: 'Pendents', order: 0 },
  { id: 2, name: 'En procés', order: 1 },
  { id: 3, name: 'Acabades', order: 4 },
  { id: 4, name: 'Revisar', order: 2 }
]
const today = '2026-10-17'
const task = (id, extra = {}) => ({ id, name: 'T' + id, task_state: { id: 1 }, users_permissions_users: [], ...extra })

describe('done state', () => {
  it('is the last state by order, not the id 3 (Diligència has "Revisar" before "Acabades")', () => {
    expect(doneStateId(states)).toBe(3)
    expect(doneStateId([{ id: 7, order: 0 }, { id: 9, order: 1 }])).toBe(9)
    expect(doneStateId([{ id: 1, order: 0 }])).toBe(null)
  })
  it('a done task is never overdue', () => {
    expect(isOverdue(task(1, { due_date: '2026-10-01' }), states, today)).toBe(true)
    expect(isOverdue(task(1, { due_date: '2026-10-01', task_state: { id: 3 } }), states, today)).toBe(false)
    expect(isOverdue(task(1, { due_date: '2026-10-17' }), states, today)).toBe(false)
  })
})

describe('due buckets', () => {
  it('late, next 7 days, later, past (done) and without date', () => {
    expect(dueBucket(task(1, { due_date: '2026-10-16' }), states, today)).toBe('late')
    expect(dueBucket(task(1, { due_date: '2026-10-16', task_state: 3 }), states, today)).toBe('past')
    expect(dueBucket(task(1, { due_date: '2026-10-17' }), states, today)).toBe('week')
    expect(dueBucket(task(1, { due_date: '2026-10-24' }), states, today)).toBe('week')
    expect(dueBucket(task(1, { due_date: '2026-10-25' }), states, today)).toBe('later')
    expect(dueBucket(task(1), states, today)).toBe('none')
  })
})

describe('filters', () => {
  const tasks = [
    task(1, { due_date: '2026-10-01', name: 'Fer l\'acta', project: { id: 5, name: 'Bellmodel' } }),
    task(2, { task_state: { id: 3 }, activity_type: { id: 8 } }),
    task(3, { due_date: '2026-10-20', task_state: { id: 4 }, description: 'trucar a l\'entitat' }),
    task(4, { due_date: '2027-01-01', activity_type: { id: 8 } })
  ]
  const ids = f => filterTasks(tasks, f, states, today).map(t => t.id)
  it('open by default (without the done state)', () => {
    expect(ids({})).toEqual([1, 3, 4])
    expect(ids({ state: 'all' })).toEqual([1, 2, 3, 4])
    expect(ids({ state: 'done' })).toEqual([2])
    expect(ids({ state: 4 })).toEqual([3])
  })
  it('by due date, Funció (0 = none) and text', () => {
    expect(ids({ due: 'late' })).toEqual([1])
    expect(ids({ due: 'week' })).toEqual([1, 3])
    expect(ids({ due: 'none', state: 'all' })).toEqual([2])
    expect(ids({ activityType: 8, state: 'all' })).toEqual([2, 4])
    expect(ids({ activityType: 0 })).toEqual([1, 3])
    expect(ids({ search: 'BELLMODEL' })).toEqual([1])
    expect(ids({ search: 'entitat' })).toEqual([3])
  })
})

describe('sorting', () => {
  const tasks = [
    task(1, { due_date: '2026-11-01', name: 'b', task_state: { id: 3 } }),
    task(2, { name: 'a' }),
    task(3, { due_date: '2026-10-01', name: 'c', task_state: { id: 4 } })
  ]
  it('by due date keeps tasks without date last both ways', () => {
    expect(sortTasks(tasks, 'due', 'asc').map(t => t.id)).toEqual([3, 1, 2])
    expect(sortTasks(tasks, 'due', 'desc').map(t => t.id)).toEqual([1, 3, 2])
  })
  it('by name and by the states\' order', () => {
    expect(sortTasks(tasks, 'name').map(t => t.id)).toEqual([2, 1, 3])
    expect(sortTasks(tasks, 'state', 'asc', states).map(t => t.id)).toEqual([2, 3, 1])
  })
})

describe('groups', () => {
  const ana = { id: 8, username: 'Anna' }
  const pau = { id: 9, username: 'Pau' }
  const tasks = [
    task(1, { due_date: '2026-10-01', users_permissions_users: [ana, pau], project: { id: 5, name: 'Zeta' } }),
    task(2, { due_date: '2026-10-20', task_state: { id: 2 }, project: { id: 6, name: 'Alfa' } }),
    task(3, { users_permissions_users: [pau] })
  ]
  it('by due date, in the fixed order, without empty groups', () => {
    const g = groupTasks(tasks, 'due', states, today)
    expect(g.map(g => [g.key, g.tasks.map(t => t.id)])).toEqual([['late', [1]], ['week', [2]], ['none', [3]]])
  })
  it('by state, with the state to prefill new tasks', () => {
    const g = groupTasks(tasks, 'state', states, today)
    expect(g.map(g => g.title)).toEqual(['Pendents', 'En procés'])
    expect(g[1].prefill.task_state.id).toBe(2)
  })
  it('by project (alphabetical, "Sense projecte" last) and by person (a task in each person)', () => {
    expect(groupTasks(tasks, 'project', states).map(g => g.title)).toEqual(['Alfa', 'Zeta', 'Sense projecte'])
    const byPerson = groupTasks(tasks, 'person', states)
    expect(byPerson.map(g => [g.title, g.tasks.map(t => t.id)])).toEqual([['Anna', [1]], ['Pau', [1, 3]], ['Sense persona', [2]]])
    expect(byPerson[1].prefill.users_permissions_users).toEqual([pau])
  })
})

describe('labels and queries', () => {
  it('last update', () => {
    expect(updatedLabel('2026-10-17T08:00:00Z', '2026-10-17T18:00:00Z')).toBe('avui')
    expect(updatedLabel('2026-10-16T08:00:00Z', '2026-10-17T18:00:00Z')).toBe('ahir')
    expect(updatedLabel('2026-09-15T08:00:00Z', '2026-10-17T18:00:00Z')).toBe('fa 32 dies')
    expect(updatedLabel('2026-03-01T08:00:00Z', '2026-10-17T18:00:00Z')).toBe('fa 8 mesos')
    expect(updatedLabel('2025-04-01T08:00:00Z', '2026-10-17T18:00:00Z')).toBe('fa 1 any')
    expect(updatedLabel('2023-10-01T08:00:00Z', '2026-10-17T18:00:00Z')).toBe('fa 3 anys')
    expect(isStale({ updatedAt: '2026-09-30T08:00:00Z' }, '2026-10-17T18:00:00Z')).toBe(true)
    expect(isStale({ updatedAt: '2026-10-10T08:00:00Z' }, '2026-10-17T18:00:00Z')).toBe(false)
  })
  it('the person filter goes to the server; archived ones only when asked', () => {
    expect(tasksQuery({ user: 8 })).toBe('tasks?_limit=-1&_where[archived_eq]=false&_where[users_permissions_users.id_eq]=8')
    expect(tasksQuery({ project: 5, archived: true })).toBe('tasks?_limit=-1&_where[project_eq]=5')
    expect(kanbanViewQuery({ user: 8, view: 'state' })).toBe('kanban-views?_limit=1&_where[projectId_eq]=0&_where[userId_eq]=8&_where[view_eq]=state')
  })
})
