// issues/081: Operacions fetched every order (_limit=-1, ~24k on Diligència,
// ~49 s on a local copy) to show one driver's day. It now asks the orders of
// the driver's routes and the transfers on them, for the day picked.
import { describe, it, expect } from 'vitest'
import { operationsQueries, mergeOrders, orderOperations } from '@/domain/orderOperations'

describe('Operacions queries (issues/081)', () => {
  it('asks only the driver\'s routes, statuses and day', () => {
    const [direct, transfers] = operationsQueries({ routeIds: [3, 4], statuses: ['pending', 'processed'], date: '2026-10-14' })
    expect(direct).toEqual({
      _limit: -1,
      '_where[status_in][0]': 'pending',
      '_where[status_in][1]': 'processed',
      '_where[route_in][0]': 3,
      '_where[route_in][1]': 4,
      '_where[estimated_delivery_date]': '2026-10-14'
    })
    expect(transfers).toEqual({
      _limit: -1,
      '_where[status_in][0]': 'pending',
      '_where[status_in][1]': 'processed',
      '_where[transfer]': true,
      '_where[transfer_route_in][0]': 3,
      '_where[transfer_route_in][1]': 4,
      '_where[transfer_route_date]': '2026-10-14'
    })
  })

  it('without a day, asks every date', () => {
    const [direct, transfers] = operationsQueries({ routeIds: [1], date: null })
    expect(direct).toEqual({ _limit: -1, '_where[route_in][0]': 1 })
    expect(transfers).toEqual({ _limit: -1, '_where[transfer]': true, '_where[transfer_route_in][0]': 1 })
  })

  it('merges both answers once per order', () => {
    expect(mergeOrders([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }]).map(o => o.id)).toEqual([1, 2, 3])
  })
})

// issues/175: an order whose route and transfer route are both the driver's
// was only a transfer, so on the delivery day the delivery was missing.
describe('Operations of an order (issues/175)', () => {
  const order = {
    id: 7,
    route: { id: 3 },
    estimated_delivery_date: '2026-10-07',
    transfer: true,
    transfer_route: 4,
    transfer_route_date: '2026-10-06'
  }
  const types = (o, opts) => orderOperations(o, opts).map(op => op.operationType)

  it('same driver on both routes: the delivery on its day and the transfer on its own', () => {
    expect(types(order, { routeIds: [3, 4], date: '2026-10-07' })).toEqual(['direct'])
    expect(types(order, { routeIds: [3, 4], date: '2026-10-06' })).toEqual(['transfer'])
    expect(orderOperations(order, { routeIds: [3, 4] })).toEqual([
      { operationType: 'direct', operation_date: '2026-10-07' },
      { operationType: 'transfer', operation_date: '2026-10-06' }
    ])
  })

  it('only the routes of the driver count', () => {
    expect(types(order, { routeIds: [3] })).toEqual(['direct'])
    expect(types(order, { routeIds: [4] })).toEqual(['transfer'])
    expect(types({ ...order, transfer: false }, { routeIds: [4] })).toEqual([])
    expect(types(order, { routeIds: [9] })).toEqual([])
  })
})
