// issues/463 (2026-11-25): in the board by topic («Columnes per: Tema», issues/461)
// the finished tasks (last state, whatever its name) piled up in the topic columns.
// Joel (La Diligència) asked to hide them there completely: they stay in the last
// state of the board by state until they are archived.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'

// the last state is «done» whatever its name (here «Tancades», not «Acabades»)
const states = [{ id: 1, name: 'Pendents', order: 0 }, { id: 2, name: 'En procés', order: 1 }, { id: 3, name: 'Tancades', order: 2 }]
const topics = [{ id: 6, name: 'Logística', order: 1 }, { id: 7, name: 'Comercial', order: 2 }]
const tasks = () => [
  { id: 11, name: 'Revisar rutes', archived: false, task_state: states[0], task_topic: topics[0], users_permissions_users: [] },
  { id: 12, name: 'Trucar clientes', archived: false, task_state: states[1], task_topic: topics[1], users_permissions_users: [] },
  { id: 13, name: 'Rutes tancades', archived: false, task_state: states[2], task_topic: topics[0], users_permissions_users: [] },
  { id: 14, name: 'Acta feta', archived: false, task_state: states[2], task_topic: null, users_permissions_users: [] }
]

const api = { get: vi.fn(), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import Tasks from '@/components/Tasks.vue'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  localStorage.setItem('user', JSON.stringify({ id: 5 }))
  api.get.mockImplementation(async url => {
    if (url.startsWith('task-states')) return { data: states }
    if (url.startsWith('task-topics')) return { data: topics }
    if (url.startsWith('tasks')) return { data: tasks() }
    return { data: [] }
  })
  api.put.mockImplementation(async (url, data) => ({ data: { ...tasks().find(t => t.id === Number(url.split('/')[1])), ...data } }))
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
const columnCards = w => w.findAll('.task-list-content').map(c => c.findAll('.task-title').map(t => t.text()))

describe('finished tasks in the board by topic (issues/463)', () => {
  it('by topic, the tasks in the last state are not shown at all', async () => {
    const w = await mountTasks({ view: 'topic' })
    expect(columnCards(w)).toEqual([['Revisar rutes'], ['Trucar clientes'], []])
    expect(w.text()).not.toContain('Rutes tancades')
    expect(w.text()).not.toContain('Acta feta')
  })

  it('by state, they still pile up in the last state until archived', async () => {
    const w = await mountTasks()
    expect(columnCards(w)).toEqual([['Revisar rutes'], ['Trucar clientes'], ['Rutes tancades', 'Acta feta']])
  })

  it('a task saved with the last state leaves the topic board', async () => {
    const w = await mountTasks({ view: 'topic' })
    await w.vm.modalSubmit({ ...tasks()[0], task_state: states[2] })
    await flushPromises()
    expect(columnCards(w)[0]).toEqual([])
  })
})
