// issues/422: in Tresoreria each click on the «Accions» check saved at once
// (and a pending document reloaded the whole forecast), so marking several
// lines was very slow. Now the clicks are kept on the page and «Valida
// cobraments/pagaments» sends them together, with progress at the bottom
// right; leaving with clicks not sent asks first.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'
import { checkKey, checkShown, tickCheck, prunePending, needsSettleDate, runPendingChecks } from '@/domain/treasuryPendingChecks.js'
vi.spyOn(TresoreriaTable.methods, 'getInitialData').mockResolvedValue(undefined)

const TODAY = '2026-11-09'
const invoice = (over) => ({
  datef: '20261020',
  type: 'Factura emesa',
  concept: 'F-10',
  total_amount: 121,
  real: true,
  paid: false,
  validation_key: 'emitted-invoices:10',
  is_validated: false,
  settle: { kind: 'emitted-invoices', id: 10 },
  ...over
})
const expense = (over) => ({
  datef: '20261021',
  type: 'Factura rebuda',
  concept: 'R-7',
  total_amount: -50,
  real: true,
  paid: true,
  validation_key: 'received-invoices:7',
  is_validated: false,
  settle: null,
  ...over
})
const payrolls = (over) => ({
  datef: '20261030',
  type: 'Nòmina',
  concept: 'Nòmines octubre',
  total_amount: -3000,
  paid: true,
  validation_key: 'payrolls:1',
  validation_keys: ['payrolls:1', 'payrolls:2'],
  is_validated: false,
  ...over
})

describe('the clicks kept on the page', () => {
  it('a click marks the line; a second one puts it back as it loaded', () => {
    let p = tickCheck({}, invoice(), TODAY)
    expect(checkShown(p, invoice())).toBe(true)
    expect(p['emitted-invoices:10']).toMatchObject({ op: 'settle', checked: true, date: '2026-10-20' })
    p = tickCheck(p, invoice(), TODAY)
    expect(p).toEqual({})
  })

  it('unticking a validated line, and a line of several payrolls', () => {
    const p = tickCheck(tickCheck({}, expense({ is_validated: true }), TODAY), payrolls(), TODAY)
    expect(p['received-invoices:7']).toMatchObject({ op: 'set', checked: false })
    expect(p[checkKey(payrolls())]).toMatchObject({ op: 'keys', checked: true, keys: ['payrolls:1', 'payrolls:2'] })
  })

  it('a future pending line needs the day it was paid, once', () => {
    const future = invoice({ datef: '20261201' })
    expect(needsSettleDate({}, future, TODAY)).toBe(true)
    const p = tickCheck({}, future, TODAY, '2026-11-05')
    expect(p['emitted-invoices:10'].date).toBe('2026-11-05')
    // unticking it again asks nothing
    expect(needsSettleDate(p, future, TODAY)).toBe(false)
  })

  it('after a reload, what the lines already show is dropped', () => {
    const p = tickCheck(tickCheck({}, invoice(), TODAY), expense(), TODAY)
    const next = prunePending(p, [invoice({ is_validated: true }), expense()])
    expect(Object.keys(next)).toEqual(['received-invoices:7'])
  })
})

describe('sending them', () => {
  beforeEach(() => api.post.mockReset())

  it('one after the other, with the state sent explicitly; a failure does not stop the rest', async () => {
    api.post.mockImplementation(async (url) => {
      if (url === 'treasury-validations/settle') throw { response: { data: { error: { message: 'és un esborrany' } } } }
      return { data: { validated: true } }
    })
    let p = tickCheck({}, invoice(), TODAY)
    p = tickCheck(p, expense(), TODAY)
    p = tickCheck(p, payrolls(), TODAY)
    const progress = vi.fn()
    const { done, failed } = await runPendingChecks(Object.values(p), progress)
    expect(done).toEqual(['received-invoices:7', 'payrolls:1|payrolls:2'])
    expect(failed).toEqual([{ key: 'emitted-invoices:10', concept: 'F-10', message: 'és un esborrany' }])
    expect(progress).toHaveBeenCalledTimes(3)
    expect(api.post).toHaveBeenCalledWith('treasury-validations/toggle', { entity_type: 'received-invoices', entity_id: 7, sub_type: null, validated: true })
    expect(api.post).toHaveBeenCalledWith('treasury-validations/toggle', { entity_type: 'payrolls', entity_id: 2, sub_type: null, validated: true })
  })
})

describe('TresoreriaTable (issues/422)', () => {
  beforeEach(() => api.post.mockReset())

  async function mountWith (rows) {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }, { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }] })
    await router.push('/')
    const w = mount(TresoreriaTable, {
      attachTo: document.body,
      global: {
        plugins: [createPinia(), Buefy, router],
        stubs: { TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
        config: { warnHandler: () => {} }
      }
    })
    w.vm.getData = vi.fn(async () => {})
    await w.setData({ selectedYear: 2026, treasuryData: rows })
    await flushPromises()
    return w
  }

  it('clicking saves nothing; the button sends every click and reloads once', async () => {
    api.post.mockResolvedValue({ data: { validated: true, paid: true } })
    const w = await mountWith([invoice(), expense()])
    await w.vm.toggleValidation(w.vm.treasuryData[0])
    await w.vm.toggleValidation(w.vm.treasuryData[1])
    expect(api.post).not.toHaveBeenCalled()
    await flushPromises()
    const button = w.find('.checks-validate')
    expect(button.text()).toContain('Valida cobraments/pagaments (2)')
    await w.vm.validateChecks()
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(w.vm.getData).toHaveBeenCalledTimes(1)
    expect(w.vm.pendingCheckList).toHaveLength(0)
    w.unmount()
  })

  it('leaving with clicks not sent asks first; the browser tab too', async () => {
    const w = await mountWith([expense()])
    const leave = vi.fn()
    w.vm.confirmLeaveChecks(leave)
    expect(leave).toHaveBeenCalledWith(true)
    leave.mockReset()

    await w.vm.toggleValidation(w.vm.treasuryData[0])
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)

    w.vm.confirmLeaveChecks(leave)
    await flushPromises()
    expect(leave).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('sense prémer «Valida cobraments/pagaments»')
    w.unmount()
  })
})
