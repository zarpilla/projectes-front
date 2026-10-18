// The «Rutes» screen (issues/141): the office creates, edits and disables
// routes. A route is never deleted (old orders keep it): disabling it is
// `active = false`, and the order form, «Rutes i dies», «Poblacions i rutes»
// and Operacions only show active routes.

export const WEEKDAYS = [
  { key: 'monday', label: 'Dilluns', short: 'Dl' },
  { key: 'tuesday', label: 'Dimarts', short: 'Dt' },
  { key: 'wednesday', label: 'Dimecres', short: 'Dc' },
  { key: 'thursday', label: 'Dijous', short: 'Dj' },
  { key: 'friday', label: 'Divendres', short: 'Dv' },
  { key: 'saturday', label: 'Dissabte', short: 'Ds' },
  { key: 'sunday', label: 'Diumenge', short: 'Dg' }
]

const idOf = value => (value && typeof value === 'object' ? value.id : value) || null

const numberOrNull = value => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** The form of a route (a new one when `route` is missing): next order, active, no days. */
export function routeToForm (route, routes = []) {
  const r = route || {}
  const form = {
    id: r.id || null,
    name: r.name || '',
    short_name: r.short_name || '',
    order: r.order ?? (route ? null : nextOrder(routes)),
    active: route ? Boolean(r.active) : true,
    is_transfer_route: Boolean(r.is_transfer_route),
    transfer_pickup: idOf(r.transfer_pickup),
    delivery_user: idOf(r.delivery_user),
    volume_discount_number_of_orders: r.volume_discount_number_of_orders ?? null,
    volume_discount_price: r.volume_discount_price ?? null
  }
  for (const d of WEEKDAYS) form[d.key] = Boolean(r[d.key])
  return form
}

export function nextOrder (routes) {
  return (routes || []).reduce((max, r) => Math.max(max, Number(r.order) || 0), 0) + 1
}

/** What is wrong with the form, as { field: message }; empty when it can be saved. */
export function validateRoute (form, routes = []) {
  const errors = {}
  const name = (form.name || '').trim()
  if (!name) errors.name = 'Cal un nom'
  else if (routes.some(r => r.id !== form.id && (r.name || '').trim().toLowerCase() === name.toLowerCase())) {
    errors.name = 'Ja hi ha una ruta amb aquest nom'
  }
  if (!WEEKDAYS.some(d => form[d.key])) errors.days = 'Tria almenys un dia'
  const orders = numberOrNull(form.volume_discount_number_of_orders)
  const price = numberOrNull(form.volume_discount_price)
  if ((orders && !price) || (price && !orders)) {
    errors.volume_discount = 'Cal el nombre de comandes i el descompte, o cap dels dos'
  }
  if (form.is_transfer_route && !form.transfer_pickup) errors.transfer_pickup = 'Tria on van les transferències'
  return errors
}

/** The body saved: trimmed text, numbers, relation ids; a route that doesn't transfer has no transfer point. */
export function routePayload (form) {
  const data = {
    name: form.name.trim(),
    short_name: (form.short_name || '').trim() || null,
    order: numberOrNull(form.order),
    active: Boolean(form.active),
    is_transfer_route: Boolean(form.is_transfer_route),
    transfer_pickup: form.is_transfer_route ? idOf(form.transfer_pickup) : null,
    delivery_user: idOf(form.delivery_user),
    volume_discount_number_of_orders: numberOrNull(form.volume_discount_number_of_orders),
    volume_discount_price: numberOrNull(form.volume_discount_price)
  }
  for (const d of WEEKDAYS) data[d.key] = Boolean(form[d.key])
  return data
}

/** Active routes first, each group by its order, then by name. */
export function sortRoutes (routes) {
  return [...(routes || [])].sort(
    (a, b) =>
      Number(Boolean(b.active)) - Number(Boolean(a.active)) ||
      (a.order ?? Infinity) - (b.order ?? Infinity) ||
      (a.name || '').localeCompare(b.name || '')
  )
}

/** «Dl, Dc, Dv» */
export function routeDaysShort (route) {
  return WEEKDAYS.filter(d => route && route[d.key]).map(d => d.short).join(', ')
}

/**
 * The people a route can be given to: the drivers (`orders_delivery`) when the
 * users come with their permissions, else everyone; the route's current one is
 * always kept.
 */
export function deliveryUserOptions (users, currentId = null) {
  const list = (users || []).filter(u => !u.blocked)
  const withPermissions = list.some(u => Array.isArray(u.permissions))
  const drivers = withPermissions
    ? list.filter(
      u => u.id === currentId || (u.permissions || []).some(p => (p && typeof p === 'object' ? p.permission : p) === 'orders_delivery')
    )
    : list
  return drivers
    .map(u => ({ id: u.id, name: u.fullname || u.username || u.email || `#${u.id}` }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
