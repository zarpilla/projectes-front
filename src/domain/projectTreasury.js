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
    // a negative annotation is a payment (issues/196); a «saldo real» one sets
    // an account balance, it isn't a movement of the project
    form.treasury_annotations.filter(t => !t.is_real_balance).forEach(t => {
      const total = Number(t.total) || 0
      documents.push({
        docType: 'treasury',
        document: { ...t, total_amount: Math.abs(total) },
        concept: t.concept,
        multiplier: total < 0 ? -1 : 1
      })
    })
  }
  return documents
}

const pad = n => String(n).padStart(2, '0')
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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
 * is what Tresoreria goes by. A line not ticked «Fact.» or without a document is
 * still expected. A treasury annotation is done once its date has come
 * (issues/196), as a movement in Tresoreria; an undated one is expected.
 * `today` is YYYY-MM-DD.
 */
export function treasuryEntrySettled (t, today = localToday()) {
  if (t.docType === 'treasury') return !!t.document.date && String(t.document.date).slice(0, 10) <= today
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
export function treasurySums (treasury, today = localToday()) {
  const sum = filter => sumBy(treasury.filter(filter), 'document.total_amount')
  const income = t => t.multiplier > 0
  const expense = t => t.multiplier < 0
  return {
    incomesPending: sum(t => income(t) && t.document.paid !== true),
    expensesPending: sum(t => expense(t) && t.document.paid !== true),
    incomesDone: sum(t => income(t) && t.document.paid),
    expensesDone: sum(t => expense(t) && t.document.paid),
    collected: sum(t => income(t) && treasuryEntrySettled(t, today)),
    toCollect: sum(t => income(t) && !treasuryEntrySettled(t, today)),
    paid: sum(t => expense(t) && treasuryEntrySettled(t, today)),
    toPay: sum(t => expense(t) && !treasuryEntrySettled(t, today))
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

// Tresoreria «Filtra per projecte» (issues/284): the view started from the
// company's balance («Inici Any» / «Avui» seeds), so «Saldo a 31/12» mixed the
// company's start with the project's flows. With a project chosen the view
// shows only that project: its movements, the «Inici Any» / «Avui» markers and
// a running saldo that starts at 0; the bank balances noted for the accounts
// (company figures) are left out.
const isMarker = r => r.type === 'Inici Any' || r.type === 'Avui'
const isAccountBalance = r => r.is_balance_annotation || r.is_real_balance_adjustment

/** The rows of one project (and the markers), from all treasury rows. */
export function projectTreasuryRows (rows, projectId) {
  return (rows || []).filter(r => !isAccountBalance(r) && (isMarker(r) || r.project_id === projectId))
}

/** The same rows (sorted by date) with `subtotal` = the project's running saldo from 0. */
export function withProjectSaldo (rows) {
  let saldo = 0
  return (rows || []).map(r => {
    if (!isMarker(r)) saldo = Math.round((saldo + (Number(r.total_amount) || 0)) * 100) / 100
    return { ...r, subtotal: saldo, account_subtotal: saldo }
  })
}

/** The project's saldo at the start of `today` (YYYYMMDD), from 0 on 1 January of `year`. */
export function projectSaldoToday (rows, year, today) {
  const from = `${year}0101`
  const sum = (rows || [])
    .filter(r => !isMarker(r) && !isAccountBalance(r) && String(r.datef || '') >= from && String(r.datef || '') < today)
    .reduce((t, r) => t + (Number(r.total_amount) || 0), 0)
  return Math.round(sum * 100) / 100
}
