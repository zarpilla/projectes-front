// issues/298 (review 9): the CSV import preview showed the route rate's price
// as the price with discounts and missed the multidelivery discount the save
// applies (20,15 € shown, 16,12 € saved). The preview now asks
// check-multidelivery with the other rows still to be saved, and prices the
// row with invoicedPrice, the invoice line's formula.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { csvDiscountQuery, withCsvDiscounts, csvOrderPayload } from '@/domain/csvOrderPreview'

const post = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ post, get: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'

const row = (extra = {}) => ({
  id: 0,
  status: 'CSV',
  price: 20.15,
  estimated_delivery_date: '2026-10-21',
  contact: { id: 9 },
  owner: { id: 5 },
  route: { id: 3 },
  ...extra
})

describe('CSV import preview prices (issues/298)', () => {
  it('counts the other unsaved rows of the point and of the route', () => {
    const a = row()
    const b = row({ contact: { id: 10 } })
    const c = row()
    const saved = row({ id: 77, status: 'pending' })
    const otherDay = row({ estimated_delivery_date: '2026-10-22' })
    const query = csvDiscountQuery(a, [a, b, c, saved, otherDay])
    expect(query).toEqual({
      date: '2026-10-21', contactId: 9, ownerId: 5, routeId: 3, status: 'pending',
      pendingSameContact: 1, pendingSameRoute: 2
    })
  })

  it('prices the row with the discounts the save stores', () => {
    const priced = withCsvDiscounts(row(), { multidelivery_discount: 20 })
    expect(priced.finalPrice).toBe(16.12)
    expect(withCsvDiscounts(row(), { multidelivery_discount: 0, volume_discount: 2 }).finalPrice).toBe(18.15)
  })

  it('leaves the discounts to the server on save', () => {
    const payload = csvOrderPayload(withCsvDiscounts(row(), { multidelivery_discount: 20 }))
    expect(payload).not.toHaveProperty('multidelivery_discount')
    expect(payload).not.toHaveProperty('finalPrice')
    expect(payload.price).toBe(20.15)
  })

  describe('in the orders list', () => {
    beforeEach(() => post.mockReset())

    it('shows the discounted price of two rows to the same point', async () => {
      post.mockImplementation(async (url, body = {}) => ({ data: { multidelivery_discount: body.pendingSameContact > 0 ? 20 : 0, volume_discount: 0 } }))
      const a = row({ _uuid: 'a' })
      const b = row({ _uuid: 'b' })
      const vm = { orders: [a, b, row({ id: 5, status: 'pending', finalPrice: 9 })] }
      await OrdersTable.methods.previewCSVDiscounts.call(vm)
      expect(post).toHaveBeenCalledTimes(2)
      expect(vm.orders.map(o => o.finalPrice)).toEqual([16.12, 16.12, 9])
    })
  })
})
