// The relations each screen reads of the orders it lists (issues/319). With no
// populate, the backend gives every relation of every order (populate=*): the
// emitted invoice, the collection orders, the lines, … which these screens
// don't read, and which made their lists 1.5–2× slower and heavier.
// A relation a screen starts reading must be added to its list.

// Operacions (OrderOperationsTable): the cards and their transfer groups
export const OPERATIONS_RELATIONS = [
  'owner', 'contact', 'pickup', 'route', 'incidences',
  'transfer_pickup_origin', 'transfer_pickup_destination', 'transfer_route'
]

// Dipòsits (DepositsTable): the columns and the Punt filter
export const DEPOSITS_RELATIONS = ['owner', 'contact', 'pickup', 'route', 'collection_point']

// Punts de consum (PickupPointsOrders): the columns, and the lines it saves back
export const PICKUP_POINT_RELATIONS = ['owner', 'contact', 'route', 'lines']

// The order form's pending orders of the same route and member: only the
// rate choice reads them (assignRouteRate)
export const RATE_ORDERS_RELATIONS = ['owner', 'pickup', 'route']

/** `{ 'populate[0]': 'owner', … }`, for axios `params`. */
export const populateParams = relations =>
  Object.fromEntries(relations.map((relation, i) => [`populate[${i}]`, relation]))

/** `populate[0]=owner&…`, for a query string. */
export const populateQuery = relations =>
  relations.map((relation, i) => `populate[${i}]=${relation}`).join('&')
