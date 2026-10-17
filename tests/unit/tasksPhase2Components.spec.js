// Tasks, phase 2 components: the calendar view, applying a template and posting a
// comment with @mentions from the task modal.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'
import moment from 'moment'

const api = { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import TasksCalendar from '@/components/TasksCalendar.vue'
import TaskTemplates from '@/components/TaskTemplates.vue'
import ModalBoxTask from '@/components/ModalBoxTask.vue'

const states = [{ id: 1, name: 'Pendents', order: 0 }, { id: 3, name: 'Acabades', order: 2 }]
const global = { plugins: [createPinia(), Buefy] }

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  localStorage.setItem('user', JSON.stringify({ id: 5 }))
})

describe('Calendari', () => {
  it('shows each task from its start to its due date and adds a task on a day', async () => {
    const month = moment().format('YYYY-MM')
    const w = mount(TasksCalendar, {
      props: {
        states,
        tasks: [
          { id: 1, name: 'Acta', start_date: `${month}-10`, due_date: `${month}-12`, task_state: { id: 1 } },
          { id: 2, name: 'Feta', due_date: `${month}-11`, task_state: { id: 3 } },
          { id: 3, name: 'Sense data', task_state: { id: 1 } }
        ]
      },
      global
    })
    const day = d => w.findAll('.tc-day:not(.is-out)').find(c => c.find('.tc-date').text() === String(d))
    expect(day(10).findAll('.tc-task').map(t => t.text())).toEqual(['Acta'])
    expect(day(11).findAll('.tc-task').map(t => t.text())).toEqual(['Acta', 'Feta'])
    expect(day(11).find('.tc-task.is-done').text()).toBe('Feta')
    expect(w.text()).toContain('1 tasca sense data no hi surten')
    await day(15).find('.tc-add').trigger('click')
    expect(w.emitted('add')[0][0]).toEqual({ due_date: `${month}-15` })
    await day(10).find('.tc-task').trigger('click')
    expect(w.emitted('open')[0][0].id).toBe(1)
  })
})

describe('Plantilles', () => {
  it('creates the template\'s tasks in the project for the chosen person', async () => {
    api.get.mockResolvedValue({ data: [{ id: 7, name: 'Inici de projecte', items: [{ name: 'Acta', due_days: 2, checklist: ['Enviar'] }, { name: 'Factura' }] }] })
    api.post.mockResolvedValue({ data: {} })
    const w = mount(TaskTemplates, { props: { project: 4, states, users: [{ id: 5, username: 'Quim' }, { id: 8, username: 'Clara' }] }, global })
    await w.vm.openApply()
    await flushPromises()
    w.vm.from = '2027-01-01'
    w.vm.assignTo = 8
    await w.vm.apply()
    expect(api.post.mock.calls.map(c => c[1])).toEqual([
      expect.objectContaining({ name: 'Acta', project: 4, due_date: '2027-01-03', task_state: 1, users_permissions_users: [8], created: 5, checklist: [{ name: 'Enviar', done: false }] }),
      expect.objectContaining({ name: 'Factura', due_date: null, users_permissions_users: [8] })
    ])
    expect(w.emitted('applied')).toHaveLength(1)
  })
})

describe('task comments', () => {
  it('posts a comment with the ids of the mentioned people', async () => {
    api.get.mockResolvedValue({ data: [] })
    api.post.mockResolvedValue({ data: {} })
    const users = [{ id: 8, username: 'Clara Puig' }, { id: 9, username: 'Pau' }]
    const w = mount(ModalBoxTask, { props: { isActive: false, users, projects: [], states, taskObject: { id: 12, name: 'T', task_state: { id: 1 } } }, global })
    await w.setProps({ isActive: true })
    await flushPromises()
    expect(api.get).toHaveBeenCalledWith('task-comments?_limit=-1&_where[task.id_eq]=12&_sort=createdAt:ASC')
    w.vm.newComment = 'Hola @Clara Puig, mira-ho'
    await w.vm.postComment()
    expect(api.post).toHaveBeenCalledWith('task-comments', { text: 'Hola @Clara Puig, mira-ho', task: 12, mentions: [8] })
  })
})
