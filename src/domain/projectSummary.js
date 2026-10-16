// Figures of the project summary ("Resum financer projecte"), for the original,
// estimated ("previst") and executed budget. Same rules the summary card computed
// in ProjectForm's template; `totals` is the project (or one year of allByYear).
//
// - expenses total = invoices ("factures") + non-deductible VAT ("prorrata") + hours
// - cost/hour = hours cost / hours
// - price/hour = (incomes - invoices) / hours
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

function figures (totals, fields) {
  const value = field => (totals && totals[field]) || 0
  const hours = value(fields.hours)
  return {
    result: value(fields.result),
    incomes: value(fields.incomes),
    invoices: value(fields.invoices),
    prorata: value(fields.prorata),
    hoursCost: value(fields.hoursCost),
    expenses: value(fields.invoices) + value(fields.hoursCost) + value(fields.prorata),
    hours,
    costPerHour: hours ? value(fields.hoursCost) / hours : 0,
    pricePerHour: hours ? (value(fields.incomes) - value(fields.invoices)) / hours : 0
  }
}

// { original: {...}, estimated: {...}, real: {...} }, each with result, incomes,
// invoices, prorata, hoursCost, expenses, hours, costPerHour, pricePerHour
export function projectSummary (totals) {
  return {
    original: figures(totals, KINDS.original),
    estimated: figures(totals, KINDS.estimated),
    real: figures(totals, KINDS.real)
  }
}
