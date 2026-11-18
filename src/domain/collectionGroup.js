// Grouped pickups (issues/429): the orders a collection order (XXXXX-R)
// gathers, shown and edited under it in Comandes. The API moves them with a
// moved -R and refuses any pickup that would come after its delivery, naming
// the orders in `error.details.orders`.
import moment from 'moment'

const idOf = value => (value && typeof value === 'object' ? value.id : value)
const day = value => (value ? moment(value).format('YYYY-MM-DD') : null)

// the orders' fields the grouped view reads
export const GROUPED_ORDER_RELATIONS = ['route', 'collection_pickup_route', 'contact']

/** The order ids an API refusal names (a pickup after its delivery), or []. */
export function conflictOrders (error) {
  const body = error && error.response && error.response.data
  const orders = body && body.error && body.error.details && body.error.details.orders
  return Array.isArray(orders) ? orders : []
}

/** The message of an API refusal, or `fallback`. */
export function refusalMessage (error, fallback) {
  const body = error && error.response && error.response.data
  return (body && body.error && body.error.message) || (body && body.message) || fallback
}

/** The edit form of one grouped order: its pickup and its delivery. */
export function groupedEditForm (order) {
  return {
    collection_pickup_date: order.collection_pickup_date ? moment(order.collection_pickup_date, 'YYYY-MM-DD').toDate() : null,
    collection_pickup_route: idOf(order.collection_pickup_route) || null,
    estimated_delivery_date: order.estimated_delivery_date ? moment(order.estimated_delivery_date, 'YYYY-MM-DD').toDate() : null,
    route: idOf(order.route) || null
  }
}

/**
 * What changed in a grouped order's edit: only that is sent, so an unchanged
 * date is not judged again (a pickup already past saves as it is).
 */
export function groupedEditPayload (order, form) {
  const payload = {}
  if (day(form.collection_pickup_date) !== day(order.collection_pickup_date)) payload.collection_pickup_date = day(form.collection_pickup_date)
  if ((form.collection_pickup_route || null) !== (idOf(order.collection_pickup_route) || null)) payload.collection_pickup_route = form.collection_pickup_route
  if (day(form.estimated_delivery_date) !== day(order.estimated_delivery_date)) payload.estimated_delivery_date = day(form.estimated_delivery_date)
  if ((form.route || null) !== (idOf(order.route) || null)) payload.route = form.route
  return payload
}

/** Whether the edit would put the pickup after the delivery (the API refuses it too). */
export function pickupAfterDelivery (form) {
  const pickup = day(form.collection_pickup_date)
  const delivery = day(form.estimated_delivery_date)
  return Boolean(pickup && delivery && pickup > delivery)
}

/** Whether the edit moves the pickup: the order leaves its -R for another. */
export const movesPickup = payload => 'collection_pickup_date' in payload || 'collection_pickup_route' in payload
