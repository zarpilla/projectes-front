import moment from 'moment'

// The projects lists' «Exporta» had the row keys as headers (id, name,
// estimated_hours…) and ISO dates (2019-09-02) (issues/212). These map Catalan
// headers to the row keys, for <download-excel :fields>.
export const PROJECTS_EXPORT_FIELDS = {
  'ID': 'id',
  'Codi': 'name',
  'Estat': 'state',
  'Àmbit': 'scope',
  'Coordina': 'leader',
  'Data inici': 'date_start',
  'Data final': 'date_end',
  'Projecte mare': 'mother',
  'Hores previstes': 'estimated_hours',
  'Hores reals': 'real_hours',
  'Ingressos previstos': 'estimated_incomes',
  'Despeses previstes': 'estimated_expenses',
  'Cost hores previst': 'estimated_hours_price',
  'IVA no deduïble previst': 'estimated_expenses_vat',
  'Resultat previst': 'estimated_result',
  'Ingressos reals': 'real_incomes',
  'Despeses reals': 'real_expenses',
  'Cost hores real': 'real_hours_price',
  'IVA no deduïble real': 'real_expenses_vat',
  'Resultat real': 'real_result'
}

// Only the headers of the keys the rows have, in the same order
export function projectsExportFields (keys) {
  const fields = {}
  Object.entries(PROJECTS_EXPORT_FIELDS).forEach(([label, key]) => {
    if (keys.includes(key)) fields[label] = key
  })
  return fields
}

export function exportDate (value) {
  return value ? moment(value).format('DD/MM/YYYY') : ''
}
