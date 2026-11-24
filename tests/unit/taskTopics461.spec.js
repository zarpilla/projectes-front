// issues/461 (2026-11-24): «Temes de tasca». The states were the only way to
// group tasks, and the last one means "done", so an entity could not use them
// as areas. Joel (La Diligència) asked for topics the admins rename and create,
// one per task, to put the board's columns, the list's groups, its order and
// its filters by topic, while the states stay common.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'
import {
  topicColumns, topicId, filterTasks, sortTasks, groupTasks, templateItems, tasksFromTemplate
} from '@/domain/tasks'

const states = [{ id: 1, name: 'Pendents', order: 0 }, { id: 2, name: 'En procés', order: 1 }, { id: 3, name: 'Acabades', order: 2 }]
// out of order on purpose: «Logística» goes first by its order
const topics = [{ id: 7, name: 'Comercial', order: 2 }, { id: 6, name: 'Logística', order: 1 }]
const tasks = () => [
  { id: 11, name: 'Revisar rutes', archived: false, task_state: states[0], task_topic: topics[1], users_permissions_users: [] },
  { id: 12, name: 'Trucar clientes', archived: false, task_state: states[1], task_topic: topics[0], users_permissions_users: [] },
  { id: 13, name: 'Fer l\'acta', archived: false, task_state: states[0], task_topic: null, users_permissions_users: [] }
]

describe('topics in the task rules', () => {
  it('columns: the topics by order, then «Sense tema»', () => {
    expect(topicColumns(topics).map(t => t.name)).toEqual(['Logística', 'Comercial', 'Sense tema'])
    expect(topicColumns([]).map(t => t.id)).toEqual([0])
    expect(topicId({ task_topic: { id: 6 } })).toBe(6)
    expect(topicId({ task_topic: 7 })).toBe(7)
    expect(topicId({ task_topic: null })).toBe(0)
  })

  it('filters by topic, 0 being «Sense tema»', () => {
    expect(filterTasks(tasks(), { topic: 6 }, states).map(t => t.id)).toEqual([11])
    expect(filterTasks(tasks(), { topic: 0 }, states).map(t => t.id)).toEqual([13])
    expect(filterTasks(tasks(), { topic: 'all' }, states)).toHaveLength(3)
  })

  it('sorts by the topics\' order, without topic last', () => {
    expect(sortTasks(tasks(), 'topic', 'asc', states, topics).map(t => t.id)).toEqual([11, 12, 13])
    expect(sortTasks(tasks(), 'topic', 'desc', states, topics).map(t => t.id)).toEqual([13, 12, 11])
  })

  it('groups by topic; a task added from a group gets its topic', () => {
    const groups = groupTasks(tasks(), 'topic', states, '2026-11-24', topics)
    expect(groups.map(g => g.title)).toEqual(['Logística', 'Comercial', 'Sense tema'])
    expect(groups.map(g => g.tasks.map(t => t.id))).toEqual([[11], [12], [13]])
    expect(groups[0].prefill).toEqual({ task_topic: topics[1] })
    expect(groups[2].prefill).toEqual({ task_topic: null })
  })

  it('a template keeps the topic of its tasks', () => {
    const items = templateItems(tasks())
    expect(items.map(i => i.task_topic)).toEqual([6, 7, null])
    const created = tasksFromTemplate(items, { project: 4, from: '2026-12-01', stateId: 1 })
    expect(created.map(t => t.task_topic)).toEqual([6, 7, null])
  })
})

const api = { get: vi.fn(), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import Tasks from '@/components/Tasks.vue'
import ModalBoxTask from '@/components/ModalBoxTask.vue'

let topicRows = topics
beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  localStorage.setItem('user', JSON.stringify({ id: 5 }))
  topicRows = topics
  api.get.mockImplementation(async url => {
    if (url.startsWith('task-states')) return { data: states }
    if (url.startsWith('task-topics')) return { data: topicRows }
    if (url.startsWith('tasks')) return { data: tasks() }
    return { data: [] }
  })
  api.put.mockImplementation(async (url, data) => {
    const id = Number(url.split('/')[1])
    const t = tasks().find(t => t.id === id)
    const topic = 'task_topic' in data ? topics.find(x => x.id === (data.task_topic && data.task_topic.id ? data.task_topic.id : data.task_topic)) || null : t.task_topic
    return { data: { ...t, ...data, task_state: t.task_state, task_topic: topic } }
  })
  api.post.mockImplementation(async (url, data) => ({ data: { ...data, id: 99 } }))
})

async function mountTasks (props = {}) {
  const w = mount(Tasks, {
    props: { view: 'state', mode: 'board', projects: [], users: [], listFilters: { state: 'open' }, ...props },
    global: { plugins: [createPinia(), Buefy], stubs: { ModalBoxTask: true } }
  })
  await flushPromises()
  return w
}
const columnNames = w => w.findAll('.task-list-name').map(s => s.text())
const columnCards = w => w.findAll('.task-list-content').map(c => c.findAll('.task-title').map(t => t.text()))

