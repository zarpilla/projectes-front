// Which app permissions open each page (issues/121). The side menu
// (service/menu.js) hid the pages a user can't use, but the router only checked
// /administracio/*: a member, a driver or an hours-only user opened Tresoreria,
// Bestretes, Persones or Facturar by URL or through links. The router guard and
// the links in shared panels (Novetats) ask this table. Keep it in step with
// the menu and with the API's rules (projectes-v5 services/app-access-rules.js).

import { slugEntity } from '@/router/paths'

const PROJECTS = ['projects']
const HOURS = ['hours']
const ADMIN = ['admin']
const LOGISTICS = ['orders', 'orders_admin', 'orders_delivery']
const STAFF = ['orders_admin', 'orders_delivery']
const OFFICE = ['orders_admin']
const MEMBER = ['orders']
const ENERGY = ['admin_energy']
// Taules auxiliars › Logística: the office opens them too (issues/159; keep in
// step with service/adminTables.js OFFICE_TABLES and the API's isAdminOrOffice)
const OFFICE_TABLES = ['pickup', 'delivery-type', 'city', 'route-rate', 'route-pickup-notice']
const ADMIN_OR_OFFICE = [...ADMIN, ...OFFICE]

// route record path → permissions (any of them opens it)
export const ROUTE_PERMISSIONS = {
  // projects, money and reports
  '/projectes': PROJECTS,
  '/projectes-mare': PROJECTS,
  '/projecte/:id': PROJECTS,
  '/contactes': PROJECTS,
  '/jornada': PROJECTS,
  '/tasques': PROJECTS,
  '/factures-emeses': PROJECTS,
  '/factures-rebudes': PROJECTS,
  '/document/:id/:type': PROJECTS,
  '/pressupostos': PROJECTS,
  '/bestretes': PROJECTS,
  '/iva': PROJECTS,
  '/irpf': PROJECTS,
  '/tresoreria': PROJECTS,
  '/panell-projectes': PROJECTS,
  '/panell-detall-economic': PROJECTS,
  '/panell-preu-hora': PROJECTS,
  '/panell-previsio-dedicacio': PROJECTS,
  '/panell-dedicacio-real': PROJECTS,
  '/panell-estrategies': PROJECTS,
  '/panell-intercooperacio': PROJECTS,
  '/previsio': PROJECTS,
  '/previsio-facturacio': PROJECTS,
  '/dedicacio-saldo': PROJECTS,
  '/resum-hores': PROJECTS,
  '/justificacions': PROJECTS,
  '/subvencions': PROJECTS,
  '/importar-exportar': PROJECTS,
  '/contasol': PROJECTS,
  '/verifactu': PROJECTS,
  '/recalcul': PROJECTS,
  // hours
  '/dedicacio': HOURS,
  '/registre-jornades': HOURS,
  '/panell-dedicacio': [...HOURS, ...PROJECTS],
  // logistics
  '/comandes': LOGISTICS,
  '/comanda/veure/:id': LOGISTICS,
  '/comanda/:id': LOGISTICS,
  '/diposits': LOGISTICS,
  '/incidencies': LOGISTICS,
  '/clientes': LOGISTICS,
  '/punt-entrega/:id': LOGISTICS,
  // a contact opens from Contactes (projects) and from «Punts d'entrega» (logistics)
  '/contacte/:id': [...PROJECTS, ...LOGISTICS],
  '/transferencies': STAFF,
  '/operacions': STAFF,
  '/comandes-per-facturar': OFFICE,
  '/poblacions-punts-entrega': OFFICE,
  '/rutes': OFFICE,
  '/usuaries': OFFICE,
  '/estadistiques-comandes': OFFICE,
  '/estadistiques-incidencies': OFFICE,
  '/poblacions-rutes': [...MEMBER, ...OFFICE],
  '/rutes-dies': [...MEMBER, ...OFFICE],
  // the logistics simulator (issues/361)
  '/simulador-logistic': [...MEMBER, ...OFFICE],
  '/punts-recollida': [...MEMBER, ...OFFICE],
  '/factures-proveidor': MEMBER,
  '/contacta': MEMBER,
  // comunitat energètica (projectes-v5 api/energy: admin_energy and full access)
  '/energia/socies': ENERGY,
  '/energia/socia/:id': ENERGY,
  '/energia/installacions': ENERGY
}

