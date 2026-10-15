// issues/048 — "Cancel·lar" in the "Nova Dieta" modal of a new received expense
// (#/document/0/received-expenses?document_type=4) did nothing: DocumentForm
// listened with @cancel="handleDietModalCancel" but had no such method, so
// isDietModalActive stayed true and the modal stayed open. Cancelling must close
// it and leave the user on the expense form; so must an outside click or Escape,
// and the modal must open again afterwards.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(() => Promise.resolve({ data: [] })) })
}))
import DocumentForm from '@/components/DocumentForm.vue'
import ModalBoxDiet from '@/components/ModalBoxDiet.vue'

// DocumentForm's own wiring of the modal, with its real cancel handler
const Parent = {
  components: { ModalBoxDiet },
  data: () => ({ isDietModalActive: false }),
  methods: { handleDietModalCancel: DocumentForm.methods.handleDietModalCancel },
  template: `<modal-box-diet
    :is-active="isDietModalActive"
    :users="[]"
    :projects="[]"
    :quotes="null"
    :current-user="null"
    @cancel="handleDietModalCancel"
  />`
}

const isOpen = () => !!document.querySelector('.modal.is-active .modal-card-diet')

const closers = {
  'Cancel·lar': () => [...document.querySelectorAll('.modal.is-active .modal-card-foot button')].find(b => b.textContent.trim() === 'Cancel·lar').click(),
  'an outside click': () => document.querySelector('.modal.is-active .modal-background').click(),
  'Escape': () => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
}

describe('Nova Dieta modal', () => {
  it.each(Object.keys(closers))('closes with %s and opens again', async closer => {
    expect(DocumentForm.methods.handleDietModalCancel).toBeTypeOf('function')
    const w = mount(Parent, { global: { plugins: [Buefy] }, attachTo: document.body })
    w.vm.isDietModalActive = true
    await flushPromises()
    expect(isOpen()).toBe(true)

    closers[closer]()
    await flushPromises()
    expect(w.vm.isDietModalActive).toBe(false)
    expect(w.findComponent(ModalBoxDiet).vm.isModalActive).toBe(false)

    w.vm.isDietModalActive = true
    await flushPromises()
    expect(isOpen()).toBe(true)
    w.unmount()
  })
})
