// issues/415: users asked that ticking the validation check of a pending
// invoice or expense in Tresoreria also marks the document collected or paid
// on the date the line shows. Before, pending lines (the rest of a partly paid
// document) had no check, and on an unpaid one it only stored a validation.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'
import { canValidate, validationAction, settleDate } from '@/domain/treasuryValidation.js'
vi.spyOn(TresoreriaTable.methods, 'getInitialData').mockResolvedValue(undefined)

const row = (over) => ({
  id: 1,
  datef: '20261020',
  datex: '20-10-2026',
  type: 'Factura emesa',
  concept: 'F-10',
  total_amount: 121,
  subtotal: 121,
  real: true,
  paid: false,
  validation_key: 'emitted-invoices:10',
  is_validated: false,
  settle: { kind: 'emitted-invoices', id: 10 },
  ...over
})

describe('which check a Tresoreria line has (issues/415)', () => {
  it('pending documents settle; executed lines and validated ones toggle', () => {
    expect(canValidate(row({}))).toBe(true)
    expect(validationAction(row({}))).toBe('settle')
    // the rest of a partly paid document: no key, only `settle`
    expect(canValidate(row({ validation_key: null }))).toBe(true)
    // validated before the change without being paid: unticking only unvalidates
    expect(validationAction(row({ is_validated: true }))).toBe('toggle')
    expect(validationAction(row({ settle: null, paid: true }))).toBe('toggle')
    // a project forecast has nothing to mark
    expect(canValidate({ type: 'Ingrés esperat', paid: false, validation_key: null })).toBe(false)
  })

  it("settles on the line's date, or asks when it is still to come", () => {
    expect(settleDate(row({}), '2026-11-06')).toBe('2026-10-20')
    expect(settleDate(row({ datef: '20261106' }), '2026-11-06')).toBe('2026-11-06')
    expect(settleDate(row({ datef: '20261201' }), '2026-11-06')).toBe(null)
  })
})

describe('TresoreriaTable settles a pending document (issues/415)', () => {
  beforeEach(() => {
    api.post.mockReset()
  })

  async function mountWith (rows) {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }, { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }] })
    await router.push('/')
    const w = mount(TresoreriaTable, {
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

  it("marks it collected on the line's date and reloads", async () => {
    api.post.mockResolvedValue({ data: { validation_key: 'emitted-invoices:10', paid: true } })
    const w = await mountWith([row({})])
    await w.vm.toggleValidation(w.vm.treasuryData[0])
    expect(api.post).toHaveBeenCalledWith('treasury-validations/settle', { entity_type: 'emitted-invoices', entity_id: 10, date: '2026-10-20' })
    expect(w.vm.getData).toHaveBeenCalled()
  })

  it('asks the date of a future line, and does nothing when cancelled', async () => {
    const w = await mountWith([row({ datef: '29991231' })])
    w.vm.askSettleDate = vi.fn(async () => null)
    await w.vm.toggleValidation(w.vm.treasuryData[0])
    expect(api.post).not.toHaveBeenCalled()
    w.vm.askSettleDate = vi.fn(async () => '2026-11-02')
    api.post.mockResolvedValue({ data: {} })
    await w.vm.toggleValidation(w.vm.treasuryData[0])
    expect(api.post).toHaveBeenCalledWith('treasury-validations/settle', expect.objectContaining({ date: '2026-11-02' }))
  })

  it('reloads after unticking a line the check had marked paid', async () => {
    api.post.mockResolvedValue({ data: { validated: false, reverted: true } })
    const w = await mountWith([row({ settle: null, paid: true, is_validated: true })])
    await w.vm.toggleValidation(w.vm.treasuryData[0])
    expect(api.post).toHaveBeenCalledWith('treasury-validations/toggle', { entity_type: 'emitted-invoices', entity_id: 10, sub_type: null })
    expect(w.vm.getData).toHaveBeenCalled()
  })
})