// pages every logged-in user opens (Inici, her profile, the changelog, the help)
export const OPEN_ROUTES = ['/inici', '/el-meu-compte', '/novetats', '/documentacio', '/canviar-clau']

/** The permissions a route record needs: null when any logged-in user may open it. */
export function routePermissions (record, params = {}) {
  if (!record) return null
  if (record.path && record.path.startsWith('/administracio/')) {
    const entity = slugEntity(record.path.startsWith('/administracio/:entityName') ? params.entityName : record.path.split('/')[2])
    if (OFFICE_TABLES.includes(entity)) return ADMIN_OR_OFFICE
  }
  if (record.path && record.path.startsWith('/administracio')) return ADMIN
  if (record.meta && record.meta.requiresPermission) {
    const p = record.meta.requiresPermission
    return Array.isArray(p) ? p : [p]
  }
  return ROUTE_PERMISSIONS[record.path] || null
}

export const userPermissions = user =>
  ((user && user.permissions) || []).map(p => (p && typeof p === 'object' ? p.permission : p)).filter(Boolean)

/**
 * The members (`orders`) of a `GET /users` list. The API hands a member the
 * other users without their permissions (issues/165), and reading
 * `u.permissions.map` crashed Comandes, the order form, Punts d'entrega and
 * Contacta for members (issues/184): users whose permissions didn't come stay,
 * the member screens narrow the list to the member herself anyway.
 */
export const orderMembers = users =>
  (users || []).filter(u => !Array.isArray(u.permissions) || userPermissions(u).includes('orders'))

/** Whether a user with these permissions may open every matched record of a route. */
export function canOpen (matched, permissions, params = {}) {
  return (matched || []).every(record => {
    const needed = routePermissions(record, params)
    return !needed || needed.some(p => permissions.includes(p))
  })
}

/**
 * Whether the hours screens (Hores dedicades, Registre jornades) let her pick
 * another person: only `projects` and `admin`. The API gives a worker (`hours`)
 * only her own rows (issues/099). Unknown permissions (null) keep the picker.
 */
export const canPickPerson = permissions =>
  !permissions || permissions.includes('projects') || permissions.includes('admin')

/** Where a user lands after login, or when a page is not hers. */
export function landingPath (permissions) {
  if (permissions.includes('projects')) return '/projectes'
  if (permissions.includes('orders')) return '/comandes'
  if (permissions.includes('hours')) return '/dedicacio'
  if (permissions.some(p => LOGISTICS.includes(p))) return '/comandes'
  if (permissions.includes('admin_energy')) return '/energia/socies'
  return '/el-meu-compte'
}

// «/projecte/555?tab=x» → the record path «/projecte/:id» it opens
const RECORDS = Object.keys(ROUTE_PERMISSIONS).map(path => ({
  path,
  re: new RegExp('^' + path.replace(/:[^/]+/g, '[^/]+') + '$')
}))

/** Whether a link (a path, as in the changelog) opens for these permissions; unknown permissions (null) open all. */
export function canOpenPath (to, permissions) {
  if (!permissions) return true
  const path = String(to || '').split(/[?#]/)[0]
  if (path.startsWith('/administracio')) {
    const entity = slugEntity(path.split('/')[2])
    return permissions.includes('admin') || (OFFICE_TABLES.includes(entity) && permissions.includes('orders_admin'))
  }
  const record = RECORDS.find(r => r.re.test(path))
  return !record || canOpen([{ path: record.path, meta: {} }], permissions)
}

/** The permissions of the user stored by the login, or null while they are not loaded. */
export function storedPermissions () {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    return user && Array.isArray(user.permissions) ? userPermissions(user) : null
  } catch (e) {
    return null
  }
}