describe('board by topic', () => {
  it('one column per topic, then «Sense tema»', async () => {
    const w = await mountTasks({ view: 'topic' })
    expect(columnNames(w)).toEqual(['Logística', 'Comercial', 'Sense tema'])
    expect(columnCards(w)).toEqual([['Revisar rutes'], ['Trucar clientes'], ['Fer l\'acta']])
    // the state shows on the card instead
    expect(w.findAll('.task-list-content')[1].text()).toContain('En procés')
  })

  it('by state, the card shows its topic', async () => {
    const w = await mountTasks()
    expect(columnNames(w)).toEqual(['Pendents', 'En procés', 'Acabades'])
    expect(w.findAll('.task-chip.is-topic').map(c => c.text())).toEqual(['Logística', 'Comercial'])
  })

  it('dropping a card on another topic changes its topic, not its state', async () => {
    const w = await mountTasks({ view: 'topic' })
    const card = w.vm.tasks.find(t => t.id === 11)
    await w.vm.dropItem(card, 99999, w.vm.lists[1])
    const [url, data] = api.put.mock.calls.find(c => c[0] === 'tasks/11')
    expect(url).toBe('tasks/11')
    expect(data.task_topic).toEqual(topics[0])
    expect(data.task_state).toEqual(states[0])
    expect(columnCards(w)[1]).toContain('Revisar rutes')
  })

  it('dropping it on «Sense tema» leaves it without topic (null, not { id: 0 })', async () => {
    const w = await mountTasks({ view: 'topic' })
    await w.vm.dropItem(w.vm.tasks.find(t => t.id === 12), 99999, w.vm.lists[2])
    expect(api.put.mock.calls.find(c => c[0] === 'tasks/12')[1].task_topic).toBe(null)
  })

  it('«+» on a topic column starts the task with that topic and the first state', async () => {
    const w = await mountTasks({ view: 'topic' })
    w.vm.addTask(w.vm.lists[0])
    expect(w.vm.taskObject).toMatchObject({ task_topic: topics[1], task_state: states[0] })
    w.vm.addTask(w.vm.lists[2])
    expect(w.vm.taskObject.task_topic).toBe(null)
  })
})

describe('list by topic', () => {
  const groupTitles = w => w.findAll('.tl-group-name').map(s => s.text())

  it('groups by topic and changes a row\'s topic', async () => {
    const w = await mountTasks({ mode: 'list', groupBy: 'topic' })
    expect(groupTitles(w)).toEqual(['Logística', 'Comercial', 'Sense tema'])
    const list = w.findComponent({ name: 'TasksList' })
    expect(list.findAll('th').map(t => t.text())).toContain('Tema')
    list.vm.change(tasks()[2], { task_topic: 7 })
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('tasks/13', { task_topic: 7 })
    expect(groupTitles(w)).toEqual(['Logística', 'Comercial'])
  })

  it('no Tema column while the entity has no topics', async () => {
    topicRows = []
    const w = await mountTasks({ mode: 'list' })
    const list = w.findComponent({ name: 'TasksList' })
    expect(list.findAll('th').map(t => t.text())).not.toContain('Tema')
  })
})

describe('task modal', () => {
  const mountModal = (props = {}) => mount(ModalBoxTask, {
    props: { isActive: false, users: [], projects: [], states, topics: [topics[1], topics[0]], ...props },
    global: { plugins: [createPinia(), Buefy] }
  })

  it('shows the Tema field and sends its id', async () => {
    const w = mountModal({ taskObject: { id: 12, name: 'T', task_state: { id: 1 }, task_topic: { id: 7, name: 'Comercial' } } })
    api.get.mockResolvedValue({ data: [] })
    await w.setProps({ isActive: true })
    await flushPromises()
    expect(w.find('#tm-topic').exists()).toBe(true)
    expect(w.findAll('#tm-topic option').map(o => o.text())).toEqual(['Sense tema', 'Logística', 'Comercial'])
    expect(w.vm.form.task_topic).toBe(7)
    w.vm.submit()
    expect(w.emitted('submit')[0][0].task_topic).toBe(7)
  })

  it('no field without topics; «Sense tema» is sent as null', async () => {
    const w = mountModal({ topics: [], taskObject: { id: 12, name: 'T', task_state: { id: 1 } } })
    api.get.mockResolvedValue({ data: [] })
    await w.setProps({ isActive: true })
    await flushPromises()
    expect(w.find('.tm-side').exists()).toBe(true)
    expect(w.find('#tm-topic').exists()).toBe(false)
    w.vm.form = { name: 'T', task_state: 1, task_topic: null, checklist: [] }
    w.vm.submit()
    expect(w.emitted('submit')[0][0].task_topic).toBe(null)
  })
})
