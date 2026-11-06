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
  data: () => ({ active: false, events: [], series: [], serieId: 0 }),
  template: `<modal-box-duplicate-project
    :is-active="active"
    :series="series"
    :serie-id="serieId"
    @confirm="(moveDates, serie) => { events.push(['confirm', moveDates, serie]); active = false }"
    @cancel="events.push(['cancel']); active = false"
  />`
}

const button = text => [...document.querySelectorAll('.modal.is-active .modal-card-foot button')].find(b => b.textContent.trim() === text)

const closers = {
  'Cancel·la': () => button('Cancel·la').click(),
  'an outside click': () => document.querySelector('.modal.is-active .modal-background').click(),
  'Escape': () => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
}

async function open (props = {}) {
  const w = mount(Parent, { global: { plugins: [Buefy] }, attachTo: document.body })
  Object.assign(w.vm, props)
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
    expect(w.vm.events).toEqual([['confirm', true, 0]])
    w.unmount()
  })

  it('"Duplica" can keep the original dates', async () => {
    const w = await open()
    const keep = [...document.querySelectorAll('.modal.is-active input[type=radio]')][1]
    keep.click()
    await flushPromises()
    button('Duplica').click()
    await flushPromises()
    expect(w.vm.events).toEqual([['confirm', false, 0]])
    w.unmount()
  })

  // «Sèries de projecte» (2026-11-06): the copy goes into a series, by default the source's
  describe('with project series', () => {
    const series = [{ id: 3, name: '2026' }, { id: 4, name: '2027' }]
    const select = () => document.querySelector('.modal.is-active .duplicate-serie select')

    it('no series, no question', async () => {
      const w = await open()
      expect(select()).toBeNull()
      w.unmount()
    })

    it("offers the source's series, and the copy goes there", async () => {
      const w = await open({ series, serieId: 3 })
      expect(select().value).toBe('3')
      expect(document.querySelector('.modal.is-active .duplicate-list').textContent).toContain('número següent de la sèrie')
      button('Duplica').click()
      await flushPromises()
      expect(w.vm.events).toEqual([['confirm', true, 3]])
      w.unmount()
    })

    it('the copy can go into another series, or none', async () => {
      const w = await open({ series, serieId: 3 })
      select().value = '4'
      select().dispatchEvent(new Event('change'))
      await flushPromises()
      button('Duplica').click()
      await flushPromises()
      expect(w.vm.events).toEqual([['confirm', true, 4]])
      w.unmount()
      const none = await open({ series, serieId: 3 })
      select().value = '0'
      select().dispatchEvent(new Event('change'))
      await flushPromises()
      expect(document.querySelector('.modal.is-active .duplicate-list').textContent).toContain('(còpia)')
      button('Duplica').click()
      await flushPromises()
      expect(none.vm.events).toEqual([['confirm', true, 0]])
      none.unmount()
    })
  })
})
