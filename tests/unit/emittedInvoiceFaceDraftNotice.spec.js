// Draft confirmation for a FACe client: warn that the invoice will go to FACe
// once it is emitted for real.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import ModalBoxEmittedInvoices from '@/components/ModalBoxEmittedInvoices.vue'

const invoice = { emitted: '2026-10-26', totalBase: 100, totalVat: 21, totalIrpf: 0, total: 121 }

async function open (props) {
  const w = mount(ModalBoxEmittedInvoices, {
    props: { isActive: false, invoice, ...props },
    global: { plugins: [createPinia(), Buefy] },
    attachTo: document.body
  })
  await w.setProps({ isActive: true })
  await flushPromises()
  return w
}

const text = () => document.body.textContent

describe('Emit invoice modal, FACe notice', () => {
  it('tells a draft for a FACe client it will be sent once emitted', async () => {
    const w = await open({ toReal: false, contact: { name: 'UAB', nif: 'Q0818002H', face: true } })
    expect(document.querySelector('.face-draft-notice')).not.toBeNull()
    expect(text()).toContain("quan aquesta factura s'emeti definitivament, s'enviarà automàticament")
    w.unmount()
  })

  it('says nothing about FACe on a draft for a normal client', async () => {
    const w = await open({ toReal: false, contact: { name: 'Ateneu', nif: 'G00000017', face: false } })
    expect(document.querySelector('.face-draft-notice')).toBeNull()
    w.unmount()
  })

  it('keeps the sending notice, not the draft one, when emitting', async () => {
    const w = await open({ toReal: true, contact: { name: 'UAB', nif: 'Q0818002H', face: true } })
    expect(document.querySelector('.face-draft-notice')).toBeNull()
    expect(text()).toContain("aquesta factura s'enviarà a l'administració tributària")
    w.unmount()
  })
})
