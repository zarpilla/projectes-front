// A text cell that starts like a formula opens as one in Excel/LibreOffice:
// a member could name her delivery point `=HYPERLINK(...)` and the office's
// route planner CSV would run it (issues/405). Such a value gets a leading `'`,
// which spreadsheets read as "this is text". Only for text columns: phones
// (+34…), numbers and dates keep their exact value.
const FORMULA_START = /^[=+\-@\t\r]/

export function textCell(value) {
  if (value === null || value === undefined) return value
  const text = String(value)
  return FORMULA_START.test(text) ? `'${text}` : text
}
