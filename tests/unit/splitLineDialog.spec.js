// issues/132: the split-line dialog had ten buttons in one footer row that
// overflowed it at 1440 px and hid «Cancel·la»; x2 / /2 didn't say what they do
import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import ModalBoxSplit from '@/components/ModalBoxSplit.vue'

const line = { phase: {}, subphase: { quantity: 1, amount: 1200.5 }, i: 0, j: 0, type: 'income' }

async function open () {
  const w = mount(ModalBoxSplit, {
    props: { isActive: false, invoicingObject: null },
    global: { plugins: [Buefy] },
    attachTo: document.body
  })
  await w.setProps({ invoicingObject: line })
  await w.setProps({ isActive: true })
  await flushPromises()
  return w
}

describe('split-line dialog (issues/132)', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('keeps only Cancel·la and Separa in the footer', async () => {
    const w = await open()
    const foot = [...document.querySelectorAll('.modal-card-foot button')].map(b => b.textContent.trim())
    expect(foot).toEqual(['Cancel·la', 'Separa en dues línies'])
    w.unmount()
  })

  it('explains every repeat and divide button and emits its action', async () => {
    const w = await open()
    const buttons = [...document.querySelectorAll('.split-actions button')]
    expect(buttons.map(b => b.textContent.trim())).toEqual(['×2', '×3', '×4', '×12', '÷2', '÷3', '÷4', '÷12'])
    buttons.forEach(b => expect(b.getAttribute('title')).toMatch(/una per mes/))
    buttons[4].click()
    expect(w.emitted('action')[0][0].action).toBe('d2')
    buttons[3].click()
    expect(w.emitted('action')[1][0].action).toBe('x12')
    w.unmount()
  })

  it('shows the rest of the price in the app number format', async () => {
    const w = await open()
    w.vm.newAmount = 200
    await flushPromises()
    expect(document.querySelector('.split-rest').textContent.trim()).toBe('1.000,50')
    w.unmount()
  })
})
