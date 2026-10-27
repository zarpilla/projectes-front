// The app's URLs are in Catalan (issues/343). The English (and mixed) ones they
// replaced still arrive from printed order QR labels, e-mails, bookmarks and the
// pins saved on each user (Inici): `currentPath` turns any of them into today's,
// and the router redirects every old path with it.

// old page → new page (a prefix: «/order/15» → «/comanda/15»)
export const RENAMED_PAGES = {
  '/forgotten-password': '/recuperar-clau',
  '/reset-password': '/canviar-clau',
  '/stats-projectes': '/panell-projectes',
  '/mother-projects': '/projectes-mare',
  '/stats-dedicacio': '/panell-dedicacio',
  '/stats-previsio-hores': '/panell-dedicacio',
  '/dedicacio-charts': '/panell-dedicacio',
  '/stats-economic-detail': '/panell-detall-economic',
  '/stats-despeses': '/panell-detall-economic',
  '/price-hour': '/panell-preu-hora',
  '/stats-previsio-gantt': '/panell-previsio-dedicacio',
  '/stats-real-gantt': '/panell-dedicacio-real',
  '/stats-estrategies': '/panell-estrategies',
  '/stats-intercoop': '/panell-intercooperacio',
  '/project': '/projecte',
  '/profile': '/el-meu-compte',
  '/dedicacio-summary': '/resum-hores',
  '/working-day': '/jornada',
  '/salary': '/bestretes',
  '/justifications': '/justificacions',
  '/grants': '/subvencions',
  '/vat': '/iva',
  '/emitted-invoices': '/factures-emeses',
  '/received-invoices': '/factures-rebudes',
  '/quotes': '/pressupostos',
  '/forecast': '/previsio',
  '/invoicing-forecast': '/previsio-facturacio',
  '/contacts': '/contactes',
  '/contact': '/contacte',
  '/client': '/contacte',
  '/user-contacts': '/clientes',
  '/orders': '/comandes',
  '/orders-invoice': '/comandes-per-facturar',
  '/order/view': '/comanda/veure',
  '/order': '/comanda',
  '/city-route': '/poblacions-rutes',
  '/city-route-delivery': '/poblacions-punts-entrega',
  '/route-days': '/rutes-dies',
  '/routes': '/rutes',
  '/pickup-points': '/punts-recollida',
  '/contact-user': '/punt-entrega',
  '/orders-stats': '/estadistiques-comandes',
  '/incidences-stats': '/estadistiques-incidencies',
  '/provider-invoices': '/factures-proveidor',
  '/contact-us': '/contacta',
  '/incidences': '/incidencies',
  '/transfers': '/transferencies',
  '/deposits': '/diposits',
  '/order-operations': '/operacions',
  '/partners': '/usuaries',
  '/tasks': '/tasques',
  '/recalculate': '/recalcul',
  '/changelog': '/novetats',
  '/import-export': '/importar-exportar'
}

// the administration's own screens: old segment → new
const RENAMED_ADMIN = {
  me: 'configuracio',
  users: 'usuaries',
  'face-queue': 'cua-face',
  'verifactu-chain': 'cadena-verifactu',
  backup: 'copia-seguretat',
  'form-submissions': 'missatges'
}

// API entity (Taules auxiliars, AdminEntityList/Form) → its segment in the URL.
// An entity not listed here keeps its API name in the URL.
export const ENTITY_SLUGS = {
  'project-scope': 'ambits-projecte',
  'project-state': 'estats-projecte',
  'project-likelihood': 'probabilitats-projecte',
  'project-type': 'tipus-projecte',
  strategy: 'estrategies',
  'dedication-type': 'tipus-dedicacio',
  'activity-type': 'tipus-activitat',
  'task-state': 'estats-tasca',
  'bank-account': 'comptes-bancaris',
  'payment-method': 'metodes-pagament',
  serie: 'series',
  'expense-type': 'tipus-despesa',
  'income-type': 'tipus-ingres',
  'document-type': 'tipus-document',
  'vat-type': 'tipus-iva',
  product: 'productes',
  year: 'anys',
  festive: 'festius',
  'festive-type': 'tipus-festiu',
  'user-festive': 'festius-usuari',
  'contact-type': 'tipus-contacte',
  'legal-form': 'formes-juridiques',
  region: 'regions',
  sector: 'sectors',
  'social-entity': 'entitats-socials',
  pickup: 'punts-recollida',
  'delivery-type': 'tipus-lliurament',
  city: 'poblacions',
  'route-rate': 'tarifes-ruta',
  'route-pickup-notice': 'avisos-diposit'
}

