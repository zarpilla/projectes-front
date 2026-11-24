import moment from 'moment'

// Partial collections and payments of a document (issues/412): emitted
// invoices, other incomes, received invoices and other expenses can be
// collected or paid in several goes, `partial_payments` = [{ id, date, amount }].
// With at least one, the server sets «Cobrada/Pagada» and its date from them:
// paid once they add up to the total, on the date of the last one. They can't
// add up to more than the total.

// Bestretes too (issues/460): there they add up to the net, what the person gets
export const PARTIAL_PAYMENT_TYPES = ['emitted-invoices', 'received-incomes', 'received-invoices', 'received-expenses', 'payrolls']

/** What the partial payments of a document of this type add up to. */
export const partialPaymentsTotal = (type, form) => Number(form && (type === 'payrolls' ? form.net_base : form.total)) || 0

const cents = v => Math.round((Number(v) || 0) * 100)

export function partialPayments (doc) {
  const list = doc && doc.partial_payments
  return Array.isArray(list) ? list : []
}

export const hasPartialPayments = doc => partialPayments(doc).length > 0

/** What the partial payments add up to. */
export const paidAmount = doc => partialPayments(doc).reduce((acc, p) => acc + cents(p.amount), 0) / 100

/** What is still to collect or to pay: the total less the partial payments. */
export const pendingAmount = doc => (cents(doc && doc.total) - cents(paidAmount(doc))) / 100

/** A bestreta with some of its net paid, not all (issues/460): «Pagada en part». */
export const isPaidInPart = doc => hasPartialPayments(doc) && !(doc && doc.paid)

/** Some collected or paid, not all of it. */
export const isPartiallyPaid = doc => hasPartialPayments(doc) && !doc.paid_date && pendingAmount(doc) !== 0

/** Over the total (in absolute value, as for a credit note). */
export const exceedsTotal = doc => Math.abs(cents(paidAmount(doc))) > Math.abs(cents(doc && doc.total))

const localDay = value => (value instanceof Date ? moment(value).format('YYYY-MM-DD') : value)

/** The list as the API takes it: dates as the local day, amounts as numbers. */
export function partialPaymentsForApi (list) {
  if (!Array.isArray(list) || list.length === 0) return null
  return list.map(p => ({ ...(p.id ? { id: p.id } : {}), date: localDay(p.date) || null, amount: Number(p.amount) }))
}

/** The list for the form's datepickers (Date objects). */
export function partialPaymentsForPickers (list) {
  if (!Array.isArray(list)) return []
  return list.map(p => ({ ...p, date: p.date && !(p.date instanceof Date) ? moment(p.date, 'YYYY-MM-DD').toDate() : p.date }))
}

/** A new entry: today, for what is still pending. */
export function newPartialPayment (form, today = new Date()) {
  const pending = pendingAmount(form)
  return { date: today, amount: pending > 0 || pending < 0 ? pending : null }
}

/**
 * «Cobrada/Pagada» and its date as the server will set them, so the form shows
 * them before saving: paid when the payments reach the total, on the last date.
 */
export function applyPartialPaymentsToForm (form) {
  const list = partialPayments(form).filter(p => p.date && Number(p.amount))
  if (!list.length) return form
  const paid = !exceedsTotal(form) && cents(pendingAmount(form)) === 0
  form.paid = paid
  form.paid_date = paid ? list.map(p => p.date).sort((a, b) => moment(a).diff(moment(b))).pop() : null
  return form
}
