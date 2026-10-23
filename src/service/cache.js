// Session cache of GET responses (issues/097). Catalogs that almost never
// change are always cached; other calls opt in with service({ cached: true }).
// A write through the app to a resource drops its cached reads, and the
// cache is forgotten on logout and on reload, so other users see a catalog
// change at their next login or page load.
//
// issues/327: «who am I» (users/me) and the entity (me) are read once per page
// load too, and identical GETs asked while the first is still on its way share
// it. Every entry is kept per person, so two sessions never share an answer.
export const CATALOGS = [
  'activity-types',
  'dedication-types',
  'document-types',
  'expense-types',
  'festive-types',
  'months',
  'project-likelihoods',
  'project-scopes',
  'project-states',
  'project-types',
  'regions',
  'vat-types',
  'years'
]

// Exact reads (no query) kept for the page load. App.vue asks users/me again
// with { reload: true } on its 15-minute focus refresh.
export const SESSION_READS = ['users/me', 'me']

const entries = new Map()
const inFlight = new Map()

// "/api/users/me" → "users/me"
export const normalizeUrl = url =>
  String(url || '').replace(/^\/+/, '').replace(/^api\//, '')

// "api/project-states/3?x" → "project-states"
export const resourceOf = url => normalizeUrl(url).split(/[/?]/)[0]

export const isCatalog = url => CATALOGS.includes(resourceOf(url))

export const isSessionRead = url => SESSION_READS.includes(normalizeUrl(url))

// The person a JWT belongs to: Strapi 5 access tokens carry `userId` (`id`
// before). A token that can't be read stands for itself.
function personOf (jwt) {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(part))
    const id = payload.userId ?? payload.id
    if (id !== undefined && id !== null) return `user:${id}`
  } catch {
    // not a JWT we can read
  }
  return `jwt:${jwt}`
}

/** Who a request is asked as: anonymous, or the person behind the stored JWT. */
export function identity (requiresAuth) {
  const jwt = requiresAuth ? localStorage.getItem('jwt') : null
  return jwt ? personOf(jwt) : 'anonymous'
}

export const keyOf = (who, url) => `${who} ${normalizeUrl(url)}`

// Callers may change what they get (add a "Tots" option, sort in place…):
// each one gets its own copy, never the cached object.
const copy = response => ({ ...response, data: structuredClone(response.data) })

/**
 * One request for every identical GET asked while it is on its way. Only while
 * it is on its way: once answered, the next call asks again. A lone caller gets
 * the answer itself; when it was shared, every caller gets its own copy.
 */
export function sharedGet (key, load) {
  let entry = inFlight.get(key)
  if (!entry) {
    entry = { callers: 0, promise: load() }
    const forget = () => {
      if (inFlight.get(key) === entry) inFlight.delete(key)
    }
    // registered first, so it runs before any caller sees the answer
    entry.promise.then(forget, forget)
    inFlight.set(key, entry)
  }
  entry.callers++
  const shared = entry
  return shared.promise.then(response => (shared.callers > 1 ? copy(response) : response))
}

/** A write may change any read on its way: later calls ask again. */
export function forgetInFlight () {
  inFlight.clear()
}

function remember (key, url, load) {
  const pending = load().catch(error => {
    if (entries.get(key) && entries.get(key).pending === pending) entries.delete(key)
    throw error
  })
  entries.set(key, { url: normalizeUrl(url), pending })
  return pending
}

export function cachedGet (key, url, load) {
  const entry = entries.get(key)
  return (entry ? entry.pending : remember(key, url, load)).then(copy)
}

/** Ask again and keep the new answer (App.vue's focus refresh of users/me). */
export function reloadCached (key, url, load) {
  return remember(key, url, load).then(copy)
}

export function clearCache (resource) {
  for (const [key, entry] of [...entries]) {
    if (!resource || resourceOf(entry.url) === resource) {
      entries.delete(key)
    }
  }
  if (!resource) forgetInFlight()
}
