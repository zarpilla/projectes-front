// The tasks kanban (Tasks page and the Tasks section of a project), issues/009:
// cards were rendered with a bare `draggable` attribute. Vue 2 turned it into
// draggable="true"; Vue 3 renders draggable="", which browsers treat as "auto",
// so a div card could no longer be dragged to reorder it or move it to another column.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const states = [{ id: 1, name: 'Pendent' }, { id: 2, name: 'Fet' }]
const task = (id, state, order) => ({
  id, name: `T${id}`, archived: false, checklist: [], users_permissions_users: [],
  task_state: states.find(s => s.id === state), activity_type: null, order
})

const api = { get: vi.fn(), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import Tasks from '@/components/Tasks.vue'

beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockImplementation(async url => {
    if (url.startsWith('task-states')) return { data: states }
    if (url.startsWith('tasks')) return { data: [task(11, 1, 0), task(12, 1, 10), task(13, 2, 0)] }
    return { data: [] } // kanban-views
  })
  api.put.mockResolvedValue({ data: {} })
  api.post.mockResolvedValue({ data: {} })
})

async function mountBoard () {
  const w = mount(Tasks, {
    props: { view: 'state', projects: [], users: [] },
    global: { plugins: [createPinia(), Buefy], stubs: { ModalBoxTask: true } }
  })
  await flushPromises()
  return w
}

// What the browser does: dragstart on a card, then drop on a zone
async function dragAndDrop (card, zone) {
  const data = {}
  const dataTransfer = { setData: (k, v) => { data[k] = String(v) }, getData: k => data[k] }
  await card.trigger('dragstart', { dataTransfer })
  await zone.trigger('drop', { dataTransfer })
  await flushPromises()
}

const columns = w => w.findAll('.task-list-body')
const names = col => col.findAll('.card-and-drop .task-title').map(h => h.text())

describe('Tasks kanban', () => {
  it('renders cards as draggable="true"', async () => {
    const w = await mountBoard()
    const cards = w.findAll('.card-and-drop > .card')
    expect(cards).toHaveLength(3)
    cards.forEach(c => expect(c.attributes('draggable')).toBe('true'))
  })

  it('reorders a card inside its column', async () => {
    const w = await mountBoard()
    const [pending] = columns(w)
    expect(names(pending)).toEqual(['T11', 'T12'])
    await dragAndDrop(pending.findAll('.card-and-drop > .card')[1], pending.find('.empty-zone-no-card-first'))
    expect(names(columns(w)[0])).toEqual(['T12', 'T11'])
    expect(api.put).toHaveBeenCalledWith('tasks/12', expect.objectContaining({ id: 12 }))
    expect(api.post).toHaveBeenCalledWith('kanban-views', expect.anything())
  })

  it('moves a card to another column and saves its new state', async () => {
    const w = await mountBoard()
    const [pending, done] = columns(w)
    await dragAndDrop(pending.findAll('.card-and-drop > .card')[0], done.findAll('.empty-zone-no-card').at(-1))
    expect(names(columns(w)[0])).toEqual(['T12'])
    expect(names(columns(w)[1])).toEqual(['T13', 'T11'])
    expect(api.put).toHaveBeenCalledWith('tasks/11', expect.objectContaining({ task_state: states[1] }))
  })

  // issues/090: the due date of a finished task was shown in red as overdue
  it('marks only unfinished tasks past their due date as overdue', async () => {
    api.get.mockImplementation(async url => {
      if (url.startsWith('task-states')) return { data: states }
      if (url.startsWith('tasks')) {
        return { data: [{ ...task(21, 1, 0), due_date: '2020-01-01' }, { ...task(22, 2, 0), due_date: '2020-01-01' }] }
      }
      return { data: [] }
    })
    const w = await mountBoard()
    const chip = name => w.findAll('.card-and-drop > .card')
      .find(c => c.find('.task-title').text() === name).find('.task-chip')
    expect(chip('T21').classes()).toContain('is-overdue')
    expect(chip('T21').text()).toContain('Vençuda')
    expect(chip('T22').classes()).not.toContain('is-overdue')
    expect(chip('T22').text()).not.toContain('Vençuda')
  })

  // issues/253: a state changed in Llista left the card in its old Tauler column
  it('moves the card on the board when its state changes in the list', async () => {
    const w = mount(Tasks, {
      props: { view: 'state', projects: [], users: [], mode: 'list' },
      global: { plugins: [createPinia(), Buefy], stubs: { ModalBoxTask: true, TasksList: true } }
    })
    await flushPromises()
    api.put.mockResolvedValueOnce({ data: { ...task(11, 2, 0) } })
    await w.vm.updateTasks({ tasks: [w.vm.tasks.find(t => t.id === 11)], patch: { task_state: 2 } })
    await w.setProps({ mode: 'board' })
    await flushPromises()
    expect(names(columns(w)[0])).toEqual(['T12'])
    expect(names(columns(w)[1])).toContain('T11')
  })
})
