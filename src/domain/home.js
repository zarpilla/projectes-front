// Inici (mockup docs/redisseny-v2/screens/A-Inici.html): the menu entries each
// person pins with a star, in their order, and the page they open after login.
// Kept on the person's user (GET/PUT users/me/home, stores/homePins.js), with a
// copy in this browser's localStorage, one key per person, so the login can
// choose the page at once and an API without the endpoint still works.
import { hasMenuPermission } from '@/service/menu'
import { canOpenPath, landingPath } from '@/domain/routeAccess'
import { currentPath } from '@/router/paths'

export const HOME_PATH = '/inici'

// the members' «Avisos» (issues/354, 355): route closures with their reason and
// substitute route, the coming holidays and the unpaid invoices. A member (only
// `orders`, no staff or projects permission) lands there after login.
export const BOARD_PATH = '/avisos'
const NOT_MEMBER_ONLY = ['projects', 'admin', 'orders_admin', 'orders_delivery']
export const isMemberOnly = permissions =>
  Array.isArray(permissions) && permissions.includes('orders') && !permissions.some(p => NOT_MEMBER_ONLY.includes(p))

// what «En entrar, obre» can be
export const LANDINGS = ['home', 'usual', 'first']

export const homeKey = me => `home:${me}`

// a first visit: four entries of what the person can open
const DEFAULT_PINS = [
  '/projectes', '/dedicacio', '/tasques', '/factures-emeses',
  '/comandes', '/incidencies', '/operacions', '/rutes-dies'
]

/** The pinnable menu entries (a path to open), grouped as in the side menu. */
export function menuGroups (menu, permissions) {
  const groups = []
  for (let i = 0; i < menu.length; i += 2) {
    const label = menu[i]
    const items = (menu[i + 1] || []).filter(item => item && item.to && item.to !== HOME_PATH && hasMenuPermission(item, permissions))
    if (label && items.length) groups.push({ label, items })
  }
  return groups
}

export function defaultPrefs (allowedPaths) {
  return { pins: DEFAULT_PINS.filter(p => allowedPaths.includes(p)).slice(0, 4), landing: 'home' }
}

/** A saved choice (the API's or the local copy), cleaned up; null when there is none. */
export function parsePrefs (raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data || !Array.isArray(data.pins)) return null
    // pins saved before issues/343 carry the old English URLs
    const pins = [...new Set(data.pins.filter(p => typeof p === 'string' && p).map(currentPath))]
    return { pins, landing: LANDINGS.includes(data.landing) ? data.landing : 'home' }
  } catch {
    return null
  }
}

/** The local copy. */
export function readPrefs (me) {
  if (!me) return null
  try {
    return parsePrefs(localStorage.getItem(homeKey(me)))
  } catch {
    return null
  }
}

export function writePrefs (me, prefs) {
  if (!me) return false
  try {
    localStorage.setItem(homeKey(me), JSON.stringify({ pins: prefs.pins, landing: prefs.landing }))
    return true
  } catch {
    // private window: kept for this visit only
    return false
  }
}

/** Pinned entries the person may open now; the others stay saved, hidden. */
export function visiblePins (pins, permissions) {
  return (pins || []).filter(p => canOpenPath(p, permissions))
}

/** Where to go after login (or from the login page with a session). */
export function landingFor (prefs, permissions) {
  if (isMemberOnly(permissions)) return BOARD_PATH
  const usual = landingPath(permissions)
  const landing = prefs ? prefs.landing : 'home'
  if (landing === 'usual') return usual
  if (landing === 'first') return visiblePins(prefs.pins, permissions)[0] || HOME_PATH
  return HOME_PATH
}

/** Where this person goes after login, by their saved choice (the local copy). */
export const landingForUser = (me, permissions) => landingFor(readPrefs(me), permissions)

/** A pinned path moved by `delta` places (drag or the arrow buttons). */
export function movePin (pins, path, delta) {
  const from = pins.indexOf(path)
  const to = from + delta
  if (from < 0 || to < 0 || to >= pins.length) return pins
  const next = pins.slice()
  next.splice(from, 1)
  next.splice(to, 0, path)
  return next
}

/** `path` dropped just before `before`. */
export function dropPin (pins, path, before) {
  if (path === before || !pins.includes(path) || !pins.includes(before)) return pins
  const next = pins.filter(p => p !== path)
  next.splice(next.indexOf(before), 0, path)
  return next
}

/**
 * The name Inici greets with (issues/367): the user's `display_name`; without
 * it, a member (`orders` only, an organisation or shop) gets the whole name
 * («La Dotzena», not «La») and everyone else the first word of it.
 */
export function greetingName (user, fallback = '') {
  const display = String((user && user.display_name) || '').trim()
  if (display) return display
  const full = String((user && user.fullname) || (user && user.username) || fallback || '').trim().replace(/\s+/g, ' ')
  if (!full) return ''
  const codes = ((user && user.permissions) || []).map(p => (p && typeof p === 'object' ? p.permission : p)).filter(Boolean)
  const member = codes.length > 0 && codes.every(c => c === 'orders')
  return member ? full : full.split(' ')[0]
}
