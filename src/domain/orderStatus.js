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

export function canSetStatus (order, status, isStaff) {
  if (isStaff) return true
  return Boolean(order) && order.status === 'pending' && status === 'cancelled'
}

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
