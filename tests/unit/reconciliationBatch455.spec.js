// issues/455: in Tresoreria › Conciliació each «Accepta» reconciled the movement
// at once and reloaded the whole list, so going through an extract was slow.
// Now «Accepta» leaves it pending validation and «Valida», next to «Puja un
// extracte», reconciles them all, one after the other, with «[document]
// conciliat» after each one and one reload at the end.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const movements = [
  { id: 1, date: '2026-11-02', amount: 121, concept: 'TRANSF CLIENT A', status: 'pending',
    suggestions: [{ kind: 'exact', auto: false, lines: [{ id: 'emitted-invoices:10', code: 'F-10', amount: 121, pending: true }] }] },
  { id: 2, date: '2026-11-03', amount: -50, concept: 'REBUT PROVEIDORA', status: 'pending',
    suggestions: [{ kind: 'exact', auto: false, lines: [{ id: 'received-invoices:7', code: 'R-7', amount: -50 }] }] },
  { id: 3, date: '2026-11-04', amount: 121, concept: 'TRANSF CLIENT A BIS', status: 'pending',
    suggestions: [{ kind: 'exact', auto: false, lines: [{ id: 'emitted-invoices:10', code: 'F-10', amount: 121, pending: true }] }] }
]
const api = {
  get: vi.fn((url) => Promise.resolve({ data: /reconciliation/.test(url) ? { movements } : [] })),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}
vi.mock('@/service/index', () => ({ default: () => api }))

import BankReconciliation from '@/components/BankReconciliation.vue'
import { queueAccept, pruneQueue, runQueue, queueMessage } from '@/domain/reconciliationQueue.js'

describe('the queue', () => {
  it('accepting queues the suggestion; a line already queued for another movement is refused', () => {
    const { queue } = queueAccept({}, movements[0], movements[0].suggestions[0])
    expect(queue[1]).toEqual({ id: 1, lines: [{ id: 'emitted-invoices:10' }], label: 'F-10', amount: 121 })
    expect(queueAccept(queue, movements[2], movements[2].suggestions[0]).error).toContain('F-10 ja és a un altre moviment')
  })

  it('a partial suggestion sends the movement amount', () => {
    const s = { kind: 'partial', lines: [{ id: 'emitted-invoices:11', code: 'F-11', amount: 500, pending: true }] }
    const { queue } = queueAccept({}, { id: 9, amount: 200 }, s)
    expect(queue[9].lines).toEqual([{ id: 'emitted-invoices:11', amount: 200 }])
  })

  it('after a reload, a movement no longer pending leaves the queue', () => {
    const { queue } = queueAccept({}, movements[0], movements[0].suggestions[0])
    expect(pruneQueue(queue, [{ ...movements[0], status: 'matched' }], 'pending')).toEqual({})
    expect(pruneQueue(queue, movements, 'pending')).toEqual(queue)
  })

  it('sends one after the other; a failure does not stop the rest', async () => {
    const accept = vi.fn(async (id) => { if (id === 1) throw { response: { data: { error: { message: 'Ja conciliada' } } } } })
    const progress = vi.fn()
    const r = await runQueue([{ id: 1, lines: [], label: 'F-10' }, { id: 2, lines: [], label: 'R-7' }], accept, progress)
    expect(r).toEqual({ done: [2], failed: [{ id: 1, label: 'F-10', message: 'Ja conciliada' }] })
    expect(progress).toHaveBeenCalledTimes(2)
    expect(queueMessage({ label: 'R-7' }, 2, 2)).toBe('R-7 conciliat · 2 de 2')
    expect(queueMessage({ label: 'R-7' }, 1, 1)).toBe('R-7 conciliat')
  })
})

describe('BankReconciliation (issues/455)', () => {
  beforeEach(() => { api.post.mockReset(); api.get.mockClear() })

  async function mountIt () {
    const w = mount(BankReconciliation, { attachTo: document.body, global: { plugins: [Buefy], stubs: { 'router-link': true } } })
    await flushPromises()
    return w
  }

  it('«Accepta» saves nothing; «Valida», right of the upload, reconciles them all and reloads once', async () => {
    api.post.mockResolvedValue({ data: { ok: true } })
    const w = await mountIt()
    const actions = w.find('.recon-actions')
    const labels = actions.findAll('.button').map(b => b.text())
    expect(labels.indexOf('Valida')).toBe(labels.indexOf('Puja un extracte') + 1)

    const accept = () => w.findAll('.recon-table tbody tr').map(tr => tr.findAll('button').find(b => b.text() === 'Accepta')).filter(Boolean)
    await accept()[0].trigger('click')
    await accept()[0].trigger('click')
    expect(api.post).not.toHaveBeenCalled()
    expect(w.findAll('.recon-queued')).toHaveLength(2)
    expect(w.find('.recon-validate').text()).toBe('Valida (2)')

    const loads = api.get.mock.calls.filter(([u]) => /reconciliation/.test(u)).length
    const snack = vi.spyOn(w.vm.$buefy.snackbar, 'open')
    await w.vm.validateQueue()
    await flushPromises()
    expect(api.post.mock.calls.map(c => c[0])).toEqual(['bank-movements/1/accept', 'bank-movements/2/accept'])
    expect(api.post).toHaveBeenCalledWith('bank-movements/1/accept', { lines: [{ id: 'emitted-invoices:10' }] })
    expect(snack.mock.calls.map(c => c[0].message)).toContain('F-10 conciliat · 1 de 2')
    expect(snack.mock.calls.map(c => c[0].message)).toContain('R-7 conciliat · 2 de 2')
    expect(api.get.mock.calls.filter(([u]) => /reconciliation/.test(u)).length).toBe(loads + 1)
    expect(w.vm.queueList).toHaveLength(0)
    w.unmount()
  })

  it('«Treu» takes it out again; leaving with accepted ones asks first, the browser tab too', async () => {
    const w = await mountIt()
    w.vm.acceptSuggestion(movements[1], movements[1].suggestions[0])
    await flushPromises()
    await w.find('.recon-unqueue').trigger('click')
    expect(w.vm.queueList).toHaveLength(0)

    w.vm.acceptSuggestion(movements[1], movements[1].suggestions[0])
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    const leave = vi.fn()
    w.vm.confirmLeaveQueue(leave)
    await flushPromises()
    expect(leave).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('sense prémer «Valida»')
    w.unmount()
  })
})
