// The delivery points of the order form (issues/215). «Nom comercial» is not
// required in Contactes (only name and phone), so a point without trade name
// is a normal one: it reads as its name, and the search does not crash on it.

/** What a point is called: its trade name, else its name. */
export const contactName = contact =>
  (contact && (contact.trade_name || contact.name)) || ''

/** The label of the point search: «Trade name (id)». */
export const contactLabel = contact => `${contactName(contact)} (${contact.id})`

const text = value => (value === null || value === undefined ? '' : String(value).toLowerCase())

/** The point search: by label, name, trade name or id; empty fields skipped. */
export function matchesContact (contact, search) {
  const q = text(search)
  return [contact.display, contact.name, contact.trade_name, contact.id].some(
    value => value !== null && value !== undefined && text(value).indexOf(q) >= 0
  )
}

// «Nom comercial» is required on delivery points (the user's decision,
// 2026-10-19, issues/215; the API refuses a point without it too). Other
// contacts don't need it; the old points without one read as their name.
export const TRADE_NAME_REQUIRED = "El nom comercial és obligatori als punts d'entrega"

const idOf = value => (value && typeof value === 'object' ? value.id : value)

/** A delivery point: a contact with an owner (the member it delivers for). */
export const isDeliveryPoint = contact => Boolean(contact && idOf(contact.owner))

/** A delivery point without trade name (blank counts as none). */
export const missingTradeName = contact =>
  isDeliveryPoint(contact) && !String(contact.trade_name || '').trim()

/** A CSV row of contacts: a point when it has an owner or is a points file. */
export const importRowMissingTradeName = (record, pointsFile = false) =>
  missingTradeName({ owner: pointsFile || record.owner_id, trade_name: record.trade_name })
