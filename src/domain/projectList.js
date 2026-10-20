// The projects list (Home.vue) in name order whatever the case and accents:
// lodash's sortBy put ACTGI, AKIS, APACAT before Adrinoc, and a filter change
// listed them by id (issues/257).
const collator = new Intl.Collator('ca', { sensitivity: 'base', numeric: true })

export const sortProjectsByName = projects =>
  [...(projects || [])].sort((a, b) => collator.compare(a.name || '', b.name || ''))
