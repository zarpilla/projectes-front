import moment from 'moment'

// The contact's date fields edited with a Buefy datepicker, which needs Date
// objects: the API gives «YYYY-MM-DD» strings (issues/124).
export const CONTACT_PICKER_DATES = ['followup_date', 'partner_amount_date']

/** The same form with its datepicker fields as local dates; empty ones untouched. */
export function contactDatesForPickers (form) {
  for (const field of CONTACT_PICKER_DATES) {
    if (form[field] && !(form[field] instanceof Date)) {
      form[field] = moment(form[field], 'YYYY-MM-DD').toDate()
    }
  }
  return form
}
