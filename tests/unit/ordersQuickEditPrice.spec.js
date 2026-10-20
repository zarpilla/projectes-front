// issues/151: in the orders list's quick edit, when no rate matched the price
// showed «?» and saving sent `price: null`, leaving the backend to fill it in.
// Order 24877 of the logistics copy: a farm pickup through a collection point,
// but /orders/table did not give the collection point, so the farm rates
// were looked for and none was found.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const put = vi.fn()
const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'

const GIRONA = { id: 1, pickup: false }
const FINCA = { id: 2, pickup: true }
const RATE = { id: 42, routes: [{ id: 17 }], pickup: GIRONA, delivery_type: { id: 2 }, ratev2: true, less10: 4, more10: 10, from10to20: 12 }

const vmFor = (order, extra = {}) => ({
  ...OrdersTable.methods,
  routes: [{ id: 17, name: 'BCN' }],
  deliveryTypes: [{ id: 1 }, { id: 2 }],
  pickups: [GIRONA, FINCA],
  routeRates: [RATE],
  orders: [],
  editingOrder: { ...order },
  editForm: { route: 17, kilograms: order.kilograms, pickup: 2, delivery_type: 2 },
  calculatedPrice: null,
  importing: false,
  $buefy: { snackbar: { open: vi.fn() }, toast: { open: vi.fn() } },
  checkTransferNeeded: vi.fn(),
  cancelEdit: vi.fn(),
  setStatusFilter: vi.fn(),
  ...extra
})

beforeEach(() => {
  put.mockReset()
  get.mockReset()
  get.mockResolvedValue({ data: { id: 1 } })
  put.mockResolvedValue({ data: {} })
})

describe('orders quick edit price (issues/151)', () => {
  it('prices a farm order that goes through a collection point with the warehouse rates', () => {
    const vm = vmFor({ id: 24877, kilograms: 12, collection_point: { id: 1931 }, status: 'pending' })
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBeCloseTo(10.4)
  })

  it('does not save a null price when no rate matches', async () => {
    const vm = vmFor({ id: 24877, kilograms: 12, status: 'pending' }, { routeRates: [] })
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBeNull()
    await OrdersTable.methods.saveOrder.call(vm, vm.editingOrder)
    expect(put).not.toHaveBeenCalled()
    expect(vm.$buefy.snackbar.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })

  it('saves the computed price when a rate matches', async () => {
    const vm = vmFor({ id: 24877, kilograms: 12, collection_point: { id: 1931 }, status: 'pending' })
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    await OrdersTable.methods.saveOrder.call(vm, vm.editingOrder)
    expect(put).toHaveBeenCalledWith('orders/24877', expect.objectContaining({ price: vm.calculatedPrice }))
  })
})

// issues/287: saving invoiced order 14958 (invoice 633 at 7,50 €) from the
// quick edit, even without changes, repriced it at today's rate (7,70 €) and
// wrote transfer fields, making it a transfer. As in the order form
// (canChangeRate), only a pending order is repriced; the transfer is left to
// the API.
describe('orders quick edit of an order that is not pending (issues/287)', () => {
  it('keeps the price of an invoiced order', async () => {
    const vm = vmFor({ id: 14958, kilograms: 12, collection_point: { id: 1931 }, status: 'invoiced', price: '7.50' })
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBe(7.5)
    await OrdersTable.methods.saveOrder.call(vm, vm.editingOrder)
    expect(put).toHaveBeenCalledWith('orders/14958', expect.objectContaining({ price: 7.5 }))
  })

  it('keeps the price of a processed order when its kilos change', () => {
    const vm = vmFor({ id: 24877, kilograms: 12, status: 'processed', price: 9 })
    vm.editForm.kilograms = 20
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBe(9)
  })

  it('saves an order without a price, or no rate, without sending one', async () => {
    const vm = vmFor({ id: 24877, kilograms: 12, status: 'delivered', price: null }, { routeRates: [] })
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    await OrdersTable.methods.saveOrder.call(vm, vm.editingOrder)
    expect(put).toHaveBeenCalledTimes(1)
    expect(put.mock.calls[0][1]).not.toHaveProperty('price')
  })

  it('sends no transfer fields', async () => {
    for (const status of ['pending', 'invoiced']) {
      put.mockClear()
      const vm = vmFor({ id: 14958, kilograms: 12, collection_point: { id: 1931 }, status, price: 7.5 })
      OrdersTable.methods.updateCalculatedPrice.call(vm)
      await OrdersTable.methods.saveOrder.call(vm, vm.editingOrder)
      const sent = put.mock.calls[0][1]
      expect(sent).not.toHaveProperty('transfer')
      expect(sent).not.toHaveProperty('transfer_pickup_origin')
      expect(sent).not.toHaveProperty('transfer_pickup_destination')
    }
  })
})
