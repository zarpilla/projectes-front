// The "Verifactu i FACe" side card of an emitted invoice: the backend adds
// verifactu_chain / face_queue only when the integration is on, "missing" when
// the invoice hasn't been sent yet.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import InvoiceSubmissionCard, { submissionStatus } from '@/components/InvoiceSubmissionCard.vue'

const mountCard = props => mount(InvoiceSubmissionCard, {
  props: { invoiceId: 295, ...props },
  global: { stubs: { RouterLink: RouterLinkStub, 'b-icon': true } }
})
const tags = w => w.findAll('.tag').map(t => t.text())

describe('InvoiceSubmissionCard', () => {
  beforeEach(() => {
    get.mockReset()
    localStorage.clear()
  })

  it('names every state in Catalan', () => {
    expect(submissionStatus('verifactu', undefined).label).toBe('No activat')
    expect(submissionStatus('verifactu', 'missing').label).toBe('No enviada')
    expect(submissionStatus('verifactu', 'okwitherrors').label).toBe('Acceptada amb errors')
    expect(submissionStatus('face', 'delivered').label).toBe('Lliurada')
    expect(submissionStatus('face', 'something-new').label).toBe('something-new')
  })

  it('says when neither integration is on and looks nothing up', async () => {
    const w = mountCard({})
    await flushPromises()
    expect(tags(w)).toEqual(['No activat', 'No activat'])
    expect(w.text()).toContain('no estan activats')
    expect(get).not.toHaveBeenCalled()
  })

  it('links admins to the register entries of sent invoices', async () => {
    localStorage.setItem('user', JSON.stringify({ permissions: [{ permission: 'admin' }] }))
    get.mockImplementation(url => Promise.resolve({ data: url.startsWith('verifactu-chains') ? [{ id: 7 }] : [] }))
    const w = mountCard({ verifactu: 'ok', face: 'missing' })
    await flushPromises()
    expect(tags(w)).toEqual(['Correcta', 'No enviada'])
    // only the sent one is looked up
    expect(get.mock.calls.map(c => c[0])).toEqual(['verifactu-chains?_where[emitted_invoice]=295&_limit=1'])
    const links = w.findAllComponents(RouterLinkStub)
    expect(links.map(l => l.props('to'))).toEqual([{ name: 'admin.verifactu-chain.edit', params: { id: 7 } }])
  })

  it('shows no register links to people who are not admins', async () => {
    localStorage.setItem('user', JSON.stringify({ permissions: [{ permission: 'projects' }] }))
    const w = mountCard({ verifactu: 'ok', face: 'delivered' })
    await flushPromises()
    expect(get).not.toHaveBeenCalled()
    expect(w.findAllComponents(RouterLinkStub)).toHaveLength(0)
  })
})
