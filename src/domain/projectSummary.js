// Figures of the project summary ("Resum financer projecte"), for the original,
// estimated ("previst") and executed budget. Same rules the summary card computed
// in ProjectForm's template; `totals` is the project (or one year of allByYear).
//
// - expenses total = invoices ("factures") + non-deductible VAT ("prorrata") + hours
// - cost/hour = hours cost / hours
// - price/hour = (incomes - invoices) / hours
// - indirect = expenses total × the project's indirect expenses % (issues/420),
//   in cents; only shown: it changes neither the result nor any report
// Values missing in `totals` count as 0; per-hour figures are 0 without hours.

const KINDS = {
  original: {
    result: 'original_incomes_expenses',
    incomes: 'total_original_incomes',
    invoices: 'total_original_expenses',
    prorata: 'total_original_expenses_vat',
    hoursCost: 'total_original_hours_price',
    hours: 'total_original_hours'
  },
  estimated: {
    result: 'estimated_incomes_expenses',
    incomes: 'total_estimated_incomes',
    invoices: 'total_estimated_expenses',
    prorata: 'total_estimated_expenses_vat',
    hoursCost: 'total_estimated_hours_price',
    hours: 'total_estimated_hours'
  },
  real: {
    result: 'total_real_incomes_expenses',
    incomes: 'total_real_incomes',
    invoices: 'total_real_expenses',
    prorata: 'total_real_expenses_vat',
    hoursCost: 'total_real_hours_price',
    hours: 'total_real_hours'
  }
}

// a % typed in the form: "12,5" or 12.5; anything else (empty, negative) is 0
export function indirectPercent (value) {
  const pct = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(pct) && pct > 0 ? pct : 0
}

function figures (totals, fields, indirectPct) {
  const value = field => (totals && totals[field]) || 0
  const hours = value(fields.hours)
  const expenses = value(fields.invoices) + value(fields.hoursCost) + value(fields.prorata)
  const indirect = Math.round(expenses * indirectPct) / 100
  return {
    result: value(fields.result),
    incomes: value(fields.incomes),
    invoices: value(fields.invoices),
    prorata: value(fields.prorata),
    hoursCost: value(fields.hoursCost),
    expenses,
    indirect,
    expensesWithIndirect: expenses + indirect,
    hours,
    costPerHour: hours ? value(fields.hoursCost) / hours : 0,
    pricePerHour: hours ? (value(fields.incomes) - value(fields.invoices)) / hours : 0
  }
}

// { original: {...}, estimated: {...}, real: {...} }, each with result, incomes,
// invoices, prorata, hoursCost, expenses, indirect, expensesWithIndirect, hours,
// costPerHour, pricePerHour. `indirectPct`: the project's indirect expenses %
// (0 or nothing when the organization doesn't use them)
export function projectSummary (totals, indirectPct = 0) {
  const pct = indirectPercent(indirectPct)
  return {
    original: figures(totals, KINDS.original, pct),
    estimated: figures(totals, KINDS.estimated, pct),
    real: figures(totals, KINDS.real, pct)
  }
}
