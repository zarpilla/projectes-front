// issues/081: Operacions fetched every order (_limit=-1, ~24k on Diligència,
// ~49 s on a local copy) to show one driver's day. It now asks the orders of
// the driver's routes and the transfers on them, for the day picked.
import { describe, it, expect } from 'vitest'
import { operationsQueries, mergeOrders } from '@/domain/orderOperations'

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
