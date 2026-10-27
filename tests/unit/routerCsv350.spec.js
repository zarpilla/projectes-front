// issues/350: the «Per al planificador de rutes (.csv)» export had no order id,
// so the planner's rows could not be matched back to the orders.
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'

afterEach(() => vi.restoreAllMocks())

async function routerCsv(rows) {
  let blob = null
  URL.createObjectURL = vi.fn(b => { blob = b; return 'blob:x' })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const vm = {
    ...OrdersTable.methods,
    phoneFormatted: v => v,
    rowsToExport: async () => rows
  }
  vm.csvFieldsRouter = OrdersTable.data.call(vm).csvFieldsRouter
  await OrdersTable.methods.downloadRouterCSV.call(vm)
  return (await blob.text()).replace(/^﻿/, '').split('\n').map(l => l.split(','))
}

describe('route planner CSV (issues/350)', () => {
  it('ends with an «ID COMANDA» column holding the order id', async () => {
    const [headers, line] = await routerCsv([
      { id: 25770, contact_trade_name: 'Formatgeria', fullName: 'Formatgeria La Cleda' }
    ])
    expect(headers[headers.length - 1]).toBe('ID COMANDA')
    expect(line[headers.indexOf('ID COMANDA')]).toBe('25770')
  })

  it('keeps the earlier columns in their place', async () => {
    const [headers] = await routerCsv([])
    expect(headers).toEqual([
      'NOM CLIENT', 'TELEFON', 'ADREÇA', 'DETALLS COMANDA', 'HORARIS CLIENT', 'CAIXES',
      'TOTAL KG', "DATA D'ENTREGA", 'SOCIA', 'MAIL', 'ID CLIENT', 'DETALLS REPARTIDORES',
      'ID COMANDA'
    ])
  })
})
