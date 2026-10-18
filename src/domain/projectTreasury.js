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

/** Pending and paid totals of a projectTreasury() list. */
export function treasurySums (treasury) {
  const sum = filter => sumBy(treasury.filter(filter), 'document.total_amount')
  return {
    incomesPending: sum(t => t.multiplier > 0 && t.document.paid !== true),
    expensesPending: sum(t => t.multiplier < 0 && t.document.paid !== true),
    incomesDone: sum(t => t.multiplier > 0 && t.document.paid),
    expensesDone: sum(t => t.multiplier < 0 && t.document.paid)
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
