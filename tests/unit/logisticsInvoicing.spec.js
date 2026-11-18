// "Facturar": orders grouped by member and month
import { describe, it, expect } from 'vitest'
import { invoicedPrice, groupOrders } from '@/domain/logisticsInvoicing.js'

describe('logisticsInvoicing', () => {
  // the quarter's project: the API's rule (projectes-v5 quarter-project.js, issues/430)

  it('prices and groups the orders as the invoice does', () => {
    // issues/145: (12 − 2) × (1 − (20 + 50) / 100); it compounded the percentages (4)
    expect(invoicedPrice({ price: 12, volume_discount: 2, multidelivery_discount: 20, contact_pickup_discount: 50 })).toBeCloseTo(3)
    const owner = { id: 7, fullname: 'Mas Alba' }
    const groups = groupOrders([
      { id: 1, owner, estimated_delivery_date: '2026-10-02', price: 10, units: 2, kilograms: 20, multidelivery_discount: 20 },
      { id: 2, owner, estimated_delivery_date: '2026-10-09', price: 5, units: 1, kilograms: 5 },
      { id: 3, owner, estimated_delivery_date: '2026-09-30', price: 3, units: 1, kilograms: 3 },
      { id: 4, owner: null, estimated_delivery_date: '2026-10-01', price: 9 }
    ])
    expect(groups.map(g => [g.month, g.orders, g.count, g.units, g.kg, +g.amount.toFixed(2), +g.discounts.toFixed(2)])).toEqual([
      ['2026-10', [1, 2], 2, 3, 25, 13, -2],
      ['2026-09', [3], 1, 1, 3, 3, 0]
    ])
  })

  // issues/145: the order form, Facturar and the report showed
  // (price − vol) × (1 − md) × (1 − cp) = 7,70 € while the invoice charges
  // (price − vol) × (1 − (md + cp)) = 7,65 €, rounded to cents per line
  it('prices an order as its invoice line, rounded to cents (issues/145)', () => {
    expect(invoicedPrice({ price: 10, volume_discount: 1, multidelivery_discount: 10, contact_pickup_discount: 5 })).toBe(7.65)
    expect(invoicedPrice({ price: 7.33, multidelivery_discount: 15 })).toBe(6.23)
    expect(invoicedPrice({ price: '8.50', volume_discount: '0.50' })).toBe(8)
    expect(invoicedPrice({})).toBe(0)
    // Facturar adds up the rounded amounts, as the invoice adds up its lines
    const owner = { id: 7 }
    const orders = [1, 2, 3].map(id => ({ id, owner, estimated_delivery_date: '2026-10-02', price: 7.33, multidelivery_discount: 15 }))
    expect(groupOrders(orders)[0].amount).toBeCloseTo(18.69, 10)
  })
})
