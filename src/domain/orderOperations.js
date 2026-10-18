import moment from 'moment'

// The orders a driver handles on a day (Operacions, issues/081): the ones on
// their routes and the transfers on their routes, asked to the backend with
// those filters instead of every order (~24k on Diligència) filtered here.
export function operationsQueries ({ routeIds, statuses = [], date = null }) {
  const common = { _limit: -1 }
  statuses.forEach((status, i) => { common[`_where[status_in][${i}]`] = status })

  const direct = { ...common }
  routeIds.forEach((id, i) => { direct[`_where[route_in][${i}]`] = id })
  const transfers = { ...common, '_where[transfer]': true }
  routeIds.forEach((id, i) => { transfers[`_where[transfer_route_in][${i}]`] = id })

  if (date) {
    direct['_where[estimated_delivery_date]'] = date
    transfers['_where[transfer_route_date]'] = date
  }
  return [direct, transfers]
}

// One list from both answers (an order can be in both)
export function mergeOrders (...lists) {
  const byId = new Map()
  lists.flat().forEach(o => byId.set(o.id, o))
  return [...byId.values()]
}

const relId = value => (value && typeof value === 'object' ? value.id : value)

// The operations an order gives to a driver (issues/175): the delivery or
// collection when its route is one of theirs, on estimated_delivery_date, and
// the transfer when its transfer route is, on transfer_route_date. An order
// with both routes on the same driver gives both, each on its own day.
export function orderOperations (order, { routeIds, date = null }) {
  const day = d => (d ? moment(d).format('YYYY-MM-DD') : null)
  const ops = []
  if (routeIds.includes(relId(order.route))) {
    ops.push({ operationType: 'direct', operation_date: order.estimated_delivery_date })
  }
  if (order.transfer && relId(order.transfer_route) && routeIds.includes(relId(order.transfer_route))) {
    ops.push({ operationType: 'transfer', operation_date: order.transfer_route_date })
  }
  return date ? ops.filter(op => day(op.operation_date) === day(date)) : ops
}
