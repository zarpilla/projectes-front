// Closing a modal by clicking outside it or pressing Escape (issues/047). Buefy 3
// dropped b-modal's `onCancel` prop for `cancelCallback`, and in Vue 3
// `:on-cancel="cancel"` didn't reach the modal's `cancel` event either, so the
// modal closed itself but never told its parent. The parent's `isActive` stayed
// true and the next "Afegir dedicació", click on an entry or on the running
// counter changed nothing: the hours modal only opened again after a reload.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import Buefy from 'buefy'

vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(() => Promise.resolve({ data: [] })) })
}))
import ModalBoxDedication from '@/components/ModalBoxDedication.vue'

const project = {
  id: 3,
  name: 'R/26. Preparació propostes',
  project_state: { can_assign_activities: true },
  global_activity_types: [],
  default_dedication_type: null
}

// The parent's side of the contract, as DedicationInput does it: `active`
// follows the modal's `cancel` event.
const Parent = {
  components: { ModalBoxDedication },
  props: ['dedicationObject', 'counter'],
  data: () => ({ active: false }),
  template: `<modal-box-dedication
    :is-active="active"
    :dedication-object="dedicationObject"
    :counter="counter"
    :projects="projects"
    :users="users"
    @cancel="active = false"
  />`,
  computed: {
    projects: () => [project],
    users: () => [{ id: 5, username: 'anna' }]
  }
}

async function mountParent (props) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useMainStore().userName = 'anna'
  const w = mount(Parent, {
    props: { dedicationObject: null, counter: null, ...props },
    global: { plugins: [pinia, Buefy] },
    attachTo: document.body
  })
  await flushPromises()
  return w
}

async function open (w) {
  w.vm.active = true
  await flushPromises()
}

const isOpen = () => !!document.querySelector('.modal.is-active .modal-card-dedication')

const cases = {
  'a new entry': {},
  'an existing entry': {
    dedicationObject: {
      id: 9, date: '2026-10-14', hours: 2, project,
      users_permissions_user: { id: 5, username: 'anna' }
    }
  },
  'a running counter': {
    counter: { id: 4, project, description: null, created_at: '2026-10-14T12:04:29.000Z' }
  }
}

const closers = {
  'clicking outside': () => document.querySelector('.modal.is-active .modal-background').click(),
  'pressing Escape': () => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
}

describe.each(Object.entries(cases))('ModalBoxDedication with %s', (_, props) => {
  it.each(Object.keys(closers))('opens again after %s', async closer => {
    const w = await mountParent(props)
    await open(w)
    expect(isOpen()).toBe(true)

    closers[closer]()
    await flushPromises()
    expect(w.vm.active).toBe(false)

    await open(w)
    expect(isOpen()).toBe(true)
    w.unmount()
  })
})

// Every other modal had the same `:on-cancel` (issues/047). Buefy 3 modals tell
// their parent through the `cancel` event (or the `cancelCallback` prop).
describe('b-modal close handlers', () => {
  it('no component passes on-cancel to a b-modal', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const files = fs.readdirSync('src', { recursive: true }).filter(f => f.endsWith('.vue'))
    const offenders = files.filter(f => {
      const source = fs.readFileSync(path.join('src', f), 'utf8')
      return [...source.matchAll(/<b-modal\b[^>]*>/gs)].some(([tag]) => /\son-cancel=|:on-cancel=|onCancel=/.test(tag))
    })
    expect(offenders).toEqual([])
  })
})
