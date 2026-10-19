// Budget lines (a project's phase incomes / expenses): quantity and unit price
// keep 4 decimals, the line total is quantity × price rounded to cents — the
// API's formula (projectes-v5 services/budget-line.js). A typed 0,0357 was
// stored as 0,04 and every screen added it up its own way (issues/194).

export const BUDGET_LINE_DECIMALS = 4

const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100

export const budgetLineTotal = line =>
  round2((Number(line && line.quantity) || 0) * (Number(line && line.amount) || 0))

// What the API stores for a typed quantity or price: decimal comma accepted,
// at most 4 decimals (rounded). Text that isn't a number is left as typed.
export const budgetLineValue = value => {
  if (value === null || value === undefined) return value
  const text = String(value).trim().replace(',', '.')
  if (!/^-?\d*\.?\d*$/.test(text) || !/\d/.test(text)) return value
  const [, decimals = ''] = text.split('.')
  if (decimals.length <= BUDGET_LINE_DECIMALS) return text === String(value) ? value : text
  const factor = 10 ** BUDGET_LINE_DECIMALS
  return String(Math.round((Number(text) + Math.sign(Number(text)) * Number.EPSILON) * factor) / factor)
}
