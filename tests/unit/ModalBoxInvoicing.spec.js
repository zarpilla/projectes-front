import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import ModalBoxInvoicing from '@/components/ModalBoxInvoicing.vue'

const income = { id: 7, code: '2025-009', total_base: 13684, contact: null }
const expense = { id: 9, code: 'D-2026-3', total_base: 40, contact: null }

async function open (invoicingObject) {
  const wrapper = mount(ModalBoxInvoicing, {
    props: { isActive: false, invoicingObject },
    global: {
      plugins: [Buefy],
      stubs: { RouterLink: { props: ['to'], template: '<a class="doc-link" :href="to"><slot /></a>' } }
    },
    attachTo: document.body
  })
  await wrapper.setProps({ isActive: true })
  await flushPromises()
  return wrapper
}

const links = () => [...document.querySelectorAll('a.doc-link')].map(a => a.getAttribute('href'))

describe('ModalBoxInvoicing (issues/365)', () => {
  it('shows «Veure document» for an income already assigned to the line', async () => {
    const w = await open({ type: 'incomes', subphase: { paid: true, income }, received_incomes: [income], emitted_invoices: [], contacts: [] })
    expect(links()).toContain('/document/7/received-incomes')
    w.vm.submit()
    const [form] = w.emitted('submit')[0]
    expect(form.income).toEqual(income)
    expect(form.grant).toBeNull()
    w.unmount()
  })

  it('shows «Veure document» for an expense already assigned to the line', async () => {
    const w = await open({ type: 'expenses', subphase: { paid: true, expense }, received_expenses: [expense], received_invoices: [], contacts: [] })
    expect(links()).toContain('/document/9/received-expenses')
    w.unmount()
  })

  it('does not keep the documents of the line opened before', async () => {
    const w = await open({ type: 'incomes', subphase: { paid: true, income }, received_incomes: [income], contacts: [] })
    await w.setProps({ isActive: false })
    await w.setProps({ invoicingObject: { type: 'incomes', subphase: { paid: false }, received_incomes: [income], contacts: [] } })
    await w.setProps({ isActive: true })
    await flushPromises()
    w.vm.submit()
    const forms = w.emitted('submit')
    expect(forms[forms.length - 1][0].income).toBeNull()
    w.unmount()
  })
})
