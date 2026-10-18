// Which app permissions open each page (issues/121). The side menu
// (service/menu.js) hid the pages a user can't use, but the router only checked
// /admin/*: a member, a driver or an hours-only user opened Tresoreria,
// Bestretes, Persones or Facturar by URL or through links. The router guard and
// the links in shared panels (Novetats) ask this table. Keep it in step with
// the menu and with the API's rules (projectes-v5 services/app-access-rules.js).

const PROJECTS = ['projects']
const HOURS = ['hours']
const ADMIN = ['admin']
const LOGISTICS = ['orders', 'orders_admin', 'orders_delivery']
const STAFF = ['orders_admin', 'orders_delivery']
const OFFICE = ['orders_admin']
const MEMBER = ['orders']
// Taules auxiliars › Logística: the office opens them too (issues/159; keep in
// step with service/adminTables.js OFFICE_TABLES and the API's isAdminOrOffice)
const OFFICE_TABLES = ['pickup', 'delivery-type', 'city', 'route-rate']
const ADMIN_OR_OFFICE = [...ADMIN, ...OFFICE]

// route record path → permissions (any of them opens it)
export const ROUTE_PERMISSIONS = {
  // projects, money and reports
  '/projectes': PROJECTS,
  '/mother-projects': PROJECTS,
  '/project/:id': PROJECTS,
  '/client/:id': PROJECTS,
  '/contacts': PROJECTS,
  '/working-day': PROJECTS,
  '/tasks': PROJECTS,
  '/emitted-invoices': PROJECTS,
  '/received-invoices': PROJECTS,
  '/document/:id/:type': PROJECTS,
  '/invoice/:id/:type': PROJECTS,
  '/pdf/:id/:type': PROJECTS,
  '/quotes': PROJECTS,
  '/quote/:id': PROJECTS,
  '/salary': PROJECTS,
  '/vat': PROJECTS,
  '/tresoreria': PROJECTS,
  '/stats-projectes': PROJECTS,
  '/stats-economic-detail': PROJECTS,
  '/stats-despeses': PROJECTS,
  '/price-hour': PROJECTS,
  '/stats-previsio-gantt': PROJECTS,
  '/stats-real-gantt': PROJECTS,
  '/stats-estrategies': PROJECTS,
  '/stats-intercoop': PROJECTS,
  '/forecast': PROJECTS,
  '/invoicing-forecast': PROJECTS,
  '/dedicacio-saldo': PROJECTS,
  '/dedicacio-summary': PROJECTS,
  '/justifications': PROJECTS,
  '/grants': PROJECTS,
  '/import-export': PROJECTS,
  '/contasol': PROJECTS,
  '/verifactu': PROJECTS,
  '/recalculate': PROJECTS,
  // hours
  '/dedicacio': HOURS,
  '/registre-jornades': HOURS,
  '/stats-dedicacio': [...HOURS, ...PROJECTS],
  '/stats-previsio-hores': [...HOURS, ...PROJECTS],
  '/dedicacio-charts': [...HOURS, ...PROJECTS],
  // logistics
  '/orders': LOGISTICS,
  '/order/view/:id': LOGISTICS,
  '/order/:id': LOGISTICS,
  '/deposits': LOGISTICS,
  '/incidences': LOGISTICS,
  '/user-contacts': LOGISTICS,
  '/contact-user/:id': LOGISTICS,
  // a contact opens from Contactes (projects) and from «Punts d'entrega» (logistics)
  '/contact/:id': [...PROJECTS, ...LOGISTICS],
  '/transfers': STAFF,
  '/order-operations': STAFF,
  '/orders-invoice': OFFICE,
  '/city-route-delivery': OFFICE,
  '/routes': OFFICE,
  '/partners': OFFICE,
  '/orders-stats': OFFICE,
  '/incidences-stats': OFFICE,
  '/city-route': [...MEMBER, ...OFFICE],
  '/route-days': [...MEMBER, ...OFFICE],
  '/pickup-points': [...MEMBER, ...OFFICE],
  '/provider-invoices': MEMBER,
  '/contact-us': MEMBER
}

// pages every logged-in user opens (Inici, her profile, the changelog, the help)
export const OPEN_ROUTES = ['/inici', '/profile', '/changelog', '/documentacio', '/reset-password']

/** The permissions a route record needs: null when any logged-in user may open it. */
export function routePermissions (record, params = {}) {
  if (!record) return null
  if (record.path && record.path.startsWith('/admin/')) {
    const entity = record.path.startsWith('/admin/:entityName') ? params.entityName : record.path.split('/')[2]
    if (OFFICE_TABLES.includes(entity)) return ADMIN_OR_OFFICE
  }
  if (record.path && record.path.startsWith('/admin')) return ADMIN
  if (record.meta && record.meta.requiresPermission) {
    const p = record.meta.requiresPermission
    return Array.isArray(p) ? p : [p]
  }
  return ROUTE_PERMISSIONS[record.path] || null
}

export const userPermissions = user =>
  ((user && user.permissions) || []).map(p => (p && typeof p === 'object' ? p.permission : p)).filter(Boolean)

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
  if (permissions.includes('orders')) return '/orders'
  if (permissions.includes('hours')) return '/dedicacio'
  if (permissions.some(p => LOGISTICS.includes(p))) return '/orders'
  return '/profile'
}

// «/project/555?tab=x» → the record path «/project/:id» it opens
const RECORDS = Object.keys(ROUTE_PERMISSIONS).map(path => ({
  path,
  re: new RegExp('^' + path.replace(/:[^/]+/g, '[^/]+') + '$')
}))

/** Whether a link (a path, as in the changelog) opens for these permissions; unknown permissions (null) open all. */
export function canOpenPath (to, permissions) {
  if (!permissions) return true
  const path = String(to || '').split(/[?#]/)[0]
  if (path.startsWith('/admin')) {
    const entity = path.split('/')[2]
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