const SLUG_ENTITIES = Object.fromEntries(Object.entries(ENTITY_SLUGS).map(([entity, slug]) => [slug, entity]))

/** «bank-account» → «comptes-bancaris» (the URL segment of an API entity). */
export const entitySlug = entity => ENTITY_SLUGS[entity] || entity

/** «comptes-bancaris» → «bank-account» (the API entity of a URL segment). */
export const slugEntity = slug => SLUG_ENTITIES[slug] || slug

/** The URL of an entity's admin list, or of one of its rows («nou» for a new one). */
export const entityPath = (entity, id) =>
  `/administracio/${entitySlug(entity)}` + (id === undefined || id === null ? '' : `/${id}`)

// old admin segments: own screens, entity API names, and two Strapi 3 plurals (issues/026)
const OLD_ADMIN = {
  ...RENAMED_ADMIN,
  ...ENTITY_SLUGS,
  'bank-accounts': ENTITY_SLUGS['bank-account'],
  // «regions» is both the Strapi 3 plural and today's segment
  regions: ENTITY_SLUGS.region
}

const PAGE_PREFIXES = Object.keys(RENAMED_PAGES).sort((a, b) => b.length - a.length)

/** The page path of today for an old one, or null when it isn't an old one. */
function renamedPath (path) {
  const page = PAGE_PREFIXES.find(old => path === old || path.startsWith(old + '/'))
  if (page) return RENAMED_PAGES[page] + path.slice(page.length)
  const admin = path.match(/^\/administracio\/([^/]+)(\/.*)?$/)
  if (admin && OLD_ADMIN[admin[1]] && OLD_ADMIN[admin[1]] !== admin[1]) {
    return `/administracio/${OLD_ADMIN[admin[1]]}${(admin[2] || '').replace(/^\/new$/, '/nou')}`
  }
  if (admin && admin[2] === '/new') return `/administracio/${admin[1]}/nou`
  return null
}

/**
 * Today's URL for an app URL: «/order/view/15?x=1» → «/comanda/veure/15?x=1»,
 * «/administracio/bank-account/new» → «/administracio/comptes-bancaris/nou».
 * Current URLs come back unchanged.
 */
export function currentPath (url) {
  const value = String(url || '')
  const cut = value.search(/[?#]/)
  const path = cut < 0 ? value : value.slice(0, cut)
  const renamed = renamedPath(path)
  return renamed === null ? value : renamed + (cut < 0 ? '' : value.slice(cut))
}

/**
 * Router records that send every old path to today's (with its query and hash).
 * `/administracio/:old(...)` only for the old segments, so the generic
 * `/administracio/:entityName` of an unlisted entity keeps working.
 */
export function legacyRoutes () {
  const redirect = to => currentPath(to.fullPath)
  const pages = Object.keys(RENAMED_PAGES).flatMap(old => [
    { path: old, redirect },
    { path: `${old}/:rest(.*)+`, redirect }
  ])
  const segments = Object.keys(OLD_ADMIN).filter(old => OLD_ADMIN[old] !== old)
  const admin = segments.flatMap(old => [
    { path: `/administracio/${old}`, redirect },
    { path: `/administracio/${old}/:rest(.*)+`, redirect }
  ])
  return [...pages, ...admin, { path: '/administracio/:entityName/new', redirect }]
}
