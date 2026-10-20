import moment from 'moment'

// Every Buefy datepicker shows dd/mm/aaaa (issues/127): the default formatter
// used the browser's Intl format, «5/2/2026», next to «08/01/2026» elsewhere.
// Month pickers, ranges and multiple dates keep Buefy's behaviour.
export function datepickerFormatter (date, vm) {
  const dates = (Array.isArray(date) ? date : [date]).map(d =>
    vm && vm.isTypeMonth
      ? vm.dtfMonth.format(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12))
      : moment(d).format('DD/MM/YYYY'))
  return vm && vm.multiple ? dates.join(', ') : dates.join(' - ')
}

// What can be typed in a datepicker: 6/11/2026, 06-11-26… day first, strictly
// (issues/297): an impossible date (31/02/2026) is not rolled over to 03/03/2026.
const TYPED_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM/YY', 'D/M/YY', 'DD-MM-YYYY', 'D-M-YYYY', 'DD-MM-YY', 'D-M-YY', 'DD.MM.YYYY', 'D.M.YYYY']

// The date typed, null when it is empty, undefined when it is no date.
export function parseTypedDate (text) {
  const value = (text || '').trim()
  if (!value) return null
  const m = moment(value, TYPED_FORMATS, true)
  return m.isValid() ? m.toDate() : undefined
}

// Buefy's date-parser (text, vm): clearing the field still gives null, an
// impossible date leaves the field as it was (issues/297).
export function strictDateParser (text, vm) {
  const date = parseTypedDate(text)
  if (date !== undefined) return date
  const previous = vm ? vm.computedValue || null : null
  // the input keeps what was typed unless it is told again (after the change
  // event, which also writes the typed text into it)
  if (vm && typeof vm.$nextTick === 'function') {
    vm.$nextTick(() => {
      if (vm.$refs && vm.$refs.input) vm.$refs.input.newValue = previous ? vm.formatValue(previous) : null
    })
  }
  return previous
}
