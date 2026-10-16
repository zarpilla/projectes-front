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
      { entity: 'income-type', label: "Tipus d'ingrés" }
    ]
  },
  {
    title: 'Calendari',
    items: [
      { entity: 'year', label: 'Anys' },
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
  }
]

export const ADMIN_TABLES = ADMIN_TABLE_GROUPS.flatMap(g => g.items)

export const isAdminTablePath = path =>
  ADMIN_TABLES.some(t => path === `/admin/${t.entity}` || path.startsWith(`/admin/${t.entity}/`))
