// issues/361: the logistics simulator quotes an order without saving it. Its
// price must be the one the same real order gets: the form's rate choice,
// route price, volume/multidelivery discounts and late surcharge.
import { describe, it, expect } from 'vitest'
import moment from 'moment'
import { quoteOrder, quoteCollection, collectionRate, townRoutes, transferNeeded, quoteRows } from '@/domain/logisticsQuote'
import { assignRouteRate, orderRoutePrice } from '@/service/assignRouteRate'
import { invoicedPrice } from '@/domain/logisticsInvoicing'

const GIRONA = { id: 1, name: 'Magatzem Girona', pickup: false, city: { id: 10 } }
const VIC = { id: 3, name: 'Magatzem Vic', pickup: false, city: { id: 30 } }
const FARM = { id: 2, name: 'Recollida en Finca', pickup: true }
const pickups = [GIRONA, FARM, VIC]
const route = { id: 7, name: 'Garrotxa', active: true, thursday: true, volume_discount_number_of_orders: 3, volume_discount_price: 2 }
const rateV2 = { less10: 8, more10: 10, from10to20: 14, from20to30: 18, from30to40: 22, from40to50: 26, from50to60: 30, additional60: 0.4, ratev2: true }
const routeRates = [
  { id: 1, name: 'Magatzem', ...rateV2, routes: [], pickup: GIRONA, delivery_type: { id: 4 } },
  { id: 2, name: 'Finca', ...rateV2, less10: 12, more10: 15, from10to20: 20, routes: [], pickup: FARM },
  { id: 3, name: 'Refrigerada', ...rateV2, less10: 11, more10: 13, from10to20: 17, routes: [], delivery_type: { id: 9 } }
]
const options = { multidelivery_discount: 10, late_surcharge: 25, next_day_limit_hour: 13 }
// a Thursday far ahead: never late
const thursday = moment().add(14, 'days').day(4).startOf('day').toDate()

