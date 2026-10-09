// A project's periodification (ProjectForm): the undated-year bucket and the
// lines that feed it (issues/015).

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
          total_amount: (line.quantity || 0) * (line.amount || 0)
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
