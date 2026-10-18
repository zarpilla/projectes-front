import { datepickerFormatter } from '@/helpers/datepickerFormat'

// Global Buefy options. The dialogs said «Cancel» / «OK» wherever a
// confirm didn't pass its own labels (issues/131).
export const buefyConfig = {
  defaultDateFormatter: datepickerFormatter,
  defaultDialogConfirmText: "D'acord",
  defaultDialogCancelText: 'Cancel·la'
}
