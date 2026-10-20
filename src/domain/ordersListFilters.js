// Query strings of the orders list (/orders) filters.

/**
 * The Sòcia dropdown. Addressed as `owner.id` so it merges with the Sòcia
 * column filter (`owner.fullname_contains`) into one relation filter: a bare
 * `owner` next to it mixed an id with operators and the API answered 500
 * (issues/241).
 */
export function ownerWhere (ownerId) {
  return ownerId ? [`_where[owner.id]=${ownerId}`] : []
}
