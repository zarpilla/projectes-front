// The auxiliary tables of the administration (the lists behind the app's selects),
// grouped as in "Taules auxiliars". Each is edited with AdminEntityList/Form at
// #/admin/<entity>.
export const ADMIN_TABLE_GROUPS = [
  {
    title: 'Projectes',
    items: [
      { entity: 'project-scope', label: 'Àmbits de projecte' },
      { entity: 'project-state', label: 'Estats de projecte' },
      { entity: 'project-likelihood', label: 'Probabilitats de projecte' },
      { entity: 'project-type', label: 'Tipus de projecte' },
      { entity: 'strategy', label: 'Estratègies' },
      { entity: 'dedication-type', label: 'Tipus de dedicació' },
      { entity: 'activity-type', label: "Tipus d'activitat" },
      { entity: 'task-state', label: 'Estats de tasca' }
    ]
  },
  {
    title: 'Diners',
    items: [
      { entity: 'bank-account', label: 'Comptes bancaris' },
      { entity: 'payment-method', label: 'Mètodes de pagament' },
      { entity: 'serie', label: 'Sèries' },
      { entity: 'expense-type', label: 'Tipus de despesa' },
      { entity: 'income-type', label: "Tipus d'ingrés" },
      { entity: 'document-type', label: 'Tipus de document' },
      { entity: 'vat-type', label: "Tipus d'IVA" },
      { entity: 'product', label: 'Productes' }
    ]
  },
  {
    title: 'Calendari',
    items: [
      { entity: 'year', label: 'Anys' },
      // the holidays for everyone, also set from Hores dedicades (issues/310)
      { entity: 'festive', label: 'Festius de totes' },
      { entity: 'festive-type', label: 'Tipus de festiu' },
      { entity: 'user-festive', label: "Festius d'usuari" }
    ]
  },
  {
    title: 'Contactes',
    items: [
      { entity: 'contact-type', label: 'Tipus de contacte' },
      { entity: 'legal-form', label: 'Formes jurídiques' },
      { entity: 'region', label: 'Regions' },
      { entity: 'sector', label: 'Sectors' },
      { entity: 'social-entity', label: 'Entitats socials' }
    ]
  },
  {
    // only for entities with logistics: shown to people with a logistics permission
    title: 'Logística',
    permissions: ['orders', 'orders_admin', 'orders_delivery'],
    items: [
      { entity: 'pickup', label: 'Punts de recollida' },
      { entity: 'delivery-type', label: 'Tipus de lliurament' },
      { entity: 'city', label: 'Poblacions' },
      { entity: 'route-rate', label: 'Tarifes de ruta' },
      // issues/313
      { entity: 'route-pickup-notice', label: 'Avisos de dipòsit' }
    ]
  }
]

// What the logistics office (orders_admin) opens without being an admin (issues/159)
export const OFFICE_TABLES = ['pickup', 'delivery-type', 'city', 'route-rate', 'route-pickup-notice']

// The groups a person with these app permissions sees: an admin all of them
// (Logística with logistics), the office only the Logística tables
export const adminTableGroupsFor = permissions => {
  const has = p => (permissions || []).includes(p)
  if (!has('admin')) {
    if (!has('orders_admin')) return []
    return ADMIN_TABLE_GROUPS
      .map(g => ({ ...g, items: g.items.filter(t => OFFICE_TABLES.includes(t.entity)) }))
      .filter(g => g.items.length)
  }
  return ADMIN_TABLE_GROUPS.filter(g => !g.permissions || g.permissions.some(has))
}

export const ADMIN_TABLES = ADMIN_TABLE_GROUPS.flatMap(g => g.items)

const tablePath = (path, entity) => path === `/admin/${entity}` || path.startsWith(`/admin/${entity}/`)

export const isAdminTablePath = path => ADMIN_TABLES.some(t => tablePath(path, t.entity))

export const isOfficeTablePath = path => OFFICE_TABLES.some(entity => tablePath(path, entity))
