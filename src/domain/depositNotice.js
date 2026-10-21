// The deposit conditions shown in the order form when the member picks the
// warehouse she leaves the parcel at (issues/313): «Avisos de dipòsit» are set
// per destination route(s) and origin warehouse in Taules auxiliars › Logística.
// The most concrete notice wins: route and warehouse, then route only, then
// warehouse only, then one for every route and warehouse; without any, the
// warehouse's own text (pickup.message), as before.

const idOf = v => (v && typeof v === 'object' ? v.id : v)

/**
 * @param {object} args
 * @param {number|null} args.route   the order's route id
 * @param {number|null} args.pickup  the chosen warehouse (pickup) id
 * @param {object[]} args.notices    route-pickup-notices, routes and pickup populated
 * @param {object[]} args.pickups    the pickups, for the warehouse's own text
 * @returns {string} the text to show, '' for none
 */
export function depositNotice ({ route, pickup, notices = [], pickups = [] }) {
  if (!pickup) return ''
  let best = null
  let bestScore = -1
  for (const n of notices || []) {
    const text = (n.message || '').trim()
    if (!text) continue
    const routes = (n.routes || []).map(idOf)
    const noticePickup = idOf(n.pickup)
    if (routes.length && !(route && routes.includes(route))) continue
    if (noticePickup && noticePickup !== pickup) continue
    const score = (routes.length ? 2 : 0) + (noticePickup ? 1 : 0)
    if (score > bestScore || (score === bestScore && n.id < best.id)) {
      best = { id: n.id, text }
      bestScore = score
    }
  }
  if (best) return best.text
  const own = (pickups || []).find(p => p.id === pickup)
  return (own && own.message) || ''
}
