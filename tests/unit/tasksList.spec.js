// Tasques · Llista (TasksList inside Tasks.vue) and the task fixes that came with it:
// the person filter on the server, partial saves from the list, the creator of a new
// task and of a checklist item, and "no Funció" sent as null.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'
import moment from 'moment'

const states = [{ id: 1, name: 'Pendents', order: 0 }, { id: 2, name: 'En procés', order: 1 }, { id: 3, name: 'Acabades', order: 2 }]
const day = n => moment().add(n, 'days').format('YYYY-MM-DD')
const anna = { id: 8, username: 'Anna Puig' }
const pau = { id: 9, username: 'Pau Serra' }
const tasks = () => [
  { id: 11, name: 'Publicar la difusió', archived: false, due_date: day(-3), task_state: states[0], users_permissions_users: [anna], checklist: [{ done: true }, { done: false }] },
  { id: 12, name: 'Enviar el pressupost', archived: false, due_date: day(2), task_state: states[1], users_permissions_users: [anna, pau] },
  { id: 13, name: 'Fer l\'acta', archived: false, due_date: null, task_state: states[0], users_permissions_users: [] },
  { id: 14, name: 'Tancar la justificació', archived: false, due_date: day(-30), task_state: states[2], users_permissions_users: [pau] }
]

const api = { get: vi.fn(), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import Tasks from '@/components/Tasks.vue'
import ModalBoxTask from '@/components/ModalBoxTask.vue'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  localStorage.setItem('user', JSON.stringify({ id: 5 }))
  api.get.mockImplementation(async url => {
    if (url.startsWith('task-states')) return { data: states }
    if (url.startsWith('tasks')) return { data: tasks() }
    return { data: [] }
  })
  api.put.mockImplementation(async (url, data) => {
    const id = Number(url.split('/')[1])
    const t = tasks().find(t => t.id === id)
    return { data: { ...t, ...data, task_state: data.task_state ? states.find(s => s.id === data.task_state) : t.task_state } }
  })
  api.post.mockImplementation(async (url, data) => ({ data: { ...data, id: 99 } }))
})

async function mountList (props = {}) {
  const w = mount(Tasks, {
    props: { view: 'state', mode: 'list', projects: [], users: [anna, pau], listFilters: { state: 'open', due: 'all', activityType: null }, ...props },
    global: { plugins: [createPinia(), Buefy], stubs: { ModalBoxTask: true } }
  })
  await flushPromises()
  return w
}
const groupTitles = w => w.findAll('.tl-group-name').map(s => s.text())
const rowNames = w => w.findAll('.tl-title').map(a => a.text())

describe('Tasques · Llista', () => {
  it('groups the open tasks by due date (done ones hidden by default)', async () => {
    const w = await mountList()
    expect(groupTitles(w)).toEqual(['Vençudes', 'Pròxims 7 dies', 'Sense data'])
    expect(rowNames(w)).toEqual(['Publicar la difusió', 'Enviar el pressupost', 'Fer l\'acta'])
    expect(w.text()).toContain('1/2')
  })

  it('groups by person, a task under each of its people', async () => {
    const w = await mountList({ groupBy: 'person' })
    expect(groupTitles(w)).toEqual(['Anna Puig', 'Pau Serra', 'Sense persona'])
    expect(rowNames(w)).toEqual(['Publicar la difusió', 'Enviar el pressupost', 'Enviar el pressupost', 'Fer l\'acta'])
  })

  it('changes the due date of a row with a partial save', async () => {
    const w = await mountList()
    // an empty date shows "Afegeix data"; the field appears on click
    const add = w.findAll('.tl-due button')
    expect(add.map(b => b.text())).toEqual(['Afegeix data'])
    await add[0].trigger('click')
    const input = w.findAll('input.tl-date')[2]
    await input.setValue(day(10))
    await input.trigger('change')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('tasks/13', { due_date: day(10) })
    expect(groupTitles(w)).toEqual(['Vençudes', 'Pròxims 7 dies', 'Més endavant'])
  })

  it('changes the state of the selected tasks at once', async () => {
    const w = await mountList()
    const boxes = w.findAll('tbody input[type=checkbox]')
    await boxes[0].setValue(true)
    await boxes[2].setValue(true)
    expect(w.find('.tl-bulk').text()).toContain('2 seleccionades')
    w.findComponent({ name: 'TasksList' }).vm.bulk({ task_state: 3 })
    await flushPromises()
    expect(api.put.mock.calls.map(c => c[0])).toEqual(['tasks/11', 'tasks/13'])
    expect(api.put.mock.calls[0][1]).toEqual({ task_state: 3 })
    // now done: they leave the "Obertes" list
    expect(rowNames(w)).toEqual(['Enviar el pressupost'])
  })

  it('asks the server for the person\'s tasks (it loaded all and filtered here)', async () => {
    await mountList({ user: 8 })
    const query = api.get.mock.calls.map(c => c[0]).find(u => u.startsWith('tasks'))
    expect(query).toBe('tasks?_limit=-1&_where[archived_eq]=false&_where[users_permissions_users.id_eq]=8')
  })

  it('loads the archived tasks too when asked, with a way to restore them', async () => {
    api.get.mockImplementation(async url => {
      if (url.startsWith('task-states')) return { data: states }
      if (url.startsWith('tasks')) return { data: [...tasks(), { id: 15, name: 'Arxivar', archived: true, task_state: states[0], users_permissions_users: [] }] }
      return { data: [] }
    })
    const w = await mountList({ showArchived: true })
    expect(api.get.mock.calls.map(c => c[0]).find(u => u.startsWith('tasks'))).toBe('tasks?_limit=-1')
    await w.find('.tl-restore').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('tasks/15', { archived: false })
  })

  it('a new task is created by the logged-in person, not by the Persona filter', async () => {
    const w = await mountList({ user: 8 })
    await w.vm.modalSubmit({ name: 'Nova', task_state: 1 })
    expect(api.post).toHaveBeenCalledWith('tasks', expect.objectContaining({ name: 'Nova', created: 5 }))
  })
})

describe('task modal', () => {
  const mountModal = () => mount(ModalBoxTask, {
    props: { isActive: false, users: [anna], projects: [], states },
    global: { plugins: [createPinia(), Buefy] }
  })

  it('a checklist item is created by the logged-in person', () => {
    const w = mountModal()
    w.vm.form.checklist = []
    w.vm.checklistToAdd = 'Trucar'
    w.vm.addPhase()
    expect(w.vm.form.checklist[0]).toMatchObject({ name: 'Trucar', created: 5 })
  })

  it('sends no Funció as null (it sent 0 or { id: 0 })', () => {
    const w = mountModal()
    w.vm.form = { name: 'T', task_state: 1, activity_type: 0, checklist: [] }
    w.vm.submit()
    expect(w.emitted('submit')[0][0].activity_type).toBe(null)
    w.vm.form = { name: 'T', task_state: 1, activity_type: { id: 0 }, checklist: [] }
    w.vm.submit()
    expect(w.emitted('submit')[1][0].activity_type).toBe(null)
    w.vm.form = { name: 'T', task_state: 1, activity_type: 7, checklist: [] }
    w.vm.submit()
    expect(w.emitted('submit')[2][0].activity_type).toBe(7)
  })
})
