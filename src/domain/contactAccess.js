// Whether a member (orders, no office permission) may change a delivery point,
// the backend's rule (projectes-v5 middlewares/app-permissions.js,
// scopeContactUpdate): hers, linked to her user, shared (multiowner,
// multidelivery), or one she has sent orders to. Opening another member's point
// by URL showed an editable form and saving only said «Error» (issues/182).
const idOf = v => (v && typeof v === 'object' ? v.id : v)

export function memberMayEdit (contact, userId, ordersToIt = 0) {
  if (!contact) return false
  return idOf(contact.owner) === userId ||
    idOf(contact.users_permissions_user) === userId ||
    contact.multiowner === true ||
    contact.multidelivery === true ||
    ordersToIt > 0
}

// the CP the contacts of a town use most (GET cities/postcodes), by its plain name
export const townKey = name =>
  String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
