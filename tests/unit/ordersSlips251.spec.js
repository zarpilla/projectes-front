// issues/251: small inconsistencies of the orders screens. The quick edit's
// Preu cell showed the rate's price while the column shows it discounted; the
// order form wrote «−99.9 %»; the CSV preview rows showed price «?» and no
// delivery point; the .ods export wrote refrigerated 1/0 but fragile
// true/false/"".
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn().mockResolvedValue({ data: [] }), put: vi.fn(), post: vi.fn() })
}))
import OrdersTable from '@/components/OrdersTable.vue'
import OrdersForm from '@/components/OrdersForm.vue'
import DownloadExcel from '@/components/DownloadExcel.vue'
import { orderOdsFields } from '@/domain/ordersExport'

const M = OrdersTable.methods

describe('quick edit price (issues/251)', () => {
  it('shows the rate price less the order discounts, like the column', () => {
    const vm = { calculatedPrice: 13.35, editingOrder: { id: 1, price: 12.32, contact_pickup_discount: 20, multidelivery_discount: 0, volume_discount: 0 } }
    expect(M.editedFinalPrice.call(vm)).toBe(10.68)
    expect(M.editedFinalPrice.call({ ...vm, calculatedPrice: null })).toBe(null)
  })
})

describe('discount percentages with a decimal comma (issues/251)', () => {
  it('order form', () => {
    expect(OrdersForm.methods.percent(99.9)).toBe('99,9')
    expect(OrdersForm.methods.percent(null)).toBe('0')
  })
  it('orders list dots', () => {
    const vm = { money: M.money }
    const dots = M.discountsOf.call(vm, { price: 10, finalPrice: 5, multidelivery_discount: 2.5, contact_pickup_discount: 47.5 })
    expect(dots.map(d => d.title)).toEqual(['Descompte multientrega (2,5 %)', 'Descompte recollida (47,5 %)'])
  })
})

describe('CSV preview rows (issues/251)', () => {
  const contact = { id: 10, name: 'Ateneu', trade_name: 'Ateneu La Torna', nif: 'B1', phone: '600', address: 'C/ Major 1', postcode: '08001', city: 'Barcelona', time_slot_1_ini: 9, time_slot_1_end: 13, sector: { id: 1 } }
  const RATE = { id: 42, routes: [{ id: 3 }], pickup: { id: 1 }, delivery_type: { id: 1 }, ratev2: true, less10: 4, more10: 10, from10to20: 12 }
  it('show the delivery point and the price before they are created', async () => {
    const me = { id: 114 }
    const c = {
      permissions: ['orders_admin'], users: [me], me,
      routes: [{ id: 3, name: 'DJ - BCN' }],
      pickups: [{ id: 1, name: 'Magatzem', pickup: false }],
      deliveryTypes: [{ id: 1, refrigerated: false }, { id: 2, refrigerated: true }],
      routeRates: [RATE], orders: [], csvErrors: [], nextDayLimitHour: 13,
      getContactsForImport: vi.fn().mockResolvedValue([contact]),
      removeAccents: M.removeAccents, withNotes: M.withNotes, checkTransferNeeded: M.checkTransferNeeded,
      createUUID: () => 'uuid', previewCSVDiscounts: vi.fn(), $buefy: { toast: { open: vi.fn() } }
    }
    await M.importCSV.call(c, [{ owner_id: '114', route_name: 'DJ - BCN', contact_trade_name: 'Ateneu La Torna', kilograms: '12', units: '2', refrigerated: '0', estimated_delivery_date: '20261022' }])
    expect(c.csvErrors).toEqual([])
    expect(c.orders[0].fullName).toBe('Ateneu La Torna')
    expect(c.orders[0].finalPrice).toBe(c.orders[0].price)
    expect(Number.isFinite(c.orders[0].finalPrice)).toBe(true)
  })
})

describe('.ods booleans (issues/251)', () => {
  it('refrigerated and fragile are both 1/0', () => {
    const csvFields = OrdersTable.data.call({ addressFormatted: M.addressFormatted }).csvFields
    const rows = [{ id: 1, refrigerated: true, fragile: false }, { id: 2, refrigerated: false, fragile: true }, { id: 3, refrigerated: null, fragile: null }, { id: 4, refrigerated: '0', fragile: '1' }]
    const cells = DownloadExcel.methods.getProcessedJson.call({ ...DownloadExcel.methods, defaultValue: '' }, rows, orderOdsFields(csvFields))
    expect(cells.map(c => [c.refrigerated, c.fragile])).toEqual([[1, 0], [0, 1], [0, 0], [0, 1]])
  })
})
