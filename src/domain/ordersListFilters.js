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

const pad = n => String(n).padStart(2, '0')

/**
 * A date column filter (Prevista, Lliurada): «aaaa» (or «aaaa-») is the whole
 * year, «aaaa-mm» (or «aaaa-m») the whole month and «aaaa-mm-dd» that day.
 * Partial or invalid input gives no condition until it is a valid date
 * (issues/247).
 */
export function dateFilterWhere (key, raw) {
  const value = (raw || '').trim()
  let m = value.match(/^(\d{4})-?$/)
  if (m) return [`_where[${key}_gte]=${m[1]}-01-01`, `_where[${key}_lte]=${m[1]}-12-31`]
  m = value.match(/^(\d{4})-(\d{1,2})-?$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2])
    if (month < 1 || month > 12) return []
    // day 0 of the next month: the last day of this one, in that year
    const last = new Date(year, month, 0).getDate()
    return [`_where[${key}_gte]=${m[1]}-${pad(month)}-01`, `_where[${key}_lte]=${m[1]}-${pad(month)}-${pad(last)}`]
  }
  m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return []
    return [`_where[${key}_eq]=${m[1]}-${pad(month)}-${pad(day)}`]
  }
  return []
}
