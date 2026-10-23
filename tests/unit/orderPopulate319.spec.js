// issues/319 (2026-10-23): Operacions, Dipòsits, Punts de consum and the
// order form's rate check listed orders with populate=* (every relation of
// every order: the emitted invoice, the collection orders, …). They now ask
// only for the relations they read. Guards: the lists stay what the screens
// read, and a screen that starts reading another relation fails here until
// the relation is added to its list.
import { describe, it, expect } from 'vitest'
import {
  OPERATIONS_RELATIONS, DEPOSITS_RELATIONS, PICKUP_POINT_RELATIONS, RATE_ORDERS_RELATIONS,
  populateParams, populateQuery
} from '@/domain/orderPopulate'
import { assignRouteRate } from '@/service/assignRouteRate'

const sources = import.meta.glob('/src/components/*.vue', { query: '?raw', import: 'default', eager: true })
const source = name => sources[`/src/components/${name}.vue`]

// every relation of an order (projectes-v5 order schema)
const ORDER_RELATIONS = [
  'owner', 'product', 'contact', 'pickup', 'route', 'delivery_type', 'route_rate', 'contact_legal_form',
  'emitted_invoice', 'lines', 'deposit_user', 'pickup_user', 'collection_point', 'incidences',
  'transfer_start_user', 'transfer_end_user', 'transfer_pickup_origin', 'transfer_pickup_destination',
  'collection_orders', 'collection_order', 'collection_pickup_route', 'transfer_route'
]
const mentioned = text => ORDER_RELATIONS.filter(r => new RegExp(`[.'"\\[]${r}\\b`).test(text))

describe('order populate per screen (issues/319)', () => {
  it('builds the populate params and query string', () => {
    expect(populateParams(['owner', 'route'])).toEqual({ 'populate[0]': 'owner', 'populate[1]': 'route' })
    expect(populateQuery(['owner', 'route'])).toBe('populate[0]=owner&populate[1]=route')
  })

  it.each([
    ['OrderOperationsTable', OPERATIONS_RELATIONS],
    ['DepositsTable', DEPOSITS_RELATIONS],
    ['PickupPointsOrders', PICKUP_POINT_RELATIONS]
  ])('%s asks for every relation it reads', (name, relations) => {
    const text = source(name)
    expect(text).toMatch(/populate(Query|Params)\(/)
    expect(mentioned(text).filter(r => !relations.includes(r))).toEqual([])
  })

  it("the order form's pending orders carry what the rate choice reads", () => {
    expect(source('OrdersForm').match(/populateQuery\(RATE_ORDERS_RELATIONS\)/g)).toHaveLength(2)
    // a farm pickup gets the farm's rate only without another pending order of
    // the member on that route with the same pickup
    const farm = { id: 3, pickup: true }
    const rates = [{ id: 1, pickup: { id: 3 } }, { id: 2 }]
    const form = { id: 9, pickup: { id: 3 }, route: 12, owner: 65, status: 'pending', route_rate: null }
    const pending = [{ id: 8, status: 'pending', pickup: { id: 3 }, route: { id: 12 }, owner: { id: 65 } }]
    expect(assignRouteRate({ ...form }, rates, pending, [farm]).id).toBe(2)
    expect(assignRouteRate({ ...form }, rates, [], [farm]).id).toBe(1)
    expect(RATE_ORDERS_RELATIONS).toEqual(expect.arrayContaining(['owner', 'pickup', 'route']))
  })
})
