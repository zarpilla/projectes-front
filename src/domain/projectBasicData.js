import moment from 'moment'

// The project's Dades: Codi, Estat, Àmbit, Coordina and both dates are
// required, and the end can't come before the start (issues/212: a final date
// of 01/01/2025 with a start of 01/01/2026 was saved as «Guardat»).
export const PROJECT_REQUIRED_MESSAGE =
  'Error. Codi, Estat, Àmbit, Coordina, Data Inici i Data Final són dades obligatòries'
export const PROJECT_DATES_MESSAGE =
  "Error. La data final no pot ser anterior a la data d'inici"
export const REQUIRED_FIELD_MESSAGE = 'Cal omplir aquest camp'

export function missingProjectBasicData (form) {
  return !form.name ||
    !form.date_start ||
    !form.date_end ||
    form.project_state.id === 0 ||
    form.project_scope.id === 0 ||
    form.leader.id === 0
}

export function projectEndBeforeStart (form) {
  if (!form.date_start || !form.date_end) return false
  return moment(form.date_end).isBefore(moment(form.date_start), 'day')
}

// The message refusing the save, or null when the basic data is fine
export function projectBasicDataError (form) {
  if (missingProjectBasicData(form)) return PROJECT_REQUIRED_MESSAGE
  if (projectEndBeforeStart(form)) return PROJECT_DATES_MESSAGE
  return null
}
