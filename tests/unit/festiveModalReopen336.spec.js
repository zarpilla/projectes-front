// issues/336: «Entrada festiu» (and any b-modal) closed without saving and
// opened again at once was emptied a moment later: Buefy's afterLeave, at the
// end of the closing animation, destroyed the content of the modal that was
// open again. It left the DOM, and its datepicker threw on a click.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import Buefy from 'buefy'
import { keepReopenedModals } from '@/helpers/buefyModal'

vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(() => Promise.resolve({ data: [] })) })
}))
import ModalBoxFestive from '@/components/ModalBoxFestive.vue'

// as DedicationInput: `active` follows the modal's cancel and submit
const Parent = {
  components: { ModalBoxFestive },
  data: () => ({ active: false }),
  template: `<modal-box-festive
    :is-active="active"
    :festive-object="null"
    :users="users"
    :festive-types="types"
    @cancel="active = false"
    @submit="active = false"
  />`,
  computed: {
    users: () => [{ id: 5, username: 'anna' }],
    types: () => [{ id: 1, name: 'Vacances', personal: true }]
  }
}

async function mountParent () {
  const pinia = createPinia()
  setActivePinia(pinia)
  useMainStore().userName = 'anna'
  const w = mount(Parent, {
    global: {
      plugins: [pinia, Buefy, { install: keepReopenedModals }],
      // the real <transition>: its end is what emptied the modal
      stubs: { transition: false }
    },
    attachTo: document.body
  })
  await flushPromises()
  return w
}

const box = () => document.querySelector('.modal.is-active .modal-card-dedication')
// past the end of the closing animation (none in jsdom: the next frame)
const afterAnimations = () => new Promise(resolve => setTimeout(resolve, 200))

const closers = {
  'Cancel·la': () => [...box().querySelectorAll('button')].find(b => b.textContent.trim() === 'Cancel·la').click(),
  'Escape': () => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' })),
  'a click outside': () => document.querySelector('.modal.is-active .modal-background').click()
}

describe('«Entrada festiu» opened again at once (issues/336)', () => {
  it.each(Object.keys(closers))('stays open after closing it with %s', async closer => {
    const w = await mountParent()
    w.vm.active = true
    await flushPromises()
    await afterAnimations()
    expect(box()).not.toBeNull()

    // reopened while Buefy takes the closed content out (destroyOnHide): the
    // moment it is gone from the render, before that removal's own animation ends
    const bModal = w.findComponent({ name: 'BModal' })
    const reopened = new Promise(resolve => {
      const stop = bModal.vm.$watch('destroyed', gone => {
        if (!gone) return
        stop()
        w.vm.active = true
        resolve()
      }, { flush: 'post' })
    })
    closers[closer]()
    await flushPromises()
    expect(w.vm.active).toBe(false)
    await reopened
    await flushPromises()
    await afterAnimations()

    expect(box()).not.toBeNull()
    expect(box().querySelector('.datepicker input')).not.toBeNull()
    w.unmount()
  })

  it('still empties a modal that stays closed', async () => {
    const w = await mountParent()
    w.vm.active = true
    await flushPromises()
    await afterAnimations()
    closers['Cancel·la']()
    await flushPromises()
    await afterAnimations()
    expect(document.querySelector('.modal-card-dedication')).toBeNull()
    w.unmount()
  })
})
