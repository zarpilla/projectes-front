// issues/227 (redesign review 5, 2026-10-19): order price edge cases.
// - The quick edit and the CSV import priced with calculateRoutePrice(rate, kg, 0),
//   without the consumption-point lines the form and the server count.
// - The form showed «Preu amb descompte 11,56 €» and the saved order 9,56 €:
//   the lifecycle's volume discount wasn't previewed. check-multidelivery
//   returns it now, from the server's own function.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const put = vi.fn()
const get = vi.fn()
const post = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post }) }))
import OrdersTable from '@/components/OrdersTable.vue'
import OrdersForm from '@/components/OrdersForm.vue'
import { orderRoutePrice, calculateRoutePrice } from '@/service/assignRouteRate'

const GIRONA = { id: 1, pickup: false }
const RATE = { id: 42, routes: [{ id: 17 }], pickup: null, delivery_type: { id: 2 }, ratev2: true, less10: 4, more10: 10, from10to20: 12, pickup_point: 1.5 }
const LINES = [{ kilograms: 6 }, { kilograms: 6 }]

beforeEach(() => {
  put.mockReset()
  get.mockReset()
  post.mockReset()
})

describe('one route price for the form, the quick edit and the CSV import (issues/227)', () => {
  it('counts the consumption-point lines', () => {
    expect(orderRoutePrice(RATE, { kilograms: 12, lines: LINES })).toBeCloseTo(calculateRoutePrice(RATE, 12, 2))
    expect(orderRoutePrice(RATE, { kilograms: 12, lines: LINES })).toBeCloseTo(10.4 + 3)
    expect(orderRoutePrice(RATE, { kilograms: 12 })).toBeCloseTo(10.4)
  })

  it('the quick edit loads the lines of a consumption-point order and prices with them', async () => {
    get.mockResolvedValue({ data: { id: 30, lines: LINES } })
    const vm = {
      ...OrdersTable.methods,
      routes: [{ id: 17, name: 'BCN' }],
      deliveryTypes: [{ id: 1 }, { id: 2 }],
      pickups: [GIRONA],
      routeRates: [RATE],
      orders: [],
      editingRowId: null,
      editingOrder: null,
      editForm: {},
      calculatedPrice: null
    }
    const order = { id: 30, kilograms: 12, pickup_point: true, route: { id: 17 }, pickup: GIRONA, delivery_type: { id: 2 }, status: 'pending' }
    OrdersTable.methods.startEdit.call(vm, order)
    expect(vm.calculatedPrice).toBeCloseTo(10.4)
    await vi.waitFor(() => expect(vm.calculatedPrice).toBeCloseTo(13.4))
    expect(get).toHaveBeenCalledWith('orders/30')
  })
})

describe('the order form previews the volume discount (issues/227)', () => {
  const vmWith = form => ({ form: { id: 0, contact: 9, owner: 5, route: 17, status: 'pending', estimated_delivery_date: new Date(2026, 9, 21), volume_discount: 0, ...form } })

  it('asks for it with the route and status, and takes what the server stores', async () => {
    post.mockResolvedValue({ data: { multidelivery_discount: 0, volume_discount: 2 } })
    const vm = vmWith({})
    await OrdersForm.methods.checkMultidelivery.call(vm)
    expect(post).toHaveBeenCalledWith('orders/check-multidelivery', expect.objectContaining({ routeId: 17, status: 'pending', ownerId: 5 }))
    expect(vm.form.volume_discount).toBe(2)
  })

  it('keeps the stored one when the server keeps it (delivered, invoiced)', async () => {
    post.mockResolvedValue({ data: { multidelivery_discount: 0 } })
    const vm = vmWith({ status: 'delivered', volume_discount: 1.5 })
    await OrdersForm.methods.checkMultidelivery.call(vm)
    expect(vm.form.volume_discount).toBe(1.5)
  })
})
