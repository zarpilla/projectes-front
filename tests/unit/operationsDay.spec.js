// issues/298 (review 9): in Operacions, after «Carregat» on #24897 and setting
// it «Lliurada», the day showed «0 operacions» instead of «1 de 1 fetes» (only
// pending and processed orders were asked), so the driver lost the progress
// and the «Desfés»; the incidence always started with «Comanda no dipositada»,
// farm pickups (-R) too; «Carrega-les totes» said nothing when a save failed.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const put = vi.fn()
const get = vi.fn(async () => ({ data: { id: 9 } }))
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn() }) }))
import OrderOperationsTable from '@/components/OrderOperationsTable.vue'
import { operationStatuses, isOperationDone, incidencePrefill, operationsQueries } from '@/domain/orderOperations'

describe('Operacions day (issues/298)', () => {
  it('asks the delivered orders of the day too', () => {
    expect(operationStatuses('2026-10-20')).toContain('delivered')
    const [direct] = operationsQueries({ routeIds: [1], statuses: operationStatuses('2026-10-20'), date: '2026-10-20' })
    expect(Object.values(direct)).toContain('delivered')
    // every day at once: only the open ones
    expect(operationStatuses(null)).toEqual(['pending', 'processed'])
  })

  it('counts a loaded or delivered order as done', () => {
    expect(isOperationDone({ operationType: 'direct', status: 'delivered', pickup_date: '2026-10-20T08:00:00Z' })).toBe(true)
    expect(isOperationDone({ operationType: 'direct', status: 'delivered' })).toBe(true)
    expect(isOperationDone({ operationType: 'direct', status: 'processed' })).toBe(false)
    expect(isOperationDone({ operationType: 'transfer', status: 'delivered' })).toBe(false)
    expect(isOperationDone({ operationType: 'transfer', transfer_end_date: '2026-10-20T08:00:00Z' })).toBe(true)
  })

  it('starts the incidence after the kind of order', () => {
    expect(incidencePrefill({ is_collection_order: true })).toBe('Comanda no preparada per a la recollida')
    expect(incidencePrefill({ is_collection_order: false })).toBe('Comanda no dipositada')
    expect(incidencePrefill({ is_collection_order: false, deposit_date: '2026-10-20T08:00:00Z' })).toBe('')
  })
})

describe('«Carrega-les totes» (issues/298)', () => {
  beforeEach(() => put.mockReset())

  it('tells how far it got when a save fails', async () => {
    put.mockResolvedValueOnce({}).mockRejectedValueOnce({ response: { data: { error: { message: 'La comanda 2 està anul·lada' } } } })
    let confirm
    const toast = vi.fn()
    const vm = {
      isLoading: false,
      loadData: vi.fn(),
      $buefy: { dialog: { confirm: opts => { confirm = opts.onConfirm } }, toast: { open: toast } }
    }
    OrderOperationsTable.methods.loadAll.call(vm, { origin: 'Artés', items: [{ id: 1 }, { id: 2 }, { id: 3 }] })
    await confirm()
    await flushPromises()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'is-danger',
      message: expect.stringContaining('1 de 3 desades (La comanda 2 està anul·lada)')
    }))
    expect(vm.loadData).toHaveBeenCalled()
    expect(vm.isLoading).toBe(false)
  })
})
