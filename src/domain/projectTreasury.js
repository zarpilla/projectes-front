import sumBy from 'lodash/sumBy'

// A project's treasury (ProjectForm): its budget lines and treasury
// annotations with their sign, which of them are paid, and the sums.

/** Every income/expense line and annotation: { docType, document, multiplier[, concept] }. */
export function projectTreasury (form) {
  const documents = []
  const projectPhases = form.project_phases || []
  projectPhases.forEach(ph => {
    const incomes = ph.incomes || []
    incomes.forEach(income => {
      documents.push({ docType: 'income', document: income, multiplier: 1 })
    })
    const expenses = ph.expenses || []
    expenses.forEach(expense => {
      documents.push({ docType: 'expense', document: expense, multiplier: -1 })
    })
  })
  if (form.treasury_annotations) {
    form.treasury_annotations.forEach(t => {
      documents.push({
        docType: 'treasury',
        document: { ...t, total_amount: t.total },
        concept: t.concept,
        multiplier: 1
      })
    })
  }
  return documents
}

// the first relation a paid line has decides which document it settled
const PAID_INCOME = [['invoice', 'emitted_invoices'], ['grant', 'received_grants'], ['income', 'received_income']]
const PAID_EXPENSE = [['invoice', 'received_invoices'], ['ticket', 'tickets'], ['diet', 'diets'], ['expense', 'received_expense']]

/** The documents settled by paid budget lines: { docType, id, multiplier }. */
export function projectTreasuryDone (form) {
  const documents = []
  const projectPhases = form.project_phases || []
  projectPhases.forEach(ph => {
    ph.incomes.forEach(income => addPaid(documents, income, PAID_INCOME, 1))
    ph.expenses.forEach(expense => addPaid(documents, expense, PAID_EXPENSE, -1))
  })
  return documents
}

function addPaid (documents, line, relations, multiplier) {
  if (!line.paid) return
  const found = relations.find(([relation]) => line[relation])
  if (found) {
    documents.push({ docType: found[1], id: line[found[0]].id, multiplier })
  }
}

/**
 * Whether a projectTreasury() entry has been collected or paid: its line's
 * document (the first relation it has, as in projectTreasuryDone) is paid, which
 * is what Tresoreria goes by. A line not ticked «Fact.» or without a document,
 * and a treasury annotation, are still expected.
 */
export function treasuryEntrySettled (t) {
  if (t.docType === 'treasury') return false
  const relations = t.docType === 'income' ? PAID_INCOME : PAID_EXPENSE
  const found = relations.find(([relation]) => t.document[relation])
  return !!(found && t.document[found[0]].paid)
}

/**
 * Totals of a projectTreasury() list. `collected`/`toCollect` and
 * `paid`/`toPay` (positive amounts) follow the documents' payment, like
 * Tresoreria (issues/173); `*Pending`/`*Done` split by the lines' «Fact.»
 * tick, which the old Resum de tresoreria shows.
 */
export function treasurySums (treasury) {
  const sum = filter => sumBy(treasury.filter(filter), 'document.total_amount')
  const income = t => t.multiplier > 0
  const expense = t => t.multiplier < 0
  return {
    incomesPending: sum(t => income(t) && t.document.paid !== true),
    expensesPending: sum(t => expense(t) && t.document.paid !== true),
    incomesDone: sum(t => income(t) && t.document.paid),
    expensesDone: sum(t => expense(t) && t.document.paid),
    collected: sum(t => income(t) && treasuryEntrySettled(t)),
    toCollect: sum(t => income(t) && !treasuryEntrySettled(t)),
    paid: sum(t => expense(t) && treasuryEntrySettled(t)),
    toPay: sum(t => expense(t) && !treasuryEntrySettled(t))
  }
}

// Year / month / year-month of a treasury movement (Tresoreria pivot) from its
// YYYYMMDD date. An undated movement is grouped as «Sense data»; it showed up as
// the year «Invalid date» (issues/102).
export const treasuryPeriod = datef => {
  const s = String(datef || '')
  if (!/^\d{8}$/.test(s)) return { year: 'Sense data', month: '—', ym: '' }
  return { year: s.slice(0, 4), month: s.slice(4, 6), ym: s.slice(0, 6) }
}

// Date of a treasury movement as shown in the app (dd/mm/aaaa), from its YYYYMMDD
// date. The API's `datex` came with dashes («20-10-2026») and the year and date
// filters parsed it back with a broken moment format (issues/136).
export const treasuryDisplayDate = row => {
  const s = String((row && row.datef) || '')
  if (/^\d{8}$/.test(s)) return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`
  return String((row && row.datex) || '').replace(/-/g, '/')
}
