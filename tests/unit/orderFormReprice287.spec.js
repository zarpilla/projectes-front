// issues/287, the user's decision (2026-10-20): the price of an order that is
// not invoiced follows its kilos, boxes, route and type in the order form as
// in the list's quick edit, not only while it is pending (`canChangeRate`); a
// save without such a change keeps its price, so new rate tables don't
// change old orders; an invoiced order keeps the price it was invoiced with,
// and a -R the one of the orders it collects (issues/292).
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'
import { repricesOrder } from '@/domain/orderReprice'

const GIRONA = { id: 1, pickup: false }
const OLD_RATE = { id: 40, name: 'Abans', routes: [{ id: 17 }], pickup: GIRONA, delivery_type: { id: 2 }, ratev2: true, less10: 4, more10: 9, from10to20: 11 }
const RATE = { ...OLD_RATE, id: 39, name: 'Avui', more10: 10, from10to20: 12 }
const COLD = { ...RATE, id: 41, delivery_type: { id: 1 }, more10: 20, from10to20: 20 }

// the form as loaded (getData): the order and the snapshot of it
const formVm = order => {
  const form = { route: 17, pickup: 1, delivery_type: 2, units: 2, kilograms: 12, lines: [], route_rate: OLD_RATE, ...order }
  const vm = {
    form,
    loadedOrder: { ...form, lines: [...form.lines] },
    routeRates: [RATE, COLD],
    orders: [],
    pickups: [GIRONA]
  }
  for (const name of ['canChangeRate', 'route_rate', 'route_price']) {
    Object.defineProperty(vm, name, { get: () => OrdersForm.computed[name].call(vm) })
  }
  return vm
}

describe('the price in the order form (issues/287)', () => {
  it('a processed order saved without changes keeps its price and rate', () => {
    const vm = formVm({ id: 24886, status: 'processed', price: 9 })
    expect(vm.canChangeRate).toBe(false)
    expect(vm.route_price).toBe(9)
    expect(vm.route_rate).toBe(OLD_RATE)
  })

  it('a processed or delivered order is repriced when its kilos or type change', () => {
    for (const status of ['processed', 'delivered', 'lastmile']) {
      const vm = formVm({ id: 24886, status, price: 9 })
      vm.form.kilograms = 20
      expect(vm.canChangeRate).toBe(true)
      expect(vm.route_price).toBeCloseTo(12)
      expect(vm.form.price).toBeCloseTo(12)
      vm.form.delivery_type = 1
      expect(vm.route_price).toBeCloseTo(20)
      expect(vm.form.route_rate.id).toBe(41)
    }
  })

  it('a change undone gives back the price it had', () => {
    const vm = formVm({ id: 24886, status: 'processed', price: 9 })
    vm.form.kilograms = 20
    expect(vm.route_price).toBeCloseTo(12)
    vm.form.kilograms = '12'
    expect(vm.route_price).toBe(9)
    expect(vm.form.price).toBe(9)
    expect(vm.route_rate).toBe(OLD_RATE)
  })

  it('an invoiced order, or one still on an invoice, keeps its price', () => {
    for (const order of [{ status: 'invoiced' }, { status: 'delivered', emitted_invoice: { id: 890 } }]) {
      const vm = formVm({ id: 14958, price: 7.5, ...order })
      vm.form.kilograms = 20
      expect(vm.canChangeRate).toBe(false)
      expect(vm.route_price).toBe(7.5)
    }
  })

  it('a pending order is priced from the rates, as before', () => {
    const vm = formVm({ id: 24893, status: 'pending', price: 9 })
    expect(vm.route_price).toBeCloseTo(10.4)
  })

  it('a -R keeps the price of the orders it collects', () => {
    const vm = formVm({ id: 24894, status: 'pending', price: 16.43, is_collection_order: true })
    vm.form.kilograms = 50
    expect(vm.route_price).toBe(16.43)
  })

  it('a new order is priced from the rates', () => {
    expect(repricesOrder(null, { status: 'pending' })).toBe(true)
  })
})
