// Session cache of GET responses (issues/097). Catalogs that almost never
// change are always cached; other calls opt in with service({ cached: true }).
// A write through the app to a resource drops its cached reads, and the
// cache is forgotten on logout and on reload, so other users see a catalog
// change at their next login or page load.
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

const entries = new Map()

// "api/project-states/3?x" → "project-states"
export const resourceOf = url =>
  String(url || '').replace(/^\/+/, '').replace(/^api\//, '').split(/[/?]/)[0]

export const isCatalog = url => CATALOGS.includes(resourceOf(url))

// Callers may change what they get (add a "Tots" option, sort in place…):
// each one gets its own copy, never the cached object.
const copy = response => ({ ...response, data: structuredClone(response.data) })

export function cachedGet (url, load) {
  if (!entries.has(url)) {
    const pending = load().catch(error => {
      entries.delete(url)
      throw error
    })
    entries.set(url, pending)
  }
  return entries.get(url).then(copy)
}

export function clearCache (resource) {
  for (const url of [...entries.keys()]) {
    if (!resource || resourceOf(url) === resource) {
      entries.delete(url)
    }
  }
}
