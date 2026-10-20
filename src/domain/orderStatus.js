// Order statuses, shared by the orders list and the order form (issues/083).
// The schema also has deposited (collection orders, set by the backend),
// distributing and lastmile (legacy: «Última milla» is the last_mile checkbox
// now); they are named so an order in one of them reads right everywhere.
export const ORDER_STATUS_LABELS = {
  pending: 'Pendent',
  deposited: 'Dipositada',
  processed: 'Processada',
  distributing: 'En repartiment',
  lastmile: 'Última milla',
  delivered: 'Lliurada',
  invoiced: 'Facturada',
  cancelled: 'Anul·lada'
}

const TAGS = {
  pending: 'is-warning',
  deposited: 'is-info is-light',
  processed: 'is-info is-light',
  distributing: 'is-link is-light',
  lastmile: 'is-link is-light',
  delivered: 'is-success is-light',
  invoiced: '',
  cancelled: 'is-danger is-light'
}

// What the office picks from in the order form
export const FORM_STATUSES = ['pending', 'processed', 'delivered', 'invoiced', 'cancelled']

// The states the Comandes selection bar offers (issues/144): the office sets
// any of them; a member only cancels her own pending orders, like the order
// form's «Anul·la la comanda» (the API refuses the rest too).
const STAFF_BULK_STATUSES = ['pending', 'processed', 'delivered', 'cancelled']
export const bulkStatuses = isStaff => (isStaff ? STAFF_BULK_STATUSES : ['cancelled'])

// A driver (orders_delivery without the office) changes the state of any order
// but never to or from Facturada: invoicing is the office's (issues/193, the
// API's rule since issues/163).
export function canSetStatus (order, status, isStaff, { driver = false } = {}) {
  if (!order) return false
  if (driver) return status === order.status || (status !== 'invoiced' && order.status !== 'invoiced')
  if (isStaff) return true
  return order.status === 'pending' && status === 'cancelled'
}

/**
 * The invoiced orders a bulk state change would move out of Facturada. They
 * stay on their invoice, so the bar asks first, like the order form warns
 * («Comanda ja processada…», issues/240).
 */
export const leavingInvoiced = (rows, status) =>
  status === 'invoiced' ? [] : (rows || []).filter(row => row && row.status === 'invoiced')

export const leavingInvoicedMessage = (rows, status) => {
  const ids = rows.map(row => `#${row.id}`).join(', ')
  const which = rows.length === 1 ? `La comanda ${ids} ja està facturada` : `Les comandes ${ids} ja estan facturades`
  return `<b>Comanda ja processada.</b> ${which}: si la passes a «${orderStatusLabel(status)}», continuarà a la seva factura, que no canvia. Vols canviar-ne l'estat igualment?`
}

/** Why the selection bar left some orders out (issues/144, 193). */
export const bulkSkipReason = (isStaff, driver) =>
  isStaff && driver ? "les facturades només les canvia l'oficina" : 'només es poden anul·lar les pendents'

// An order is deposited only while it is still on its way: a delivered,
// invoiced or cancelled one is past it (issues/149; the API refuses it too)
const NOT_DEPOSITABLE = ['delivered', 'invoiced', 'cancelled']
export const canDeposit = order => Boolean(order) && !NOT_DEPOSITABLE.includes(order.status)

export const orderStatusLabel = status => ORDER_STATUS_LABELS[status] || status
export const orderStatusTag = status => TAGS[status] || ''

// The form's buttons: the usual ones, plus the order's own status when it is
// another one, so it shows as selected instead of no button at all
export const formStatuses = current =>
  current && !FORM_STATUSES.includes(current) ? [...FORM_STATUSES, current] : FORM_STATUSES

// The list's status tabs as query clauses. «Última milla» is the last_mile
// checkbox; picked together with statuses it adds those orders (OR), it
// doesn't narrow the others down.
export function statusWhere (selected) {
  const lastMile = selected.includes('lastmile')
  const statuses = selected.filter(s => s !== 'lastmile')
  if (!statuses.length) return lastMile ? ['_where[last_mile]=true'] : []
  if (!lastMile) return statuses.map(s => `_where[status]=${s}`)
  return [
    ...statuses.map((s, i) => `_where[_or][0][status_in][${i}]=${s}`),
    '_where[_or][1][last_mile]=true'
  ]
}

// What a state change saved on its own sends (issues/193): the state, and the
// delivery date when it is delivered without one, as the form's save does.
export function statusChange (order, status, today) {
  const fields = { status }
  if (status === 'delivered' && !(order && order.delivery_date)) fields.delivery_date = today
  return fields
}
