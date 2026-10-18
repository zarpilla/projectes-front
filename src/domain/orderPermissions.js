// Who changes what on an order (issues/163). The API applies the same rules:
// the office (orders_admin) changes the order and its price; a driver
// (orders_delivery without the office) makes its moves (deposit, transfer,
// loading) and changes its state from the list; a member changes her own
// pending orders and deposits her boxes. Transfers and loading are the staff's.

const has = (permissions, permission) => (permissions || []).includes(permission)

export const isOffice = permissions => has(permissions, 'orders_admin')
export const isLogisticsStaff = permissions => isOffice(permissions) || has(permissions, 'orders_delivery')
export const isDriver = permissions => has(permissions, 'orders_delivery') && !isOffice(permissions)

/** A driver creates orders only when she is a member too. */
export const canCreateOrders = permissions => !isDriver(permissions) || has(permissions, 'orders')

/** The order form and the quick edit of the list; `order` without id is a new one. */
export function canEditOrder (order, permissions) {
  if (!order) return false
  if (!order.id) return canCreateOrders(permissions)
  if (isOffice(permissions)) return order.status !== 'cancelled'
  return order.status === 'pending' && !isLogisticsStaff(permissions)
}

/** Transfers and loading: the logistics staff. */
export const canMoveOrder = (order, permissions) =>
  Boolean(order) && isLogisticsStaff(permissions) && order.status !== 'cancelled'

/** The deposit: whoever edits the order or moves it. */
export const canDepositOrderMove = (order, permissions) =>
  canEditOrder(order, permissions) || canMoveOrder(order, permissions)

/** The order's card: whoever edits it, and the staff to make the moves. */
export const canOpenOrder = (order, permissions) =>
  Boolean(order && order.id) && (canEditOrder(order, permissions) || canMoveOrder(order, permissions))
