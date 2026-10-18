// issues/177: the figures above Comandes and its «Comandes (.ods)» export used
// only the loaded page (150 rows); the export also wrapped addresses in quotes,
// wrote `""` for an empty note and 0 as the pickup of a warehouse order.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'
import DownloadExcel from '@/components/DownloadExcel.vue'
import { orderOdsFields, exportRows } from '@/domain/ordersExport'

const csvFields = OrdersTable.data.call({ addressFormatted: OrdersTable.methods.addressFormatted }).csvFields

const row = {
  id: 7,
  contact_address: 'Carrer Major, 3',
  comments: null,
  pickup: { id: 4, name: 'Magatzem Sabadell', pickup: false }
}

describe('Comandes (.ods) cells (issues/177)', () => {
  it('plain address and notes, the pickup point id and name', () => {
    const fields = orderOdsFields(csvFields)
    const [cells] = DownloadExcel.methods.getProcessedJson.call(
      { ...DownloadExcel.methods, defaultValue: '' },
      [row],
      fields
    )
    expect(cells.contact_address).toBe('Carrer Major, 3')
    expect(cells.notes).toBe('')
    expect(cells.pickup).toBe(4)
    expect(cells.pickup_name).toBe('Magatzem Sabadell')
  })

  it('the import CSV template keeps its quotes', () => {
    expect(csvFields.contact_address.callback('Carrer Major, 3')).toBe('"Carrer Major, 3"')
  })
})

describe('rows to export (issues/177)', () => {
  beforeEach(() => get.mockReset())

  it('the selection, else the loaded rows when they are all, else every matching order', async () => {
    const fetchAll = vi.fn(async () => ['all'])
    expect(await exportRows({ checked: ['c'], rows: ['p'], morePages: true, fetchAll })).toEqual(['c'])
    expect(await exportRows({ checked: [], rows: ['p'], morePages: false, fetchAll })).toEqual(['p'])
    expect(await exportRows({ checked: [], rows: ['p'], morePages: true, fetchAll })).toEqual(['all'])
  })

  it('asks the table endpoint without a page, with the list filters', async () => {
    get.mockResolvedValue({ data: [{ id: 1, contact_address: 'a' }, { id: 2, contact_address: 'b' }] })
    const vm = {
      checkedRows: [],
      theOrders: [{ id: 1 }],
      morePages: true,
      sortField: 'id',
      sortOrder: 'desc',
      userFilter: '&_where[owner]=5',
      lastWhere: ['_where[status]=processed'],
      decorateOrder: o => ({ ...o, decorated: true })
    }
    const rows = await OrdersTable.methods.rowsToExport.call(vm)
    expect(get).toHaveBeenCalledWith('orders/table?_limit=-1&_sort=id:desc&_where[owner]=5&_where[status]=processed')
    expect(rows.map(r => [r.id, r.decorated])).toEqual([[1, true], [2, true]])
  })
})

describe('figures above the list (issues/177)', () => {
  beforeEach(() => get.mockReset())

  it('come from orders/totals with the list filters, over every matching order', async () => {
    const totals = { active: 175, cancelled: 0, units: 418, kg: 3934.58, price: 2061.07, refrigerated: 53, transfers: 69, pickups: 27, deposited: 9 }
    get.mockResolvedValue({ data: totals })
    const vm = { userFilter: '', totals: null }
    await OrdersTable.methods.loadTotals.call(vm, ['_where[status]=processed'])
    expect(get).toHaveBeenCalledWith('orders/totals?&_where[status]=processed')
    expect(OrdersTable.computed.kpis.call({ ...vm, pageKpis: { active: 150 } })).toEqual(totals)
  })

  it('a late answer to older filters is dropped', async () => {
    let first
    get.mockImplementationOnce(() => new Promise(resolve => { first = resolve }))
    get.mockResolvedValueOnce({ data: { active: 2 } })
    const vm = { userFilter: '', totals: null }
    const old = OrdersTable.methods.loadTotals.call(vm, ['a'])
    await OrdersTable.methods.loadTotals.call(vm, ['b'])
    first({ data: { active: 1 } })
    await old
    expect(vm.totals).toEqual({ active: 2 })
  })

  it('the loaded rows until the answer comes', () => {
    expect(OrdersTable.computed.kpis.call({ totals: null, pageKpis: { active: 150 } })).toEqual({ active: 150 })
  })
})
