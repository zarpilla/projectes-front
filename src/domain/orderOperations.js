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
