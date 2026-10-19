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
