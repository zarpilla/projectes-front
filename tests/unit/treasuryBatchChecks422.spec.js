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
    expect(button.text()).toContain('Valida accions (2)')
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
    expect(document.body.textContent).toContain('sense prémer «Valida accions»')
    w.unmount()
  })
})

// issues/456: «Valida accions», light green / light red pending checks,
// «[document] validat» notifications, and two independent filters:
// Assignats / Esperats and Validats / No validats
import { changeMessage, validationFilterMatch } from '@/domain/treasuryPendingChecks.js'
import { canValidate } from '@/domain/treasuryValidation.js'

describe('issues/456', () => {
  it('each saved movement says «[document] validat»', () => {
    const settle = tickCheck({}, invoice(), TODAY)['emitted-invoices:10']
    expect(changeMessage(settle, 2, 5)).toBe('F-10 validat · 2 de 5')
    expect(changeMessage(settle, 1, 1)).toBe('F-10 validat')
    const off = tickCheck({}, expense({ is_validated: true }), TODAY)['received-invoices:7']
    expect(changeMessage(off, 1, 1)).toBe('R-7 validació treta')
    expect(changeMessage(settle, 1, 2, 'és un esborrany')).toBe('F-10: és un esborrany · 1 de 2')
  })

  it('two independent filters: Assignats/Esperats and Validats/No validats', () => {
    const expected = (r) => !(r.paid || r.real)
    const rows = {
      validated: expense({ is_validated: true }),
      unvalidated: expense(),
      pendingDoc: invoice(),
      planned: { datef: '20261001', type: 'Despesa esperada', concept: 'Previst', total_amount: -10, paid: false, real: false, settle: null },
      future: { datef: '20261201', type: 'Ingrés esperat', concept: 'Futur', total_amount: 10, paid: false, real: false, settle: null }
    }
    const shown = (chosen) => Object.keys(rows).filter(k => validationFilterMatch(rows[k], chosen, expected, canValidate))
    expect(shown([])).toEqual(Object.keys(rows))
    // document group: past and future planned lines are «Esperats»
    expect(shown(['expected'])).toEqual(['planned', 'future'])
    expect(shown(['assigned'])).toEqual(['validated', 'unvalidated', 'pendingDoc'])
    expect(shown(['assigned', 'expected'])).toEqual(Object.keys(rows))
    // validation group
    expect(shown(['validated'])).toEqual(['validated'])
    expect(shown(['unvalidated'])).toEqual(['unvalidated', 'pendingDoc'])
    expect(shown(['validated', 'unvalidated'])).toEqual(['validated', 'unvalidated', 'pendingDoc'])
    // the groups narrow each other
    expect(shown(['assigned', 'unvalidated'])).toEqual(['unvalidated', 'pendingDoc'])
    expect(shown(['expected', 'validated'])).toEqual([])
  })

  async function mountRows (rows) {
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

  it('a ticked line is light green, an unticked validated one light red', async () => {
    const w = await mountRows([expense(), expense({ validation_key: 'received-invoices:8', concept: 'R-8', is_validated: true })])
    await w.vm.toggleValidation(w.vm.treasuryData[0])
    await w.vm.toggleValidation(w.vm.treasuryData[1])
    expect(w.vm.pendingCheckClass(w.vm.treasuryData[0])).toContain('is-pending-on')
    expect(w.vm.pendingCheckClass(w.vm.treasuryData[1])).toContain('is-pending-off')
    await flushPromises()
    expect(w.findAll('.is-pending-on').length).toBe(1)
    expect(w.findAll('.is-pending-off').length).toBe(1)
    w.unmount()
  })

  it('the filter buttons narrow the movements list', async () => {
    const w = await mountRows([expense(), expense({ validation_key: 'received-invoices:8', concept: 'R-8', is_validated: true }),
      { datef: '20261001', type: 'Despesa esperada', concept: 'Previst', total_amount: -10, paid: false, real: false }])
    expect(w.findAll('.document-filters button').map(b => b.text())).toEqual(['Assignats · 2', 'Esperats · 1'])
    const check = w.findAll('.check-filters button')
    expect(check.map(b => b.text())).toEqual(['Validats · 1', 'No validats · 1'])
    await check[0].trigger('click')
    expect(w.vm.movementsShown.map(r => r.concept)).toEqual(['R-8'])
    await check[1].trigger('click')
    expect(w.vm.movementsShown).toHaveLength(2)
    // plus «Esperats» in the other group: nothing is both
    await w.findAll('.document-filters button')[1].trigger('click')
    expect(w.vm.movementsShown).toHaveLength(0)
    w.unmount()
  })
})