describe('logistics quote (issues/361)', () => {
  it('the price the order form gives the same order', () => {
    const q = quoteOrder(
      { route, date: thursday, kilograms: 15, deliveryType: 4, warehouse: GIRONA },
      { routeRates, pickups, ownerId: 5, ordersOptions: options }
    )
    const form = { route: 7, delivery_type: 4, pickup: 1, owner: 5, route_rate: null, status: 'pending' }
    const rate = assignRouteRate(form, routeRates, [], pickups)
    const price = orderRoutePrice(rate, { kilograms: 15, lines: [] })
    expect(q.rate.id).toBe(1)
    expect(q.price).toBe(12) // 10 + 0.5 × (14 − 10)
    expect(q.total).toBe(invoicedPrice({ price }))
  })

  it('a farm pickup takes the farm rate, unless one is already pending on the route', () => {
    const input = { route, date: thursday, kilograms: 5, deliveryType: 4, warehouse: GIRONA, farmPickup: FARM }
    expect(quoteOrder(input, { routeRates, pickups, ownerId: 5 }).total).toBe(12)
    const pending = [{ id: 40, pickup: { id: 2 }, route: { id: 7 }, owner: { id: 5 }, status: 'pending' }]
    expect(quoteOrder(input, { routeRates, pickups, ownerId: 5, pendingOrders: pending }).total).toBe(8)
  })

  it('the delivery type picks its own rate', () => {
    const q = quoteOrder({ route, date: thursday, kilograms: 5, deliveryType: 9, warehouse: GIRONA }, { routeRates, pickups })
    expect(q.rate.id).toBe(3)
  })

  it('volume, multidelivery and late surcharge, combined as the invoice does', () => {
    const sameDay = [{ status: 'pending' }, { status: 'pending' }, { status: 'cancelled' }]
    const q = quoteOrder(
      { route, date: thursday, kilograms: 15, deliveryType: 4, warehouse: GIRONA },
      { routeRates, pickups, ordersOptions: options, sameDayOrders: sameDay, otherOrderToPoint: true }
    )
    expect(q.volume.discount).toBe(2)
    expect(q.multidelivery.discount).toBe(10)
    expect(q.total).toBe(9) // (12 − 2) × 0.9
    // a member without «Descompte multientrega»
    const none = quoteOrder(
      { route, date: thursday, kilograms: 15, deliveryType: 4, warehouse: GIRONA },
      { routeRates, pickups, ordersOptions: options, otherOrderToPoint: true, multideliveryAllowed: false }
    )
    expect(none.multidelivery.discount).toBe(0)

    // tomorrow at 20 h: late, +25 % (the office is exempt)
    const now = moment().startOf('day').hour(20).toDate()
    const tomorrow = moment(now).add(1, 'day').toDate()
    const everyDay = { ...route, monday: true, tuesday: true, wednesday: true, friday: true, saturday: true, sunday: true }
    const late = quoteOrder(
      { route: everyDay, date: tomorrow, kilograms: 15, deliveryType: 4, warehouse: GIRONA },
      { routeRates, pickups, ordersOptions: { ...options, working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }, now }
    )
    expect(late.late).toEqual({ late: true, surcharge: 25 })
    expect(late.total).toBe(15)
    expect(quoteOrder({ route: everyDay, date: tomorrow, kilograms: 15, deliveryType: 4, warehouse: GIRONA }, { routeRates, pickups, ordersOptions: options, now, exempt: true }).late.late).toBe(false)
  })

  it('the routes of a town, and the transfer a warehouse off the route needs', () => {
    const cityRoutes = [
      { city: { id: 10 }, route: { id: 7 } },
      { city: { id: 50 }, route: { id: 7 } },
      { city: { id: 50 }, route: { id: 8 } },
      { city: { id: 50 }, route: { id: 7 } }
    ]
    const routes = [route, { id: 8, name: 'Old', active: false }]
    expect(townRoutes(50, cityRoutes, routes).map(r => r.id)).toEqual([7])
    expect(transferNeeded(GIRONA, route, cityRoutes)).toBe(false)
    expect(transferNeeded(VIC, route, cityRoutes)).toBe(true)
  })

  it('exports the breakdown as rows', () => {
    const input = { route, date: thursday, kilograms: 15, units: 3, deliveryType: 4, warehouse: GIRONA }
    const rows = quoteRows(input, quoteOrder(input, { routeRates, pickups }), { member: 'Formatgeria', town: 'Olot' })
    expect(rows.find(r => r.concepte === 'Total sense IVA (€)').valor).toBe(12)
    expect(rows.find(r => r.concepte === 'Ruta').valor).toBe('Garrotxa')
  })

  // 2026-11-02 (the user): the quote includes the collection order (-R) of a
  // farm pickup and the collection point's «Descompte recollida»
  describe('farm pickup through a collection point (-R)', () => {
    const POINT = { id: 70, name: 'Mas Pla', pickup_discount: 10 }
    const pickupRoute = { id: 8, name: 'Recollides Garrotxa', tuesday: true }
    const deliveryTypes = [{ id: 4, refrigerated: false }, { id: 9, refrigerated: true }]
    const input = { route, date: thursday, kilograms: 5, deliveryType: 4, warehouse: GIRONA, farmPickup: FARM, collectionPoint: POINT, pickupRoute }

    it('the -R takes a warehouse (or no pickup) rate of its delivery type, never a farm one', () => {
      expect(collectionRate(routeRates, { routeId: 8, deliveryTypeId: 4, pickups }).id).toBe(1)
      expect(collectionRate(routeRates, { routeId: 8, deliveryTypeId: 9, pickups }).id).toBe(3)
    })

    it('the order takes the warehouse rate and adds a new -R less the pickup discount', () => {
      const q = quoteOrder(input, { routeRates, pickups, deliveryTypes, ownerId: 5 })
      expect(q.rate.id).toBe(1)
      expect(q.orderTotal).toBe(8)
      expect(q.collection).toMatchObject({ kilograms: 5, price: 8, discount: 10, total: 7.2, current: 0, extra: 7.2, pending: null })
      expect(q.total).toBe(15.2)
    })

    it('joining a pending -R costs only what it raises', () => {
      const pending = { id: 900, kilograms: 20, price: 14, contact_pickup_discount: 10, delivery_type: { id: 4 } }
      const q = quoteOrder(input, { routeRates, pickups, deliveryTypes, ownerId: 5, pendingCollection: pending })
      // 25 kg: 14 + 0.5 × (18 − 14) = 16, less 10 % = 14.4; it was 12.6
      expect(q.collection).toMatchObject({ kilograms: 25, price: 16, total: 14.4, current: 12.6, extra: 1.8 })
      expect(q.total).toBe(9.8)
    })

    it('a refrigerated order makes the -R refrigerated', () => {
      const pending = { id: 900, kilograms: 20, price: 14, delivery_type: { id: 4, refrigerated: false } }
      const c = quoteCollection({ point: POINT, pickupRoute, kilograms: 5, deliveryType: 9 }, { routeRates, pickups, deliveryTypes, pending })
      expect(c.rate.id).toBe(3)
    })

    it('exports the -R rows', () => {
      const q = quoteOrder(input, { routeRates, pickups, deliveryTypes })
      const rows = quoteRows({ ...input, units: 1 }, q)
      const value = label => rows.find(r => r.concepte === label).valor
      expect(value('Total comanda (€)')).toBe(8)
      expect(value('Punt de recollida')).toBe('Mas Pla')
      expect(value('Descompte recollida (%)')).toBe(10)
      expect(value('Aquesta comanda hi afegeix (€)')).toBe(7.2)
      expect(value('Total sense IVA (€)')).toBe(15.2)
    })
  })
})
