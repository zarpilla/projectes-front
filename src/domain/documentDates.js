import moment from 'moment'

// The document's date fields edited with a Buefy datepicker, which needs Date
// objects: the API gives «YYYY-MM-DD» strings. accepted_date was left out, and
// an accepted quote opened as a blank page (issues/189, as 124 on contacts).
// Saving sends the Dates as they are: the API stores the local day.
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
