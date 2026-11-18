// issues/350: the «Per al planificador de rutes (.csv)» export had no order id,
// so the planner's rows could not be matched back to the orders; it got a last
// «ID COMANDA» column. issues/432: the Diligència wants it in «NOM CLIENT»
// instead, as «ID - Nom Comercial», and no separate id column.
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

describe('route planner CSV (issues/350, 432)', () => {
  it('prints «ID - Nom Comercial» in «NOM CLIENT»', async () => {
    const [headers, line] = await routerCsv([
      { id: 25770, contact_trade_name: 'Formatgeria', fullName: 'Formatgeria La Cleda' }
    ])
    expect(line[headers.indexOf('NOM CLIENT')]).toBe('25770 - Formatgeria')
  })

  it('prints the id alone when the point has no trade name', async () => {
    const [headers, line] = await routerCsv([{ id: 25771, contact_trade_name: null }])
    expect(line[headers.indexOf('NOM CLIENT')]).toBe('25771')
  })

  it('has no separate «ID COMANDA» column', async () => {
    const [headers] = await routerCsv([])
    expect(headers).toEqual([
      'NOM CLIENT', 'TELEFON', 'ADREÇA', 'DETALLS COMANDA', 'HORARIS CLIENT', 'CAIXES',
      'TOTAL KG', "DATA D'ENTREGA", 'SOCIA', 'MAIL', 'ID CLIENT', 'DETALLS REPARTIDORES'
    ])
  })
})
