/**
 * Strapi v3 → v5 transport compatibility layer.
 *
 * The v5 backend (`projectes-v5`) already accepts the v3 *query* conventions the
 * views send (`_limit`, `_start`, `_sort`, `_q`, `_where[...]`, flat field
 * operators) — see `src/services/query-adapter.js` there. What is left are the
 * pure transport differences between Strapi 3.6 and Strapi 5, and this module
 * absorbs all of them so the 118 view/component files keep their v3 call style:
 *
 *   1. every REST route moved under `/api`
 *   2. core create/update take a `{ data: … }` request envelope
 *   3. core find/findOne answer with a `{ data, meta }` response envelope
 *   4. `/count` endpoints are gone (v5 reports totals in `meta.pagination.total`)
 *   5. timestamps are camelCase (`createdAt`) instead of snake_case (`created_at`)
 *   6. errors are `{ error: { status, name, message } }` instead of
 *      `{ statusCode, error, message }`
 *
 * Everything here is a pure function; `service/index.js` only wires it into the
 * axios interceptors.
 */

export const API_PREFIX = 'api/'

/** Absolute URLs bypass `baseURL`, so they bypass the mapping too. */
const ABSOLUTE_URL = /^([a-z][a-z0-9+.-]*:)?\/\//i

/**
 * Route families that kept the v3 payload shape in v5: the users-permissions
 * and upload plugins take and return plain objects, with no `data` envelope on
 * either side. They still move under `/api`.
 */
const FLAT_PAYLOAD_ROOTS = ['auth', 'users', 'users-permissions', 'upload', 'connect']

/**
 * Single types are served at `/api/<singularName>` — a *one* segment PUT, which
 * would otherwise be indistinguishable from a custom collection action. Their
 * update does take the `data` envelope, so they need naming explicitly.
 */
const SINGLE_TYPES = ['me', 'verifactu', 'config', 'home-menu']

/** v5 ids: the numeric ids the ETL preserved, or a v5 documentId. */
const ID_SEGMENT = /^(\d+|[a-z0-9]{20,})$/i

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** Splits `contacts/basic?_limit=-1` into `['contacts/basic', '_limit=-1']`. */
function splitQuery (url) {
  const i = url.indexOf('?')
  return i === -1 ? [url, ''] : [url.slice(0, i), url.slice(i + 1)]
}

/**
 * Describes what a request URL means in v5 terms.
 *
 * @param {string} method  lowercase HTTP verb
 * @param {string} url     the URL as the view wrote it (v3 style, relative)
 * @returns {{url:string, isCount:boolean, wrapBody:boolean, unwrap:boolean}}
 */
export function mapRequest (method, url) {
  const raw = String(url == null ? '' : url)
  if (ABSOLUTE_URL.test(raw)) {
    return { url: raw, isCount: false, wrapBody: false, unwrap: false }
  }

  let [path, query] = splitQuery(raw)
  path = path.replace(/^\/+/, '').replace(/\/+$/, '')
  if (path.startsWith(API_PREFIX)) path = path.slice(API_PREFIX.length)

  const segments = path.split('/').filter(Boolean)
  const root = segments[0] || ''
  const flat = FLAT_PAYLOAD_ROOTS.indexOf(root) !== -1

  // v5 dropped `/count`. Emulate it as a 1-row list read whose total comes back
  // in `meta.pagination.total` (`withCount` is on globally in config/api.js).
  const isCount = !flat && segments.length === 2 && segments[1] === 'count'
  if (isCount) {
    segments.pop()
    query = stripParams(query, ['_limit', '_start'])
    query = appendParams(query, '_start=0&_limit=1')
  }

  const wrapBody = !flat && (
    (method === 'post' && segments.length === 1) ||
    (method === 'put' && segments.length === 2 && ID_SEGMENT.test(segments[1])) ||
    (method === 'put' && segments.length === 1 && SINGLE_TYPES.indexOf(root) !== -1)
  )

  const mapped = API_PREFIX + segments.join('/')
  return {
    url: query ? `${mapped}?${query}` : mapped,
    isCount,
    wrapBody,
    unwrap: !flat
  }
}

function stripParams (query, names) {
  if (!query) return query
  return query
    .split('&')
    .filter((pair) => pair && names.indexOf(pair.split('=')[0]) === -1)
    .join('&')
}

function appendParams (query, extra) {
  return query ? `${query}&${extra}` : extra
}

/**
 * v5 core create/update reject a body without a `data` key
 * ("Missing \"data\" payload in the request body"). Custom endpoints — every
 * route with an action segment, e.g. `orders/pdf` or `contacts/unify` — read
 * `ctx.request.body` flat and must NOT be wrapped.
 */
export function wrapRequestBody (body) {
  if (body === undefined || body === null) return body
  if (typeof FormData !== 'undefined' && body instanceof FormData) return body
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body
  if (typeof body === 'string') return body
  if (isPlainObject(body) && Object.prototype.hasOwnProperty.call(body, 'data') &&
      Object.keys(body).length === 1) {
    return body // already an envelope (a caller that speaks v5 natively)
  }
  return { data: body }
}

/**
 * True for a Strapi v5 response envelope: exactly `{ data, meta }`, with `meta`
 * an object. Custom controllers in this project return bare arrays/objects, so
 * anything else is passed through untouched.
 */
export function isEnvelope (payload) {
  if (!isPlainObject(payload)) return false
  const keys = Object.keys(payload)
  if (keys.length !== 2) return false
  if (keys.indexOf('data') === -1 || keys.indexOf('meta') === -1) return false
  return isPlainObject(payload.meta)
}

// `publishedAt` is deliberately NOT aliased: no view reads `published_at`, and
// echoing it back in a save body is what makes Strapi split a Draft & Publish
// row in two and renumber it. The one view that writes it (ProjectsTable's
// "trash") sets `published_at` explicitly, which the backend still honours.
const TIMESTAMP_ALIASES = [
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at']
]

/**
 * v5 renamed the automatic timestamps to camelCase; ~54 call sites still read
 * the v3 snake_case names. Add the aliases in place (cheap — the payload was
 * just parsed from JSON, so it is a fresh tree and cannot contain cycles).
 */
export function addTimestampAliases (payload, depth = 0) {
  if (depth > 12 || payload === null || typeof payload !== 'object') return payload
  if (Array.isArray(payload)) {
    for (let i = 0; i < payload.length; i++) addTimestampAliases(payload[i], depth + 1)
    return payload
  }
  for (let i = 0; i < TIMESTAMP_ALIASES.length; i++) {
    const [camel, snake] = TIMESTAMP_ALIASES[i]
    if (payload[camel] !== undefined && payload[snake] === undefined) {
      payload[snake] = payload[camel]
    }
  }
  const keys = Object.keys(payload)
  for (let i = 0; i < keys.length; i++) {
    const value = payload[keys[i]]
    if (value !== null && typeof value === 'object') addTimestampAliases(value, depth + 1)
  }
  return payload
}

/**
 * v3 error bodies were `{ statusCode, error, message }`; v5 answers
 * `{ data: null, error: { status, name, message, details } }`.
 *
 * Nearly every catch block reads `error.response.data.message` as a string, so
 * keep the v5 body and add the v3 aliases on top of it. (The one view that read
 * the nested users-permissions form, views/Login.vue, reads the string now.)
 */
export function normalizeErrorBody (body) {
  if (!isPlainObject(body)) return body
  const err = isPlainObject(body.error) ? body.error : null
  if (!err) return body
  return {
    ...body,
    statusCode: err.status,
    message: typeof err.message === 'string' ? err.message : String(err.name || 'Error')
  }
}
