// "Duplicar projecte" could not be cancelled: the old confirm dialog had two buttons
// that both duplicated ("Moure dates +1 any" / "Mantenir dates originals", the second
// wired as the dialog's cancel), and Escape or an outside click also duplicated.
// Now every way of closing it without "Duplica" cancels, and "Duplica" says whether
// to move the dates.
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import ModalBoxDuplicateProject from '@/components/ModalBoxDuplicateProject.vue'

const Parent = {
  components: { ModalBoxDuplicateProject },
  data: () => ({ active: false, events: [] }),
  template: `<modal-box-duplicate-project
    :is-active="active"
    @confirm="moveDates => { events.push(['confirm', moveDates]); active = false }"
    @cancel="events.push(['cancel']); active = false"
  />`
}

const button = text => [...document.querySelectorAll('.modal.is-active .modal-card-foot button')].find(b => b.textContent.trim() === text)

const closers = {
  'Cancel·la': () => button('Cancel·la').click(),
  'an outside click': () => document.querySelector('.modal.is-active .modal-background').click(),
  'Escape': () => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
}

async function open () {
  const w = mount(Parent, { global: { plugins: [Buefy] }, attachTo: document.body })
  w.vm.active = true
  await flushPromises()
  expect(document.querySelector('.modal.is-active .duplicate-project-modal')).not.toBeNull()
  return w
}

describe('Duplicar projecte modal', () => {
  it.each(Object.keys(closers))('%s cancels without duplicating', async closer => {
    const w = await open()
    closers[closer]()
    await flushPromises()
    expect(w.vm.events.map(e => e[0])).not.toContain('confirm')
    expect(w.vm.events[0]).toEqual(['cancel'])
    expect(w.vm.active).toBe(false)
    w.unmount()
  })

  it('"Duplica" moves the dates one year by default', async () => {
    const w = await open()
    button('Duplica').click()
    await flushPromises()
    expect(w.vm.events).toEqual([['confirm', true]])
    w.unmount()
  })

  it('"Duplica" can keep the original dates', async () => {
    const w = await open()
    const keep = [...document.querySelectorAll('.modal.is-active input[type=radio]')][1]
    keep.click()
    await flushPromises()
    button('Duplica').click()
    await flushPromises()
    expect(w.vm.events).toEqual([['confirm', false]])
    w.unmount()
  })
})
