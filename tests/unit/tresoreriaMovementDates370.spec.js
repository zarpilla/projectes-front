// issues/370 (2026-10-30): «Edita dates» at Tresoreria › Moviments bancaris.
// Only the pending movements (the forecast gives them `date_edit`) get a date
// field; paid ones keep their date as text. «Desa» sends the changed dates
// only, then reloads the forecast.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn(async () => ({ data: { updated: 1, lines: 2 } })) }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'
import { dateEditKey, isoOfDatef, movementDateChanges } from '@/domain/treasuryMovementDates.js'
vi.spyOn(TresoreriaTable.methods, 'getInitialData').mockResolvedValue(undefined)

const rows = () => [
  { type: 'Despesa esperada', concept: 'Lloguer', datef: '20261115', total_amount: -100, subtotal: 0, date_edit: 'phase-expense', date_edit_id: 7 },
  { type: 'Factura emesa', concept: 'F-10', datef: '20261120', total_amount: 200, subtotal: 0, date_edit: 'emitted-invoices', date_edit_id: 10 },
  { type: 'Factura cobrada', concept: 'F-11', datef: '20261001', total_amount: 300, subtotal: 0, date_edit: null, date_edit_id: 11, paid: true }
]

describe('movement dates (domain)', () => {
  it('keys only editable movements', () => {
    const [a, b, c] = rows()
    expect([dateEditKey(a), dateEditKey(b), dateEditKey(c)]).toEqual(['phase-expense:7', 'emitted-invoices:10', null])
    expect(isoOfDatef('20261115')).toBe('2026-11-15')
    expect(isoOfDatef('Invalid date')).toBe('')
  })

  it('sends only the dates that changed, of editable movements', () => {
    const changes = movementDateChanges(
      { 'phase-expense:7': '2026-12-01', 'emitted-invoices:10': '2026-11-20', 'received-invoices:99': '2026-12-01' },
      rows()
    )
    expect(changes).toEqual([{ kind: 'phase-expense', id: 7, date: '2026-12-01' }])
  })
})

describe('Tresoreria «Edita dates» (issues/370)', () => {
  beforeEach(() => api.post.mockClear())

  async function mountTable () {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div/>' } },
        { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }
      ]
    })
    await router.push('/?year=2026')
    const w = mount(TresoreriaTable, {
      global: {
        plugins: [createPinia(), Buefy, router],
        stubs: { TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
        config: { warnHandler: () => {} }
      },
      attachTo: document.body
    })
    await w.setData({ selectedYear: 2026, treasuryData: rows(), movementsAll: true })
    await flushPromises()
    return w
  }

  it('shows date fields only for pending movements, and saves the changed ones', async () => {
    const w = await mountTable()
    expect(w.findAll('input.movement-date')).toHaveLength(0)
    await w.find('.dates-edit').trigger('click')
    const inputs = w.findAll('input.movement-date')
    expect(inputs.map(i => i.element.value).sort()).toEqual(['2026-11-15', '2026-11-20'])

    const lloguer = inputs.find(i => i.element.value === '2026-11-15')
    lloguer.element.value = '2026-12-01'
    await lloguer.trigger('change')
    expect(w.vm.pendingDateChanges).toEqual([{ kind: 'phase-expense', id: 7, date: '2026-12-01' }])
    expect(w.find('.dates-save').text()).toContain('(1)')

    const getData = vi.spyOn(w.vm, 'getData').mockResolvedValue(undefined)
    await w.vm.saveDates()
    expect(api.post).toHaveBeenCalledWith('treasuries/movement-dates', {
      changes: [{ kind: 'phase-expense', id: 7, date: '2026-12-01' }]
    })
    expect(getData).toHaveBeenCalled()
    expect(w.vm.dateEditMode).toBe(false)
    w.unmount()
  })
})
