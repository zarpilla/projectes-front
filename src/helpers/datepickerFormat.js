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
