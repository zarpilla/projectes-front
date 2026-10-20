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
  editingOrder: { route: { id: 17 }, pickup: { id: 2 }, delivery_type: { id: 2 }, ...order },
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

  // the user's decision (2026-10-20): any order that is not invoiced is
  // repriced when its kilos, boxes, route or type change; an unchanged save
  // keeps its price (new rate tables don't change old orders)
  it('reprices a processed order when its kilos change', () => {
    const vm = vmFor({ id: 24877, kilograms: 12, collection_point: { id: 1931 }, status: 'processed', price: 9 })
    vm.editForm.kilograms = 20
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBeCloseTo(12)
  })

  it('reprices a delivered order when its route, type or boxes change', () => {
    const rates = [RATE, { ...RATE, id: 43, routes: [{ id: 18 }], less10: 5, more10: 11, from10to20: 13 }, { ...RATE, id: 44, delivery_type: { id: 1 }, more10: 20, from10to20: 20 }]
    const order = { id: 24877, kilograms: 12, units: 2, collection_point: { id: 1931 }, status: 'delivered', price: 9 }
    let vm = vmFor(order, { routeRates: rates, routes: [{ id: 17 }, { id: 18 }] })
    vm.editForm.route = 18
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBeCloseTo(11.4)
    vm = vmFor(order, { routeRates: rates })
    vm.editForm.delivery_type = 1
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBeCloseTo(20)
    vm = vmFor(order, { routeRates: rates })
    vm.editForm.units = 3
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBeCloseTo(10.4)
  })

  it('keeps the price of a processed order saved without changes', async () => {
    const vm = vmFor({ id: 24877, kilograms: 12, units: 2, collection_point: { id: 1931 }, status: 'processed', price: 9 })
    vm.editForm.units = '2'
    vm.editForm.kilograms = '12'
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBe(9)
    await OrdersTable.methods.saveOrder.call(vm, vm.editingOrder)
    expect(put.mock.calls[0][1].price).toBe(9)
  })

  it('keeps the price of an invoiced order, or one still on an invoice, when its kilos change', () => {
    for (const order of [
      { id: 14958, kilograms: 12, collection_point: { id: 1931 }, status: 'invoiced', price: 7.5 },
      { id: 24460, kilograms: 12, collection_point: { id: 1931 }, status: 'delivered', price: 7.5, emitted_invoice: { id: 890 } }
    ]) {
      const vm = vmFor(order)
      vm.editForm.kilograms = 20
      OrdersTable.methods.updateCalculatedPrice.call(vm)
      expect(vm.calculatedPrice).toBe(7.5)
    }
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

// issues/292: a farm collection order (-R) follows the orders it collects:
// the quick edit neither reprices it nor sends its boxes, kilos or type
describe('orders quick edit of a collection order (issues/292)', () => {
  it('keeps its price and sends no boxes, kilos nor type', async () => {
    const vm = vmFor({ id: 24894, kilograms: 32, units: 2, status: 'pending', price: 16.43, is_collection_order: true })
    vm.editForm.kilograms = 40
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    expect(vm.calculatedPrice).toBe(16.43)
    await OrdersTable.methods.saveOrder.call(vm, vm.editingOrder)
    const sent = put.mock.calls[0][1]
    expect(sent).not.toHaveProperty('kilograms')
    expect(sent).not.toHaveProperty('units')
    expect(sent).not.toHaveProperty('delivery_type')
  })

  it('shows its boxes, kilos and type read-only', () => {
    const vm = vmFor({ id: 24894, status: 'pending', is_collection_order: true })
    expect(OrdersTable.methods.quickEditField.call(vm, { edit: 'kilograms' })).toBe(false)
    expect(OrdersTable.methods.quickEditField.call(vm, { edit: 'delivery_type' })).toBe(false)
    expect(OrdersTable.methods.quickEditField.call(vm, { edit: 'estimated' })).toBe(true)
    const other = vmFor({ id: 1, status: 'pending' })
    expect(OrdersTable.methods.quickEditField.call(other, { edit: 'kilograms' })).toBe(true)
  })
})

// verification of 287 (2026-10-20): a repriced order saved its new price but
// kept its old rate, so the form showed the wrong «Tarifa» (#24755)
describe('orders quick edit rate (issues/287)', () => {
  it('saves the rate of the new price', async () => {
    const vm = vmFor({ id: 24755, kilograms: 12, collection_point: { id: 1931 }, status: 'processed', price: 9, route_rate: { id: 38 } })
    vm.editForm.kilograms = 20
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    await OrdersTable.methods.saveOrder.call(vm, vm.editingOrder)
    expect(put).toHaveBeenCalledWith('orders/24755', expect.objectContaining({ price: vm.calculatedPrice, route_rate: 42 }))
  })

  it('sends no rate when the price is kept', async () => {
    const vm = vmFor({ id: 24756, kilograms: 12, status: 'processed', price: 9, route_rate: { id: 38 } })
    OrdersTable.methods.updateCalculatedPrice.call(vm)
    await OrdersTable.methods.saveOrder.call(vm, vm.editingOrder)
    expect(put.mock.calls[0][1]).not.toHaveProperty('route_rate')
  })
})
