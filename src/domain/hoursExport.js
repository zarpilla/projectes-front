// Column names and date format of the hours «Exporta» files: Catalan headers
// and dd/mm/yyyy dates (they used the raw keys project_name, username, hours…
// and ISO dates, issues/274).
import moment from 'moment'

export const dmy = (date) => (date ? moment(date, 'YYYY-MM-DD').format('DD/MM/YYYY') : '')

// a numeric cell, as the other exports: the sheet shows it with the
// locale's decimal comma («0,45» as text could not be summed, issues/274)
const number = (v) => {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : ''
}

// % Dedicació real (projects/real-dedications rows)
export const realDedicationFields = {
  Projecte: 'project_name',
  Persona: 'username',
  Hores: { field: 'hours', callback: number },
  Data: { field: 'date', callback: dmy },
  Mes: 'month',
  Any: 'year'
}

// Hores dedicades (DedicationInput rows)
export const dedicatedHoursFields = {
  Data: { field: 'date', callback: dmy },
  Projecte: 'project',
  Persona: 'username',
  Hores: { field: 'hours', callback: number },
  Descripció: 'description',
  Funció: 'activity',
  'Tipus de dedicació': 'type',
  Client: 'client'
}
