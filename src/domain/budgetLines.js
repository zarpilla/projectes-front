// Budget lines (a project's phase incomes / expenses): quantity and unit price
// keep 4 decimals, the line total is quantity × price rounded to cents — the
// API's formula (projectes-v5 services/budget-line.js). A typed 0,0357 was
// stored as 0,04 and every screen added it up its own way (issues/194).

import { formatNumber } from '@/helpers/format-number'

export const BUDGET_LINE_DECIMALS = 4

const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100

export const budgetLineTotal = line =>
  round2((Number(line && line.quantity) || 0) * (Number(line && line.amount) || 0))

// What the API stores for a typed quantity or price. With a comma, it is the
// decimal mark and "." groups thousands (1.000,5 → 1000.5); without one, a
// single "." is the decimal point as before (1.234 → 1.234, 7.25), and several
// can only be thousands (1.000.000 → 1000000). At most 4 decimals (rounded). Text that isn't a number is left as
// typed, for the API to refuse (issues/194, issues/224).
const toDotDecimal = text => {
  text = text.replace(/\u2212/g, '-')
  if (text.includes(',')) {
    const [integer, ...rest] = text.split(',')
    if (rest.length > 1 || !/^-?(\d{0,3}(\.\d{3})*|\d*)$/.test(integer)) return null
    return integer.replace(/\./g, '') + '.' + rest[0]
  }
  return /^-?\d{1,3}(\.\d{3}){2,}$/.test(text) ? text.replace(/\./g, '') : text
}

export const budgetLineValue = value => {
  if (value === null || value === undefined) return value
  const text = toDotDecimal(String(value).trim())
  if (text === null || !/^-?\d*\.?\d*$/.test(text) || !/\d/.test(text)) return value
  const [, decimals = ''] = text.split('.')
  if (decimals.length <= BUDGET_LINE_DECIMALS) return text === String(value) ? value : text
  const factor = 10 ** BUDGET_LINE_DECIMALS
  return String(Math.round((Number(text) + Math.sign(Number(text)) * Number.EPSILON) * factor) / factor)
}

// A stored quantity or price as the input shows it: Catalan decimals and
// thousands (7.25 → 7,25); text that isn't a number, as typed.
// While typing, without thousands dots: a shown 1.000 would read back as 1.
export const budgetLineDisplay = (value, { grouped = true } = {}) => {
  if (value === null || value === undefined || String(value).trim() === '') return value
  if (!Number.isFinite(Number(value))) return value
  const text = formatNumber(value, BUDGET_LINE_DECIMALS)
  return grouped ? text : text.replace(/\./g, '')
}
