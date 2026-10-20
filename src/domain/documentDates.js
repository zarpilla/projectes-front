import moment from 'moment'

// The document's date fields edited with a Buefy datepicker, which needs Date
// objects: the API gives «YYYY-MM-DD» strings. accepted_date was left out, and
// an accepted quote opened as a blank page (issues/189, as 124 on contacts).
// Saving sends them back as «YYYY-MM-DD» (documentDatesForApi): a Date goes out
// as UTC, which the API reads in Europe/Madrid, so east of Madrid every save
// moved the dates back one day (issues/229).
export const DOCUMENT_PICKER_DATES = [
  'emitted',
  'paybefore',
  'estimated_payment',
  'sent_date',
  'paid_date',
  'accepted_date',
  'net_date',
  'irpf_date',
  'ss_date',
  'other_date'
]

/** The same form with its datepicker fields as local dates; empty ones untouched. */
export function documentDatesForPickers (form) {
  for (const field of DOCUMENT_PICKER_DATES) {
    if (form[field] && !(form[field] instanceof Date)) {
      form[field] = moment(form[field], 'YYYY-MM-DD').toDate()
    }
  }
  return form
}

const localDay = value => (value instanceof Date ? moment(value).format('YYYY-MM-DD') : value)

/**
 * A copy of the form with its datepicker dates (and the lines' dates) as the
 * local day «YYYY-MM-DD», whatever the browser's timezone (issues/229).
 * `form` is not modified; lines without a Date are kept as they are.
 */
export function documentDatesForApi (form) {
  if (!form || typeof form !== 'object') return form
  const out = { ...form }
  for (const field of DOCUMENT_PICKER_DATES) {
    if (field in out) out[field] = localDay(out[field])
  }
  if (Array.isArray(form.lines) && form.lines.some(l => l && l.date instanceof Date)) {
    out.lines = form.lines.map(l => (l && l.date instanceof Date ? { ...l, date: localDay(l.date) } : l))
  }
  return out
}

const day = value => (value ? moment(value instanceof Date ? value : moment(value, 'YYYY-MM-DD').toDate()).format('YYYY-MM-DD') : null)

/**
 * Estimated payment taken from a budget line's date, never before the
 * document's emission: a received income emitted on 19/10/2026 got the line's
 * 31/07/2026 and showed up at once as an unpaid July movement (issues/256).
 */
export function estimatedPaymentFrom (lineDate, emitted) {
  if (!lineDate) return lineDate
  if (emitted && day(lineDate) < day(emitted)) return emitted
  return lineDate
}

/**
 * «Cobrada/Pagada» and its date kept together (issues/256): ticking the box
 * without a date fills in today, unticking it clears the date, and choosing a
 * date ticks the box. Tick-only saved paid without a date (Tresoreria showed
 * «Factura cobrada» on its forecast date) and date-only saved it as unpaid.
 */
export function setPaid (form, paid, today = new Date()) {
  form.paid = !!paid
  if (form.paid && !form.paid_date) form.paid_date = today
  if (!form.paid) form.paid_date = null
  return form
}

export function setPaidDate (form, date) {
  form.paid_date = date || null
  if (form.paid_date) form.paid = true
  return form
}

/**
 * A quote's «Acceptat» and its date, kept together like «Cobrada/Pagada»
 * (issues/280): the box alone saved accepted without a date.
 */
export function setAccepted (form, accepted, today = new Date()) {
  form.accepted = !!accepted
  if (form.accepted && !form.accepted_date) form.accepted_date = today
  if (!form.accepted) form.accepted_date = null
  return form
}

export function setAcceptedDate (form, date) {
  form.accepted_date = date || null
  if (form.accepted_date) form.accepted = true
  return form
}
