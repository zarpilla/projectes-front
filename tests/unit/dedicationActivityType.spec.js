// The "Funció" radios of the hours modal (issues/039): picking an activity type
// must select it and keep it in the form that is submitted. With Vue 3 the
// modal's `@input` on <radio-picker> became a native listener on the radio, so
// the tasks reload started on `input` unmounted the field before its `change`
// arrived and the choice was lost.
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
  global_activity_types: [{ id: 11, name: 'Licitacions' }, { id: 12, name: 'Propostes' }],
  default_dedication_type: null
}

async function openModal (props) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useMainStore().userName = 'anna'
  const w = mount(ModalBoxDedication, {
    props: {
      isActive: false,
      projects: [project],
      users: [{ id: 5, username: 'anna' }],
      ...props
    },
    global: { plugins: [pinia, Buefy] },
    attachTo: document.body
  })
  await w.setProps({ isActive: true })
  await flushPromises()
  return w
}

function funcioRadio (w, label) {
  return w.findAll('label.b-radio').find(l => l.text() === label)
}

// A user's click as the browser delivers it: `input`, then `change`, with the
// microtasks (Vue's re-render) run in between. jsdom's click() runs no
// microtasks between the two events.
async function userClick (input) {
  input.checked = true
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await Promise.resolve()
  await Promise.resolve()
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

const cases = {
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

describe.each(Object.entries(cases))('ModalBoxDedication Funció, %s', (_, props) => {
  it('selects the clicked activity type and submits it', async () => {
    const w = await openModal(props)
    await userClick(funcioRadio(w, 'Propostes').find('input').element)
    await flushPromises()

    expect(funcioRadio(w, 'Propostes').find('input').element.checked).toBe(true)
    expect(String(w.vm.form.activity_type)).toBe('12')

    await w.find('form').trigger('submit')
    await flushPromises()
    const [[payload]] = w.emitted('submit')
    expect(String(payload.activity_type)).toBe('12')
    w.unmount()
  })
})
