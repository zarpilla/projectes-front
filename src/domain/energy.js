// Comunitat energètica: helpers of the members, CUPS and coefficients screens
// (views/Energy*.vue). The API (projectes-v5 api/energy) keeps the history and
// checks the CUPS too; these give the screens the same answers while typing.

const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'
const SHAPE = /^ES(\d{16})([A-Z]{2})(\d[A-Z])?$/

/** «es 0336 0000 0025 7360 hb» → «ES0336000000257360HB»; «…GWOF» → «…GW0F» (projectes-v5 services/energy-cups.js). */
export function normalizeCups (value) {
  let cups = String(value == null ? '' : value).toUpperCase().replace(/[\s.\-_]/g, '')
  if (/^ES\d{16}[A-Z]{2}O[A-Z]$/.test(cups)) cups = `${cups.slice(0, 20)}0${cups.slice(21)}`
  return cups
}

/** { cups, valid, reason }: ES + 16 digits + the 2 control letters (16 digits mod 529) + optional border point. */
export function checkCups (value) {
  const cups = normalizeCups(value)
  if (!cups) return { cups, valid: false, reason: 'Falta el CUPS' }
  const match = SHAPE.exec(cups)
  if (!match) return { cups, valid: false, reason: 'El CUPS ha de ser ES + 16 xifres + 2 lletres (i opcionalment 1 xifra i 1 lletra)' }
  const r = Number(BigInt(match[1]) % 529n)
  const expected = LETTERS[Math.floor(r / 23)] + LETTERS[r % 23]
  if (expected !== match[2]) return { cups, valid: false, reason: `Les lletres de control no quadren (haurien de ser ${expected})` }
  return { cups, valid: true, reason: null }
}

/** «ES0336 0000 0025 7360 HB 0F» to read it: groups of 4 after ES. */
export function formatCups (value) {
  const cups = normalizeCups(value)
  const m = /^ES(\d{4})(\d{4})(\d{4})(\d{4})(.*)$/.exec(cups)
  return m ? `ES ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}`.trim() : cups
}

/** 0.0523 → «0,052300» (the 6 decimals of the distributor's files). */
export function formatCoefficient (value) {
  if (value === null || value === undefined || value === '') return '—'
  return Number(value).toLocaleString('ca-ES', { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}

/** 0.0523 → «5,23 %» */
export function formatShare (value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${(Number(value) * 100).toLocaleString('ca-ES', { maximumFractionDigits: 4 })} %`
}

export function formatKw (value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${Number(value).toLocaleString('ca-ES', { maximumFractionDigits: 3 })} kW`
}

/** A coefficient typed with a comma or a dot, or NaN; '' is null. */
export function parseCoefficient (value) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const n = Number(String(value).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** The error of a typed coefficient, or null. */
export function coefficientError (value) {
  const n = parseCoefficient(value)
  if (n === null) return 'Falta el coeficient'
  if (Number.isNaN(n)) return 'Ha de ser un número'
  if (n < 0 || n > 1) return 'Ha de ser entre 0 i 1'
  return null
}

/** The sum of a distribution being edited ([{ coefficient }]), 6 decimals. */
export function distributionSum (rows) {
  const sum = (rows || []).reduce((s, r) => {
    const n = parseCoefficient(r.coefficient)
    return s + (Number.isFinite(n) ? n : 0)
  }, 0)
  return Math.round(sum * 1e6) / 1e6
}

/** kW of a coefficient of an installation of `power` kW. */
export function kwOf (coefficient, power) {
  const c = parseCoefficient(coefficient)
  if (!Number.isFinite(c) || power === null || power === undefined || power === '') return null
  return Math.round(c * Number(power) * 1000) / 1000
}

/** Whether a member is still a member on `date` (no leave date, or a later one). */
export const isActivePartner = (partner, date) => !partner.leave_date || partner.leave_date >= date

/**
 * The lines of the coefficients file for the distributor: «CUPS;coefficient»
 * with 6 decimals and a comma, one line per CUPS, the RD 244/2019 shape
 * (constant coefficients). Check with the distributor before sending it.
 */
export function coefficientsFile (rows) {
  return (rows || [])
    .filter(r => Number(r.coefficient) > 0)
    .map(r => `${normalizeCups(r.cups)};${Number(r.coefficient).toFixed(6).replace('.', ',')}`)
    .join('\r\n')
}

/** Members matching a search: name, NIF, email, phone or any of her CUPS. */
export function filterPartners (partners, text) {
  const plain = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q = plain(text).trim()
  if (!q) return partners
  const qCups = normalizeCups(text)
  return partners.filter(p =>
    [p.name, p.nif, p.email, p.phone].some(v => plain(v).includes(q)) ||
    (p.supplies || []).some(s => qCups && normalizeCups(s.cups).includes(qCups))
  )
}
