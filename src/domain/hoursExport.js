// Column names and date format of the hours «Exporta» files: Catalan headers
// and dd/mm/yyyy dates (they used the raw keys project_name, username, hours…
// and ISO dates, issues/274).
import moment from 'moment'

export const dmy = (date) => (date ? moment(date, 'YYYY-MM-DD').format('DD/MM/YYYY') : '')

// decimal comma, as the other exports
const decimal = (v) => (v === null || v === undefined ? '' : String(v).replace('.', ','))

// % Dedicació real (projects/real-dedications rows)
export const realDedicationFields = {
  Projecte: 'project_name',
  Persona: 'username',
  Hores: { field: 'hours', callback: decimal },
  Data: { field: 'date', callback: dmy },
  Mes: 'month',
  Any: 'year'
}

// Hores dedicades (DedicationInput rows)
export const dedicatedHoursFields = {
  Data: { field: 'date', callback: dmy },
  Projecte: 'project',
  Persona: 'username',
  Hores: { field: 'hours', callback: decimal },
  Descripció: 'description',
  Funció: 'activity',
  'Tipus de dedicació': 'type',
  Client: 'client'
}
