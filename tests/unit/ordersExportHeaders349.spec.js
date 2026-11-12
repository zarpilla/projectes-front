// issues/349: «Comandes (.ods)» and «Exporta selecció» had the field names as
// column headers (contact_trade_name, route_name, owner_id…). The Diligència
// wants the names it uses. The import and «Exemple CSV de comandes» keep the
// field names: they are what the CSV files people import carry.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'
import DownloadExcel from '@/components/DownloadExcel.vue'
import { ORDER_EXPORT_HEADERS } from '@/domain/ordersExport'

const data = OrdersTable.data.call({ addressFormatted: OrdersTable.methods.addressFormatted })
const exportFields = OrdersTable.computed.exportFields.call(data)

describe('order export headers (issues/349)', () => {
  it('every column has a Catalan name, no field name is left', () => {
    const headers = Object.keys(exportFields)
    expect(headers.length).toBeGreaterThan(30)
    for (const header of headers) {
      expect(Object.values(ORDER_EXPORT_HEADERS)).toContain(header)
      expect(header).not.toMatch(/_/)
    }
  })

  it('names the columns the Diligència looks for', () => {
    expect(Object.keys(exportFields)).toEqual(expect.arrayContaining([
      'ID comanda', 'Sòcia', 'Ruta', 'Nom comercial', 'Raó social', 'Adreça', 'Població', 'Caixes', 'Kg', 'Preu final'
    ]))
  })

  it('still fills the cells from the same fields', () => {
    const [cells] = DownloadExcel.methods.getProcessedJson.call(
      { ...DownloadExcel.methods, defaultValue: '' },
      [{
        id: 25770, route_name: 'R3', contact_trade_name: 'Formatgeria', contact_name: 'La Cleda SCCL',
        contact_address: 'Carrer Major, 3', owner: { username: 'productora' }, comments: 'Porta del darrere',
        finalPrice: 12.5, pickup: { id: 4, name: 'Magatzem', pickup: false }
      }],
      exportFields
    )
    expect(cells['ID comanda']).toBe(25770)
    expect(cells.Ruta).toBe('R3')
    expect(cells['Nom comercial']).toBe('Formatgeria')
    expect(cells['Raó social']).toBe('La Cleda SCCL')
    expect(cells['Adreça']).toBe('Carrer Major, 3')
    expect(cells['Sòcia']).toBe('productora')
    expect(cells.Notes).toBe('Porta del darrere')
    expect(cells['Punt de recollida']).toBe('Magatzem')
    expect(cells['Preu final']).toBe(12.5)
  })

  it('the import CSV template keeps the field names', () => {
    expect(Object.keys(data.csvFields)).toEqual(expect.arrayContaining(['owner_id', 'route_name', 'contact_trade_name', 'notes']))
  })
})
