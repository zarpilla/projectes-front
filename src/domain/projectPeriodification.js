// A project's periodification (ProjectForm): the undated-year bucket and the
// lines that feed it (issues/015).

import { budgetLineTotal } from './budgetLines'

// Lines with no date are counted under this year by the backend.
export const UNDATED_YEAR = '9999'

/** True for the undated bucket and for junk years saved before the fix ("Invalid date"…). */
export function isUndatedYear (year) {
  const y = String(year ?? '').trim()
  return y === UNDATED_YEAR || !/^\d{4}$/.test(y)
}

export function periodificationYearLabel (year) {
  return isUndatedYear(year) ? 'Sense data' : String(year)
}

/**
 * Income/expense lines of the current plan with neither an estimated nor a
 * document date: { type, phase, concept, total_amount }. Read from the form so
 * the warning follows the user's edits; falls back to the backend's list.
 */
export function undatedProjectLines (form) {
  if (!form) return []
  if (!form.project_phases) return form.undatedLines || []
  const out = []
  form.project_phases.forEach(ph => {
    [['income', ph.incomes], ['expense', ph.expenses]].forEach(([type, lines]) => {
      (lines || []).forEach(line => {
        if (line.date_estimate_document || line.date) return
        out.push({
          id: line.id,
          type,
          phase: ph.name || '',
          concept: line.concept || '',
          total_amount: budgetLineTotal(line)
        })
      })
    })
  })
  return out
}

const isEmptyRow = p =>
  ['incomes', 'expenses', 'real_incomes', 'real_expenses'].every(f => !parseFloat(p[f] || 0))

/**
 * Once no line is undated, an empty undated row is dropped. One with amounts
 * stays, since a user typed them. Dropping an empty last (balancing) row keeps
 * the balance: it was 0, so the other rows already sum to 0.
 */
export function dropEmptyUndatedRows (periodification, hasUndatedLines) {
  if (hasUndatedLines) return periodification
  return periodification.filter(p => !(isUndatedYear(p.year) && isEmptyRow(p)))
}

const PERIOD_FIELDS = ['incomes', 'expenses', 'real_incomes', 'real_expenses']
const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100

/**
 * Rows in a fixed order whose last row is the one that balances the others
 * (issues/066): dated years ascending, the latest dated year last, and the
 * undated bucket just before it. Rows were kept in arrival order, so a year
 * added later or «Sense data» could become the balancing row.
 */
export function orderPeriodification (rows) {
  const dated = (rows || []).filter(p => !isUndatedYear(p.year))
    .sort((a, b) => String(a.year).localeCompare(String(b.year)))
  const undated = (rows || []).filter(p => isUndatedYear(p.year))
  if (!dated.length) return undated
  return [...dated.slice(0, -1), ...undated, dated[dated.length - 1]]
}

/** Sets the last row to minus the sum of the others, in cents (it showed 1163.6000000000022). */
export function balancePeriodification (rows) {
  if (!rows || !rows.length) return rows
  const last = rows[rows.length - 1]
  const others = rows.slice(0, -1)
  PERIOD_FIELDS.forEach(f => {
    last[f] = round2(-1 * others.reduce((acc, p) => acc + (parseFloat(p[f]) || 0), 0)) || 0
  })
  return rows
}
