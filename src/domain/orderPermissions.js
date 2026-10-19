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

/**
 * The order form and the quick edit of the list; `order` without id is a new
 * one. A member's collection order is like her other orders, as on master
 * (the user's rule, issues/217): hers to change (the route) and cancel while
 * pending, read-only once processed. Its delivery type, boxes and pickup are
 * the collection's for everyone (the form locks them).
 */
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

/**
 * «Anul·la la comanda»: the office on any order but a cancelled one; a driver
 * not on an invoiced one either (the API refuses it: issues/193); a member, her
 * pending orders.
 */
export function canCancelOrder (order, permissions) {
  if (!order || !order.id || order.status === 'cancelled') return false
  if (isOffice(permissions)) return true
  if (isDriver(permissions)) return order.status !== 'invoiced'
  return order.status === 'pending'
}

/**
 * What the banner of a processed order adds (issues/193): the member is told to
 * ask the office, a driver what is still hers (she works there: the member's
 * text named the entity to her), whoever edits it to mind the changes.
 */
export function processedOrderNotice (order, permissions) {
  if (canEditOrder(order, permissions)) return 'Atenció amb els canvis: poden afectar entregues ja fetes o factures emeses.'
  // an invoiced order's state is the office's too: every state was disabled (issues/226)
  if (isLogisticsStaff(permissions) && order && order.status === 'invoiced') return "En pots registrar els moviments; l'estat i la resta de dades els canvia l'oficina."
  if (isLogisticsStaff(permissions)) return "En pots registrar els moviments i l'estat; la resta de dades les canvia l'oficina."
  return "Si hi ha algun canvi d'última hora, contacta si us plau amb La Diligència."
}

/**
 * A driver has no «Guardar» on the order form (she doesn't edit the order),
 * so what she may change there, the state and the delivery date, is saved at
 * once, like in Operacions (issues/193, review 5). The office and a member on
 * her pending order keep picking it and saving the form.
 */
export const savesOperationsAtOnce = (order, permissions) =>
  Boolean(order && order.id) && !canEditOrder(order, permissions) && canMoveOrder(order, permissions)
